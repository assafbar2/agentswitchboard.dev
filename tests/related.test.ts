import { describe, it, expect } from 'vitest';
import { getRelatedAgents, agentKeywords, MAX_RELATED } from '@/lib/related';
import { getEveryAgent } from '@/lib/catalog';
import type { Agent, Category } from '@/lib/types';

function cat(slug: string): Category {
  return { id: slug, name: slug, slug, sortOrder: 0 };
}

function makeAgent(slug: string, overrides: Partial<Agent> = {}): Agent {
  return {
    id: slug,
    name: slug,
    slug,
    description: `${slug} test listing`,
    providerName: 'TestCo',
    providerUrl: 'https://test.co',
    agentUrl: `https://test.co/${slug}`,
    categories: [],
    tags: [],
    skills: [],
    authType: 'none',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: true,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: [],
    ...overrides,
  };
}

/**
 * Unrelated listings that give the catalog a realistic size, so keyword
 * rarity behaves as it does on the real site (~850 listings).
 */
function filler(count: number): Agent[] {
  return Array.from({ length: count }, (_, i) =>
    makeAgent(`filler-${i}`, {
      categories: [cat(`other-${i % 7}`)],
      tags: [`topic${i}`, `area${i % 50}`],
      accessMethods: ['api'],
    })
  );
}

const postgresPro = makeAgent('postgres-mcp-pro', {
  categories: [cat('data-analytics'), cat('infrastructure')],
  tags: ['postgres-access', 'index-tuning', 'explain-analysis', 'database-health', 'sql-execution'],
  skills: [{ id: 'sql-execution', name: 'SQL Execution', description: '' }],
  accessMethods: ['mcp'],
});

const neon = makeAgent('neon-mcp', {
  categories: [cat('data-analytics')],
  tags: ['postgres', 'serverless-database', 'branching'],
  skills: [{ id: 'sql-query', name: 'SQL Query', description: '' }],
  accessMethods: ['mcp'],
});

const deepsql = makeAgent('deepsql', {
  categories: [cat('data-analytics'), cat('infrastructure')],
  tags: ['database-tuning', 'index-advisor', 'postgres-mysql'],
  accessMethods: ['mcp', 'cli'],
});

const aiven = makeAgent('aiven-mcp', {
  // Primary category differs, but it lists data-analytics too.
  categories: [cat('infrastructure'), cat('data-analytics')],
  tags: ['postgresql', 'managed-databases', 'pgvector'],
  accessMethods: ['mcp'],
});

// The two listings the old algorithm showed for Postgres MCP Pro (tags as in
// content/): they share its categories and MCP access, but not its purpose.
const netdata = makeAgent('netdata', {
  categories: [cat('infrastructure'), cat('data-analytics')],
  tags: ['observability', 'monitoring', 'metrics', 'real-time', 'alerting', 'time-series', 'devops'],
  skills: [
    { id: 'metric-query', name: 'Metric Query', description: '' },
    { id: 'log-search', name: 'Log Search', description: '' },
  ],
  accessMethods: ['api', 'cli', 'mcp'],
});

const keenable = makeAgent('keenable', {
  categories: [cat('research'), cat('infrastructure'), cat('data-analytics')],
  // "web-index" shares one word with Postgres MCP Pro's "index-tuning".
  tags: ['web-index', 'agent-search', 'retrieval-api', 'large-scale-crawl', 'hosted-mcp'],
  skills: [{ id: 'web-search', name: 'Web Search', description: '' }],
  accessMethods: ['api', 'mcp'],
});

// Postgres-heavy, but only reachable over a REST API: not a drop-in swap.
const postgresRest = makeAgent('postgres-rest', {
  categories: [cat('data-analytics')],
  tags: ['postgres', 'database', 'sql-query'],
  accessMethods: ['api'],
});

// Postgres-heavy, but filed in a different category entirely.
const supabase = makeAgent('supabase-mcp', {
  categories: [cat('vector-databases')],
  tags: ['postgres', 'database-management', 'pgvector', 'sql-query'],
  accessMethods: ['mcp'],
});

const catalog = [
  postgresPro,
  neon,
  deepsql,
  aiven,
  netdata,
  keenable,
  postgresRest,
  supabase,
  ...filler(800),
];

const slugs = (agents: Agent[]) => agents.map((a) => a.slug);

describe('agentKeywords', () => {
  const keywordsOf = (...tags: string[]) => agentKeywords(makeAgent('kw', { tags }));
  const overlaps = (a: Set<string>, b: Set<string>) => [...a].some((w) => b.has(w));

  it('splits free-form tags and folds spelling variants together', () => {
    expect(overlaps(keywordsOf('postgres-access'), keywordsOf('PostgreSQL'))).toBe(true);
    expect(overlaps(keywordsOf('heroku-postgres'), keywordsOf('postgresql'))).toBe(true);
  });

  it('folds plurals', () => {
    expect(overlaps(keywordsOf('managed-databases'), keywordsOf('database'))).toBe(true);
    expect(overlaps(keywordsOf('saved-queries'), keywordsOf('sql-query'))).toBe(true);
  });

  it('ignores packaging words that access methods already cover', () => {
    const kw = agentKeywords(
      makeAgent('a', { tags: ['remote-mcp', 'official-mcp', 'mcp-server', 'open-source', 'self-hosted'] })
    );
    expect(kw.size).toBe(0);
  });

  it('keeps multi-word phrases as a keyword of their own', () => {
    const kw = agentKeywords(makeAgent('a', { tags: ['web-search'] }));
    expect(kw.has('web')).toBe(true);
    expect(kw.has('web search')).toBe(true);
  });
});

describe('getRelatedAgents', () => {
  it('returns genuine Postgres alternatives for Postgres MCP Pro', () => {
    const related = slugs(getRelatedAgents(postgresPro, catalog));
    expect(related).toEqual(expect.arrayContaining(['neon-mcp', 'deepsql', 'aiven-mcp']));
  });

  it('never returns the unrelated web index or monitoring tool', () => {
    const related = slugs(getRelatedAgents(postgresPro, catalog));
    expect(related).not.toContain('keenable');
    expect(related).not.toContain('netdata');
  });

  it('requires a shared access method', () => {
    expect(slugs(getRelatedAgents(postgresPro, catalog))).not.toContain('postgres-rest');
  });

  it("requires the current agent's primary category", () => {
    expect(slugs(getRelatedAgents(postgresPro, catalog))).not.toContain('supabase-mcp');
  });

  it('ranks by keyword overlap, strongest first', () => {
    // deepsql shares tuning, index, database and postgres; neon shares postgres and sql.
    const related = slugs(getRelatedAgents(postgresPro, catalog));
    expect(related.indexOf('deepsql')).toBeLessThan(related.indexOf('neon-mcp'));
  });

  it('never includes the agent itself', () => {
    expect(slugs(getRelatedAgents(postgresPro, catalog))).not.toContain('postgres-mcp-pro');
  });

  it(`returns at most ${MAX_RELATED}`, () => {
    const crowd = Array.from({ length: 10 }, (_, i) =>
      makeAgent(`pg-${i}`, {
        categories: [cat('data-analytics')],
        tags: ['postgres', 'index-tuning', 'database-health'],
        accessMethods: ['mcp'],
      })
    );
    const related = getRelatedAgents(postgresPro, [...catalog, ...crowd]);
    expect(related.length).toBe(MAX_RELATED);
  });

  it('returns nothing rather than padding with weak matches', () => {
    const loner = makeAgent('loner', {
      categories: [cat('data-analytics')],
      tags: ['quantum-weather', 'search'],
      accessMethods: ['mcp'],
    });
    expect(getRelatedAgents(loner, [...catalog, loner])).toEqual([]);
  });

  it('does not count a single shared word as an alternative', () => {
    const lone = makeAgent('lone', {
      categories: [cat('data-analytics')],
      tags: ['postgres', 'spreadsheet-sync'],
      accessMethods: ['mcp'],
    });
    const oneWord = makeAgent('one-word', {
      categories: [cat('data-analytics')],
      tags: ['postgres', 'billing'],
      accessMethods: ['mcp'],
    });
    expect(slugs(getRelatedAgents(lone, [...filler(800), lone, oneWord]))).toEqual([]);
  });

  it('returns nothing for an agent without access methods or categories', () => {
    expect(getRelatedAgents({ ...postgresPro, accessMethods: [] }, catalog)).toEqual([]);
    expect(getRelatedAgents({ ...postgresPro, categories: [] }, catalog)).toEqual([]);
  });
});

describe('getRelatedAgents on the real catalog', () => {
  it('only ever suggests same-category agents reachable the same way', async () => {
    const all = await getEveryAgent();
    for (const agent of all) {
      const primary = agent.categories[0]?.slug;
      const related = getRelatedAgents(agent, all);
      expect(related.length).toBeLessThanOrEqual(MAX_RELATED);
      for (const r of related) {
        expect(r.id).not.toBe(agent.id);
        expect(r.categories.some((c) => c.slug === primary)).toBe(true);
        expect(r.accessMethods.some((m) => agent.accessMethods.includes(m))).toBe(true);
      }
    }
  });

  it('suggests Postgres servers, not a web index or Netdata, for Postgres MCP Pro', async () => {
    const all = await getEveryAgent();
    const pg = all.find((a) => a.slug === 'postgres-mcp-pro');
    expect(pg).toBeDefined();
    const related = slugs(getRelatedAgents(pg!, all));
    expect(related).not.toContain('keenable');
    expect(related).not.toContain('netdata');
    const peers = ['neon-mcp', 'deepsql', 'aiven-mcp', 'ai-for-database'];
    expect(related.filter((s) => peers.includes(s)).length).toBeGreaterThanOrEqual(2);
  });
});
