import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import { browseHref, scoreAgent, searchAgents } from '../lib/search';
import type { Agent, Category } from '../lib/types';
import { truncate } from '../lib/utils';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'A test agent for unit tests.',
    providerName: 'TestCo',
    providerUrl: 'https://test.co',
    agentUrl: 'https://test.co/agent',
    categories: [],
    tags: [],
    skills: [],
    authType: 'none',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: [],
    ...overrides,
  };
}

const slugs = (list: Agent[]) => list.map((a) => a.slug);

// A small catalog shaped like the real one: plenty of MCP/API/CLI listings
// whose text has nothing to do with Postgres, a few that do, and words that
// contain "api" and "cli" as substrings.
const catalog: Agent[] = [
  makeAgent({
    slug: 'agentmail',
    name: 'AgentMail',
    description: 'Email inboxes for AI agents via API and MCP.',
    accessMethods: ['api', 'mcp'],
    featured: true,
  }),
  makeAgent({
    slug: 'codex-cli',
    name: 'Codex CLI',
    description: 'A coding agent that runs in your terminal, with an MCP server mode.',
    accessMethods: ['cli', 'mcp'],
    featured: true,
  }),
  makeAgent({
    slug: 'kong',
    name: 'Kong',
    description: 'API gateway with an MCP server for managing services and routes.',
    accessMethods: ['api', 'mcp'],
  }),
  makeAgent({
    slug: 'postgres-mcp-pro',
    name: 'Postgres MCP Pro',
    description: 'MCP server for Postgres: index tuning, explain plans and health checks.',
    tags: ['postgres', 'database'],
    accessMethods: ['mcp'],
  }),
  makeAgent({
    slug: 'supabase-mcp',
    name: 'Supabase MCP',
    description: 'Manage Supabase projects and query their PostgreSQL databases.',
    accessMethods: ['mcp'],
  }),
  makeAgent({
    slug: 'aiven-mcp',
    name: 'Aiven MCP',
    description: 'Run managed PostgreSQL, Kafka and ClickHouse services on Aiven.',
    accessMethods: ['mcp'],
  }),
  makeAgent({
    slug: 'pgcli-agent',
    name: 'Pg Shell',
    description: 'Terminal client for pg databases.',
    accessMethods: ['cli'],
  }),
  makeAgent({
    slug: 'capital-com-mcp',
    name: 'Capital.com MCP',
    description: 'Trade CFDs through the Capital.com API.',
    accessMethods: ['api', 'mcp'],
  }),
  makeAgent({
    slug: 'weather-agent',
    name: 'Weather Agent',
    description: 'Forecasts and climate data for any location.',
    accessMethods: ['api'],
  }),
  makeAgent({
    slug: 'k8sgpt',
    name: 'K8sGPT',
    description: 'Scans k8s clusters and explains problems in plain English.',
    accessMethods: ['cli'],
  }),
  makeAgent({
    slug: 'kubernetes-mcp-server',
    name: 'Kubernetes MCP Server',
    description: 'Manage Kubernetes resources from any MCP client.',
    accessMethods: ['mcp'],
  }),
  makeAgent({
    slug: 'tab-helper',
    name: 'Tab Helper',
    description: 'Summarises your open tabs.',
    accessMethods: ['browser-extension'],
  }),
];

const mentionsPostgres = (a: Agent) => /postgres|\bpg\b/i.test(`${a.name} ${a.description} ${a.tags.join(' ')}`);

describe('natural-language queries', () => {
  it('"mcp server for postgres" ranks Postgres listings first and returns only relevant ones', () => {
    const results = searchAgents(catalog, 'mcp server for postgres');
    expect(results[0].slug).toBe('postgres-mcp-pro');
    expect(slugs(results).sort()).toEqual(['aiven-mcp', 'postgres-mcp-pro', 'supabase-mcp']);
    expect(results.every(mentionsPostgres)).toBe(true);
    expect(results.every((a) => a.accessMethods.includes('mcp'))).toBe(true);
  });

  it('drops stopwords: "an mcp server for postgres" matches the same set', () => {
    expect(slugs(searchAgents(catalog, 'an mcp server for postgres'))).toEqual(
      slugs(searchAgents(catalog, 'mcp server for postgres'))
    );
  });

  it('requires every remaining word to match', () => {
    expect(slugs(searchAgents(catalog, 'postgres kafka'))).toEqual(['aiven-mcp']);
    expect(searchAgents(catalog, 'postgres kubernetes')).toHaveLength(0);
  });

  it('rewards the whole phrase in the name', () => {
    expect(searchAgents(catalog, 'Postgres MCP Pro')[0].slug).toBe('postgres-mcp-pro');
  });
});

describe('access-method words', () => {
  it('"capital" does not match through the "api" inside it', () => {
    expect(slugs(searchAgents(catalog, 'capital'))).toEqual(['capital-com-mcp']);
    expect(scoreAgent(catalog.find((a) => a.slug === 'kong')!, 'capital')).toBe(0);
  });

  it('"climate" does not match through the "cli" inside it', () => {
    expect(slugs(searchAgents(catalog, 'climate'))).toEqual(['weather-agent']);
    expect(scoreAgent(catalog.find((a) => a.slug === 'codex-cli')!, 'climate')).toBe(0);
  });

  it('an access word is a filter, not a text match', () => {
    const cli = searchAgents(catalog, 'cli');
    expect(slugs(cli).sort()).toEqual(['codex-cli', 'k8sgpt', 'pgcli-agent']);
    // Same result as clicking the CLI chip, in the incoming (catalog) order.
    expect(slugs(cli)).toEqual(slugs(searchAgents(catalog, '', ['cli'])));
  });

  it('combines an access word with text', () => {
    expect(slugs(searchAgents(catalog, 'postgres cli'))).toEqual(['pgcli-agent']);
    expect(slugs(searchAgents(catalog, 'kubernetes mcp'))).toEqual(['kubernetes-mcp-server']);
  });

  it('combines access words in the query with access chips (AND)', () => {
    expect(slugs(searchAgents(catalog, 'api', ['mcp'])).sort()).toEqual(['agentmail', 'capital-com-mcp', 'kong']);
    expect(searchAgents(catalog, 'cli postgres', ['mcp'])).toHaveLength(0);
  });

  it('"extension" and "browser-extension" both mean the browser-extension method', () => {
    expect(slugs(searchAgents(catalog, 'extension'))).toEqual(['tab-helper']);
    expect(slugs(searchAgents(catalog, 'browser-extension'))).toEqual(['tab-helper']);
    expect(slugs(searchAgents(catalog, '', ['extension']))).toEqual(['tab-helper']);
  });

  it('scoreAgent applies the filter too', () => {
    const kong = catalog.find((a) => a.slug === 'kong')!;
    expect(scoreAgent(kong, 'mcp')).toBeGreaterThan(0);
    expect(scoreAgent(kong, 'cli')).toBe(0);
  });
});

describe('synonyms', () => {
  it('"postgresql" finds Postgres listings, and the reverse', () => {
    expect(slugs(searchAgents(catalog, 'postgresql')).sort()).toEqual(
      ['aiven-mcp', 'pgcli-agent', 'postgres-mcp-pro', 'supabase-mcp']
    );
    expect(slugs(searchAgents(catalog, 'postgres'))).toEqual(slugs(searchAgents(catalog, 'postgresql')));
    expect(slugs(searchAgents(catalog, 'pg')).sort()).toEqual(slugs(searchAgents(catalog, 'postgres')).sort());
  });

  it('"k8s" and "kubernetes" find each other', () => {
    expect(slugs(searchAgents(catalog, 'k8s')).sort()).toEqual(['k8sgpt', 'kubernetes-mcp-server']);
    expect(slugs(searchAgents(catalog, 'kubernetes')).sort()).toEqual(['k8sgpt', 'kubernetes-mcp-server']);
  });

  it('short words need word boundaries ("ts" does not match "agents")', () => {
    const ts = makeAgent({ slug: 'ts-sdk', description: 'The TypeScript SDK.' });
    const noise = makeAgent({ slug: 'noise', description: 'Lists agents and their settings.' });
    expect(slugs(searchAgents([noise, ts], 'ts'))).toEqual(['ts-sdk']);
    expect(slugs(searchAgents([noise, ts], 'typescript'))).toEqual(['ts-sdk']);
  });
});

describe('access words also match names', () => {
  // The MCP SDKs are reached through an API or CLI, not as MCP servers, but
  // "MCP" is in their names.
  const sdk = makeAgent({
    slug: 'mcp-python-sdk',
    name: 'MCP Python SDK',
    description: 'Official Python SDK for building Model Context Protocol servers and clients.',
    accessMethods: ['api', 'cli'],
  });
  const fastmcp = makeAgent({
    slug: 'fastmcp',
    name: 'FastMCP',
    description: 'A Pythonic framework for MCP servers.',
    accessMethods: ['mcp'],
  });
  const repl = makeAgent({
    slug: 'python-repl',
    name: 'Python REPL Agent',
    description: 'Runs Python in a sandbox.',
    accessMethods: ['cli'],
  });
  const runTogether = makeAgent({
    slug: 'agentmcp-hub',
    name: 'AgentMCP Hub',
    description: 'A Python hub for agents.',
    accessMethods: ['api'],
  });
  const list = [repl, runTogether, fastmcp, sdk];

  it('"mcp python" finds a listing with MCP in its name but no MCP access', () => {
    const results = searchAgents(list, 'mcp python');
    expect(results[0].slug).toBe('mcp-python-sdk');
    expect(slugs(results).sort()).toEqual(['fastmcp', 'mcp-python-sdk']);
    expect(scoreAgent(sdk, 'mcp python')).toBeGreaterThan(0);
  });

  it('the name must contain the access word as a whole word', () => {
    expect(scoreAgent(runTogether, 'mcp python')).toBe(0);
    expect(slugs(searchAgents(list, 'mcp'))).toEqual(['fastmcp', 'mcp-python-sdk']);
  });

  it('access chips stay strict', () => {
    expect(slugs(searchAgents(list, 'python', ['mcp']))).toEqual(['fastmcp']);
    expect(slugs(searchAgents(list, 'mcp python', ['mcp']))).toEqual(['fastmcp']);
    expect(slugs(searchAgents(list, '', ['mcp']))).toEqual(['fastmcp']);
  });

  it('"constructor" is a search word, not an access method', () => {
    const builder = makeAgent({ slug: 'builder', name: 'Constructor', accessMethods: ['api'] });
    expect(slugs(searchAgents([builder, repl], 'constructor'))).toEqual(['builder']);
  });
});

describe('"sql" expansion', () => {
  const mysql = makeAgent({ slug: 'db-bridge', name: 'DB Bridge', description: 'Query MySQL databases in plain English.' });
  const nosql = makeAgent({ slug: 'doc-helper', name: 'Doc Helper', description: 'Assistant for NoSQL document stores.' });
  const sqlite = makeAgent({ slug: 'lite-notes', name: 'Lite Notes', description: 'Notes kept in SQLite.' });
  const mssql = makeAgent({ slug: 'ms-db', name: 'MS DB', description: 'Talks to MSSQL servers.' });
  const plain = makeAgent({ slug: 'sql-runner', name: 'Runner', description: 'Runs SQL queries.' });
  const other = makeAgent({ slug: 'notes', name: 'Notes', description: 'Takes quick notes.' });
  const list = [other, mysql, nosql, sqlite, mssql, plain];

  it('"sql" finds MySQL, NoSQL, SQLite and MSSQL tools as well as plain SQL ones', () => {
    expect(slugs(searchAgents(list, 'sql')).sort()).toEqual(['db-bridge', 'doc-helper', 'lite-notes', 'ms-db', 'sql-runner']);
  });

  it('"sql" finds PostgreSQL listings', () => {
    expect(slugs(searchAgents(catalog, 'sql')).sort()).toEqual(['aiven-mcp', 'supabase-mcp']);
  });

  it('is one-way: "mysql" does not find SQLite or NoSQL tools', () => {
    expect(slugs(searchAgents(list, 'mysql'))).toEqual(['db-bridge']);
  });

  it('leaves the postgres synonyms alone', () => {
    expect(slugs(searchAgents(catalog, 'postgresql'))).toEqual(slugs(searchAgents(catalog, 'postgres')));
  });
});

describe('truncate (card descriptions)', () => {
  it('cuts at the last word boundary before the limit, keeping the ellipsis', () => {
    expect(truncate('The quick brown fox jumps over the lazy dog', 20)).toBe('The quick brown fox…');
    expect(truncate('The quick brown fox jumps over the lazy dog', 18)).toBe('The quick brown…');
  });

  it('drops a dangling separator before the ellipsis', () => {
    expect(truncate('Search, filter, and export data', 17)).toBe('Search, filter…');
    expect(truncate('Fast setup — then deploy anywhere', 14)).toBe('Fast setup…');
  });

  it('leaves text within the limit alone', () => {
    expect(truncate('Short enough.', 120)).toBe('Short enough.');
  });
});

describe('edge cases', () => {
  it('an empty query returns everything in the incoming order', () => {
    expect(slugs(searchAgents(catalog, '   '))).toEqual(slugs(catalog));
  });

  it('a query of only stopwords still searches for its words', () => {
    const toolsy = makeAgent({ slug: 'toolsy', description: 'Developer tools.' });
    expect(slugs(searchAgents([...catalog, toolsy], 'tools'))).toEqual(['toolsy']);
  });

  it('punctuation-only queries match nothing rather than everything', () => {
    expect(searchAgents(catalog, '!!')).toHaveLength(0);
  });

  it('ignores punctuation around words', () => {
    expect(searchAgents(catalog, '"postgres?"')[0].slug).toBe('postgres-mcp-pro');
  });
});

describe('browseHref', () => {
  it('keeps active filters when a query is submitted', () => {
    expect(browseHref('postgres', '?category=code-devtools&access=mcp&official=1&vendor=google')).toBe(
      '/browse?category=code-devtools&access=mcp&official=1&vendor=google&q=postgres'
    );
  });

  it('replaces an existing query', () => {
    expect(browseHref('redis', '?q=postgres&access=mcp')).toBe('/browse?q=redis&access=mcp');
  });

  it('clearing the query keeps the filters', () => {
    expect(browseHref('  ', '?q=postgres&access=mcp')).toBe('/browse?access=mcp');
    expect(browseHref('', '')).toBe('/browse');
  });

  it('starts fresh without a current search string', () => {
    expect(browseHref('k8s')).toBe('/browse?q=k8s');
  });

  it('encodes the query', () => {
    const href = browseHref('c++ & rust');
    expect(new URLSearchParams(href.split('?')[1]).get('q')).toBe('c++ & rust');
  });
});

// The real catalog, loaded the way lib/catalog.ts does it. Assertions are
// loose so the weekly content drop does not break them.
describe('against content/agents', () => {
  const root = path.resolve(__dirname, '..');
  const categories: Category[] = JSON.parse(fs.readFileSync(path.join(root, 'content/categories.json'), 'utf8'));
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const dir = path.join(root, 'content/agents');
  const agents: Agent[] = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return {
        ...data,
        categories: (data.categories ?? []).map((s: string) => bySlug.get(s)).filter(Boolean),
        tags: data.tags ?? [],
        skills: data.skills ?? [],
        accessMethods: data.accessMethods ?? [],
      } as Agent;
    })
    .filter((a) => a.status === 'published');

  it('"mcp server for postgres" returns a small set of Postgres MCP listings (was 437)', () => {
    const results = searchAgents(agents, 'mcp server for postgres');
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThan(40);
    // MCP access, or "MCP" as a word in the name.
    expect(results.every((a) => a.accessMethods.includes('mcp') || /\bmcp\b/i.test(a.name))).toBe(true);
    expect(/postgres/i.test(results[0].name)).toBe(true);
  });

  it('"capital" and "climate" no longer match hundreds of listings', () => {
    expect(searchAgents(agents, 'capital').length).toBeLessThan(20);
    expect(searchAgents(agents, 'climate').length).toBeLessThan(20);
  });

  const has = (slug: string) => agents.some((a) => a.slug === slug);

  it.skipIf(!has('mcp-python-sdk'))('"mcp python" finds the MCP Python SDK', () => {
    expect(searchAgents(agents, 'mcp python')[0].slug).toBe('mcp-python-sdk');
  });

  it('"sql" finds a listing that only mentions MySQL', () => {
    const results = searchAgents(agents, 'sql');
    expect(results.some((a) => /mysql/i.test(a.description) && !/sql/i.test(a.name))).toBe(true);
  });

  it('truncated card descriptions end on a whole word', () => {
    const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);
    for (const { description } of agents) {
      const out = truncate(description, 120);
      expect(out.length).toBeLessThanOrEqual(120);
      if (out === description) continue;
      expect(out.endsWith('…')).toBe(true);
      const kept = out.slice(0, -1);
      expect(description.startsWith(kept)).toBe(true);
      // Not cut mid-word: a word character never sits on both sides of the cut.
      expect(isWordChar(kept.at(-1)) && isWordChar(description[kept.length])).toBe(false);
    }
  });
});
