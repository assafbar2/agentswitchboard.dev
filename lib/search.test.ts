import { describe, it, expect } from 'vitest';
import {
  breakdownLine,
  browseMatches,
  browseStateHref,
  filterAgents,
  narrowingWords,
  parseFlag,
  parseSort,
  resultBreakdown,
  scoreAgent,
  searchAgents,
  sortAgents,
  type BreakdownKey,
  type BrowseState,
} from './search';
import type { Agent } from './types';

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

describe('scoreAgent', () => {
  it('returns 1 for empty query (neutral match)', () => {
    expect(scoreAgent(makeAgent(), '')).toBe(1);
  });

  it('ranks exact name match above partial name match', () => {
    const exact = scoreAgent(makeAgent({ name: 'Cursor' }), 'cursor');
    const partial = scoreAgent(makeAgent({ name: 'Cursor Tools' }), 'cursor');
    expect(exact).toBeGreaterThan(partial);
  });

  it('ranks name match above description match', () => {
    const byName = scoreAgent(makeAgent({ name: 'Playwright' }), 'playwright');
    const byDesc = scoreAgent(
      makeAgent({ name: 'Other', description: 'Uses playwright under the hood' }),
      'playwright'
    );
    expect(byName).toBeGreaterThan(byDesc);
  });

  it('matches access methods (searching "mcp" finds MCP agents)', () => {
    const agent = makeAgent({ accessMethods: ['mcp'] });
    expect(scoreAgent(agent, 'mcp')).toBeGreaterThan(0);
  });

  it('matches tags and skills', () => {
    const agent = makeAgent({
      tags: ['browser-automation'],
      skills: [{ id: 's1', name: 'Web Scraping', description: 'Scrapes pages' }],
    });
    expect(scoreAgent(agent, 'browser-automation')).toBeGreaterThan(0);
    expect(scoreAgent(agent, 'scraping')).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    const agent = makeAgent({ name: 'FireCrawl' });
    expect(scoreAgent(agent, 'FIRECRAWL')).toBe(scoreAgent(agent, 'firecrawl'));
  });

  it('handles skills missing name/description without throwing', () => {
    const agent = makeAgent({
      // Simulates legacy string-form skills mapped defensively
      skills: [{ id: 'x', name: undefined as unknown as string, description: undefined as unknown as string }],
    });
    expect(() => scoreAgent(agent, 'anything')).not.toThrow();
  });
});

describe('searchAgents', () => {
  const agents = [
    makeAgent({ name: 'Alpha', slug: 'alpha', accessMethods: ['api'] }),
    makeAgent({ name: 'Beta', slug: 'beta', accessMethods: ['mcp', 'cli'] }),
    makeAgent({ name: 'Gamma Alpha', slug: 'gamma', accessMethods: ['mcp'] }),
  ];

  it('returns all agents for empty query and no filters', () => {
    expect(searchAgents(agents, '')).toHaveLength(3);
  });

  it('filters by access method (AND semantics)', () => {
    expect(searchAgents(agents, '', ['mcp'])).toHaveLength(2);
    expect(searchAgents(agents, '', ['mcp', 'cli'])).toHaveLength(1);
  });

  it('sorts by relevance: exact name first', () => {
    const results = searchAgents(agents, 'alpha');
    expect(results[0].slug).toBe('alpha');
    expect(results).toHaveLength(2);
  });

  it('excludes zero-score agents', () => {
    const results = searchAgents(agents, 'nonexistent-term-xyz');
    expect(results).toHaveLength(0);
  });

  it('combines access filter with text query', () => {
    const results = searchAgents(agents, 'alpha', ['mcp']);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('gamma');
  });
});

describe('filterAgents', () => {
  const code = { id: 'c', name: 'Code', slug: 'code-devtools', sortOrder: 1 };
  const data = { id: 'd', name: 'Data', slug: 'data-analytics', sortOrder: 2 };
  const google = { slug: 'google', name: 'Google' };
  const agents = [
    makeAgent({ slug: 'gemini-cli', categories: [code], official: true, officialVendor: google }),
    makeAgent({ slug: 'bigquery', categories: [data], official: true, officialVendor: google }),
    makeAgent({ slug: 'community-gemini', categories: [code] }),
  ];
  const slugs = (list: Agent[]) => list.map((a) => a.slug);

  it('keeps everything with no filter', () => {
    expect(filterAgents(agents, {})).toHaveLength(3);
  });

  it('narrows to official listings', () => {
    expect(slugs(filterAgents(agents, { official: true }))).toEqual(['gemini-cli', 'bigquery']);
  });

  it('combines official with a category', () => {
    expect(slugs(filterAgents(agents, { official: true, category: 'code-devtools' }))).toEqual(['gemini-cli']);
  });

  it('narrows to one vendor', () => {
    expect(slugs(filterAgents(agents, { vendor: 'google', category: 'data-analytics' }))).toEqual(['bigquery']);
  });

  it('narrows to Verified listings and to auth types', () => {
    const more = [
      makeAgent({ slug: 'open', verified: true, authType: 'none' }),
      makeAgent({ slug: 'keyed', verified: true, authType: 'apiKey' }),
      makeAgent({ slug: 'unchecked', verified: false, authType: 'none' }),
    ];
    expect(slugs(filterAgents(more, { verified: true }))).toEqual(['open', 'keyed']);
    expect(slugs(filterAgents(more, { auth: ['none'] }))).toEqual(['open', 'unchecked']);
    expect(slugs(filterAgents(more, { auth: ['none', 'apiKey'], verified: true }))).toEqual(['open', 'keyed']);
    expect(filterAgents(more, { auth: [] })).toHaveLength(3);
  });
});

describe('sortAgents', () => {
  const agents = [
    makeAgent({ name: 'Beta', slug: 'beta', createdAt: '2026-05-01T00:00:00.000Z', skills: [] }),
    makeAgent({
      name: 'alpha',
      slug: 'alpha',
      createdAt: '2026-10-30T00:00:00Z',
      skills: [{ id: 'a', name: 'A', description: '' }],
    }),
    makeAgent({ name: 'Gamma', slug: 'gamma', createdAt: undefined, skills: [] }),
    makeAgent({
      name: 'Delta',
      slug: 'delta',
      createdAt: '2026-08-01T00:00:00.000Z',
      skills: [{ id: 'a', name: 'A', description: '' }],
    }),
  ];
  const order = (sort: Parameters<typeof sortAgents>[1]) => sortAgents(agents, sort).map((a) => a.slug);

  it('relevance keeps the incoming order', () => {
    expect(order('relevance')).toEqual(['beta', 'alpha', 'gamma', 'delta']);
  });

  it('newest puts the latest additions first and undated listings last', () => {
    expect(order('newest')).toEqual(['alpha', 'delta', 'beta', 'gamma']);
  });

  it('skills puts most skills first, ties in the incoming order', () => {
    expect(order('skills')).toEqual(['alpha', 'delta', 'beta', 'gamma']);
  });

  it('name sorts A→Z regardless of case', () => {
    expect(order('name')).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });

  it('never reorders the array it was given', () => {
    sortAgents(agents, 'name');
    expect(agents.map((a) => a.slug)).toEqual(['beta', 'alpha', 'gamma', 'delta']);
  });
});

describe('parseSort', () => {
  it('accepts the four orders in any case and defaults to relevance', () => {
    expect(['newest', ' Skills', 'NAME', 'relevance'].map(parseSort)).toEqual(['newest', 'skills', 'name', 'relevance']);
    expect(['', 'oldest', 'constructor', null, undefined].map(parseSort)).toEqual(Array(5).fill('relevance'));
  });
});

describe('resultBreakdown', () => {
  const agents = [
    makeAgent({ official: true, verified: true, authType: 'none', accessMethods: ['mcp'] }),
    makeAgent({ verified: true, authType: 'apiKey', accessMethods: ['api', 'mcp'] }),
    makeAgent({ verified: true, authType: 'oauth2', accessMethods: ['api'] }),
  ];
  const line = (applied?: Set<BreakdownKey>) =>
    resultBreakdown(agents, applied).map(({ label, count }) => `${count} ${label}`);

  it('counts what each chip would keep, in chip order, without zeros', () => {
    expect(line()).toEqual(['1 Official', '3 Verified', '1 No auth needed', '2 API', '2 MCP']);
  });

  it('leaves out chips that are already applied', () => {
    expect(line(new Set(['verified', 'mcp']))).toEqual(['1 Official', '1 No auth needed', '2 API']);
  });

  it('is empty for no results', () => {
    expect(resultBreakdown([])).toEqual([]);
  });
});

describe('breakdownLine', () => {
  it('joins the counts and says "all" for a chip that keeps every result', () => {
    const items = resultBreakdown([
      makeAgent({ official: true, verified: true, accessMethods: ['mcp'] }),
      makeAgent({ verified: true, authType: 'apiKey', accessMethods: ['mcp', 'cli'] }),
    ]);
    expect(breakdownLine(items, 2)).toBe('1 Official · all Verified · 1 No auth needed · all MCP · 1 CLI');
  });
});

describe('parseFlag', () => {
  it('accepts 1/true/yes and rejects everything else', () => {
    expect(['1', 'true', 'TRUE', 'yes'].map(parseFlag)).toEqual([true, true, true, true]);
    expect(['0', 'false', '', 'no'].map(parseFlag)).toEqual([false, false, false, false]);
    expect(parseFlag(null)).toBe(false);
  });
});

describe('narrowingWords', () => {
  it('keeps access words and drops filler, lowercased, in order and once each', () => {
    expect(narrowingWords('An MCP server for Postgres, postgres!')).toEqual(['mcp', 'postgres']);
    expect(narrowingWords('the tools')).toEqual([]);
    expect(narrowingWords('  ')).toEqual([]);
  });
});

describe('browseMatches and browseStateHref', () => {
  const google = { slug: 'google', name: 'Google' };
  const agents = [
    makeAgent({ slug: 'gemini-cli', name: 'Gemini CLI', official: true, officialVendor: google, accessMethods: ['cli'] }),
    makeAgent({ slug: 'gemini-mcp', name: 'Gemini MCP', accessMethods: ['mcp'], verified: true }),
  ];
  const none: BrowseState = { query: '', category: '', official: false, vendor: '', verified: false, auth: [], access: [] };
  const slugs = (state: BrowseState) => browseMatches(agents, state).map((a) => a.slug);

  it('applies the filters, then the search; a vendor implies Official', () => {
    expect(slugs({ ...none, query: 'gemini' })).toEqual(['gemini-cli', 'gemini-mcp']);
    expect(slugs({ ...none, query: 'gemini', vendor: 'google' })).toEqual(['gemini-cli']);
    expect(slugs({ ...none, query: 'gemini', access: ['mcp'] })).toEqual(['gemini-mcp']);
    expect(slugs({ ...none, verified: true, auth: ['apiKey'] })).toEqual([]);
  });

  it('writes a view as the filters do, without empty or default parameters', () => {
    const all: BrowseState = { query: 'postgres mcp', category: 'data-analytics', official: true, vendor: 'google', verified: true, auth: ['none'], access: ['mcp', 'cli'] };
    expect(browseStateHref(all, 'newest')).toBe(
      '/browse?q=postgres+mcp&category=data-analytics&official=1&vendor=google&verified=1&auth=none&access=mcp%2Ccli&sort=newest'
    );
    expect(browseStateHref(none)).toBe('/browse');
    expect(browseStateHref(none, 'relevance')).toBe('/browse');
  });
});
