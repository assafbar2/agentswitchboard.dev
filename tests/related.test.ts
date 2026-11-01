import { describe, it, expect } from 'vitest';
import {
  agentKeywords,
  alternativesPage,
  getAlternatives,
  getRelatedAgents,
  MAX_ALTERNATIVES,
  MAX_RELATED,
  MIN_ALTERNATIVES,
} from '@/lib/related';
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

  it('reads every spelling of real-time as one keyword', () => {
    expect([...keywordsOf('real-time')]).toEqual(['realtime']);
    expect([...keywordsOf('Real Time')]).toEqual(['realtime']);
    expect(overlaps(keywordsOf('realtime-voice'), keywordsOf('real-time-audio'))).toBe(true);
  });

  it('reads traits and platforms as one keyword, without packaging words', () => {
    expect([...keywordsOf('human-in-the-loop')]).toEqual(['hitl']);
    expect([...keywordsOf('human-in-loop')]).toEqual(['hitl']);
    expect([...keywordsOf('no-code-agents')]).toEqual(['nocode']);
    expect([...keywordsOf('google-cloud')]).toEqual(['gcp']);
    expect([...keywordsOf('claude-code-plugin')]).toEqual(['claudecode']);
    expect([...keywordsOf('vs-code-extension')]).toEqual(['vscode']);
    expect([...keywordsOf('end-to-end-encryption')]).toEqual(['e2ee']);
  });

  it('keeps multi-agent, though both its words are stopwords', () => {
    expect([...keywordsOf('multi-agent')]).toEqual(['multiagent']);
    expect(overlaps(keywordsOf('multi-agent-systems'), keywordsOf('multi-agent'))).toBe(true);
  });

  it('folds -es plurals, but not words whose singular ends in e', () => {
    expect([...keywordsOf('sandboxes', 'branches', 'harnesses')]).toEqual(['sandbox', 'branch', 'harness']);
    expect([...keywordsOf('caches')]).toEqual([...keywordsOf('cache')]);
  });

  it('ignores licence, funding and portability tags', () => {
    const kw = keywordsOf('mit-license', 'apache-2-0', 'yc-backed', 'yc-s26', 'y-combinator', 'framework-agnostic');
    expect([...kw]).toEqual(['framework']);
  });
});

describe('getAlternatives', () => {
  const pgPeers = Array.from({ length: 10 }, (_, i) =>
    makeAgent(`pg-${i}`, {
      categories: [cat('data-analytics')],
      tags: ['postgresql', 'index-tuning', 'database-health'],
      accessMethods: ['cli', 'mcp'],
    })
  );

  it('says what each alternative shares: access methods, and keywords as the listing writes them', () => {
    const [first] = getAlternatives(postgresPro, [...catalog, ...pgPeers]);
    expect(first.access).toEqual(['mcp']);
    // "postgres" from postgres-access, not the stem "postgre"; "index tuning" stands in for "index" and "tuning".
    expect(first.keywords).toEqual(expect.arrayContaining(['index tuning', 'postgres']));
    expect(first.keywords).not.toContain('tuning');
    expect(first.keywords.length).toBeLessThanOrEqual(3);
  });

  it('writes a phrase in full and names one form of a word', () => {
    const asr = (slug: string, tags: string[]) =>
      makeAgent(slug, { categories: [cat('voice')], tags, accessMethods: ['api'] });
    const current = asr('current', ['speech-to-text', 'alerts', 'alerting']);
    const peer = asr('peer', ['speech-to-text', 'alert', 'alerting']);
    const [alt] = getAlternatives(current, [current, peer, ...filler(800)]);
    expect(alt.keywords).toContain('speech to text');
    expect(alt.keywords.filter((k) => k.startsWith('alert'))).toHaveLength(1);
  });

  describe('counts one thing in common once', () => {
    const ops = (slug: string, tags: string[]) => makeAgent(slug, { categories: [cat('ops')], tags, accessMethods: ['api'] });
    const monitor = ops('monitor', ['time-series', 'alerting']);
    const alternativesTo = (current: Agent, ...others: Agent[]) =>
      getAlternatives(current, [current, ...others, ...filler(800)]);

    it('a term inside a longer phrase: "time series" and "time series forecasting"', () => {
      expect(alternativesTo(monitor, ops('forecaster', ['time-series-forecasting']))).toEqual([]);
    });

    it('but a phrase both write the same way counts in full', () => {
      expect(slugs(alternativesTo(monitor, ops('tsdb', ['time-series'])).map((a) => a.agent))).toEqual(['tsdb']);
    });

    it('and names the term as one', () => {
      const [alt] = alternativesTo(monitor, ops('forecaster', ['time-series-forecasting', 'alerting']));
      expect(alt.keywords).toEqual(expect.arrayContaining(['time series', 'alerting']));
      expect(alt.keywords).not.toContain('time');
    });

    it('two forms of one word: "deploy" and "deployment"', () => {
      expect(alternativesTo(ops('host', ['deploy', 'deployment']), ops('platform', ['deployment', 'deploy']))).toEqual([]);
      const [alt] = alternativesTo(
        ops('host', ['deploy', 'deployment', 'rollback']),
        ops('platform', ['deployment', 'deploy', 'rollback'])
      );
      expect(alt.keywords.filter((k) => k.startsWith('deploy'))).toHaveLength(1);
    });

    it('a shared platform: two listings on Google Cloud', () => {
      expect(alternativesTo(ops('a', ['google-cloud', 'billing']), ops('b', ['google-cloud', 'storage']))).toEqual([]);
    });
  });

  it(`lists at most ${MAX_ALTERNATIVES}, best first, and the related agents are its first ${MAX_RELATED}`, () => {
    const all = [...catalog, ...pgPeers];
    const alternatives = getAlternatives(postgresPro, all);
    expect(alternatives.length).toBe(MAX_ALTERNATIVES);
    expect(getRelatedAgents(postgresPro, all)).toEqual(alternatives.slice(0, MAX_RELATED).map((a) => a.agent));
  });
});

describe('alternativesPage', () => {
  it(`needs at least ${MIN_ALTERNATIVES} alternatives, so no page is thin`, () => {
    expect(getAlternatives(postgresPro, catalog).length).toBe(MIN_ALTERNATIVES);
    expect(alternativesPage(postgresPro, catalog)).toHaveLength(MIN_ALTERNATIVES);
    expect(alternativesPage(postgresPro, catalog.filter((a) => a.slug !== 'neon-mcp'))).toBeNull();
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

  it('gives every alternatives page enough alternatives, each with a stated reason', async () => {
    const all = await getEveryAgent();
    let pages = 0;
    for (const agent of all) {
      const alternatives = alternativesPage(agent, all);
      if (!alternatives) continue;
      pages++;
      expect(alternatives.length).toBeGreaterThanOrEqual(MIN_ALTERNATIVES);
      expect(alternatives.length).toBeLessThanOrEqual(MAX_ALTERNATIVES);
      for (const { agent: alt, access, keywords } of alternatives) {
        expect(access.length).toBeGreaterThan(0);
        expect(access.every((m) => agent.accessMethods.includes(m) && alt.accessMethods.includes(m))).toBe(true);
        expect(keywords.length).toBeGreaterThan(0);
      }
    }
    // Most listings get a page; a sharp drop means the matching broke.
    expect(pages / all.length).toBeGreaterThan(0.7);
  });

  it('pairs real-time voice frameworks, not an email API with a monitoring tool', async () => {
    const all = await getEveryAgent();
    const alternativesTo = (slug: string) => slugs(getAlternatives(all.find((a) => a.slug === slug)!, all).map((a) => a.agent));
    expect(alternativesTo('livekit-agents')).toEqual(expect.arrayContaining(['pipecat', 'ten-framework']));
    expect(alternativesTo('agentmail')).not.toContain('netdata');
    expect(alternativesTo('netdata')).not.toContain('agentmail');
  });

  it('pairs multi-agent frameworks, not tools that only share a platform, a trait or one term', async () => {
    const all = await getEveryAgent();
    const alternativesTo = (slug: string) => slugs(getAlternatives(all.find((a) => a.slug === slug)!, all).map((a) => a.agent));
    expect(alternativesTo('praisonai')).toEqual(expect.arrayContaining(['ag2', 'google-adk', 'microsoft-agent-framework']));
    expect(alternativesTo('langgraph')).toEqual(expect.arrayContaining(['autogen', 'crewai']));
    // Google Cloud; deploy and deployment; time series.
    expect(alternativesTo('terravision')).not.toContain('vertex-ai-agent-builder');
    expect(alternativesTo('langgraph')).not.toContain('alpic');
    expect(alternativesTo('netdata')).not.toContain('ibm-watsonx-ai');
  });
});
