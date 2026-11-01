import { describe, it, expect } from 'vitest';
import { constraintLabel, editDistance, recover } from './recovery';
import type { BrowseState } from './search';
import type { Agent, Category } from './types';

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

const data: Category = { id: 'd', name: 'Data & Analytics', slug: 'data-analytics', sortOrder: 1, agentCount: 3 };
const code: Category = { id: 'c', name: 'Code & DevTools', slug: 'code-devtools', sortOrder: 2, agentCount: 2 };
const writing: Category = { id: 'w', name: 'Writing', slug: 'writing', sortOrder: 3, agentCount: 1 };
const categories = [data, code, writing];

const agents = [
  makeAgent({
    slug: 'postgres-mcp-pro',
    name: 'Postgres MCP Pro',
    description: 'Query, tune and explain PostgreSQL databases.',
    categories: [data],
    accessMethods: ['mcp'],
    verified: true,
  }),
  makeAgent({
    slug: 'supabase',
    name: 'Supabase',
    description: 'Postgres database, auth and file storage.',
    categories: [data],
    accessMethods: ['mcp', 'api'],
    official: true,
    officialVendor: { slug: 'supabase', name: 'Supabase' },
    authType: 'apiKey',
    createdAt: '2026-10-30T00:00:00Z',
  }),
  makeAgent({
    slug: 'github-cli',
    name: 'GitHub CLI',
    description: 'Pull requests and issues from the terminal.',
    categories: [code],
    accessMethods: ['cli'],
    official: true,
    officialVendor: { slug: 'github', name: 'GitHub' },
    authType: 'oauth2',
  }),
  makeAgent({
    slug: 'ghostwriter',
    name: 'Ghostwriter',
    description: 'Drafts blog posts in your voice.',
    categories: [writing],
    accessMethods: ['browser-extension'],
  }),
];

const view = (overrides: Partial<BrowseState>): BrowseState => ({
  query: '',
  category: '',
  official: false,
  vendor: '',
  verified: false,
  auth: [],
  access: [],
  ...overrides,
});
const slugs = (list: { slug: string }[]) => list.map((a) => a.slug);
const removals = (state: BrowseState) =>
  recover(agents, state, categories).removals.map(({ what, value, count }) => [what, value, count]);

describe('recover: spelling', () => {
  it('respells a word nothing uses to the nearest word the directory does', () => {
    const r = recover(agents, view({ query: 'postgress' }), categories);
    expect(r.unknown).toEqual(['postgress']);
    expect(r.preview).toMatchObject({ kind: 'spelling', state: { query: 'postgres' }, total: 2 });
    expect(slugs(r.preview!.agents)).toEqual(['postgres-mcp-pro', 'supabase']);
  });

  it('keeps the rest of the query as typed', () => {
    const r = recover(agents, view({ query: 'Postgress MCP' }), categories);
    expect(r.unknown).toEqual(['postgress']);
    expect(r.preview).toMatchObject({ kind: 'spelling', state: { query: 'postgres MCP' } });
  });

  it('previews in the view’s sort order', () => {
    const r = recover(agents, view({ query: 'postgress' }), categories, 'newest');
    expect(slugs(r.preview!.agents)).toEqual(['supabase', 'postgres-mcp-pro']);
  });

  it('never respells to a word under 4 letters', () => {
    expect(recover(agents, view({ query: 'andd' }), categories).preview).toBeUndefined();
  });

  it('offers a respelling only when it finds something with the same filters', () => {
    expect(recover(agents, view({ query: 'postgress', access: ['cli'] }), categories).preview).toBeUndefined();
  });
});

describe('recover: removals', () => {
  it('lists removals that keep searching first, and previews the search without the filter', () => {
    const r = recover(agents, view({ query: 'postgres', access: ['cli'] }), categories);
    expect(removals(view({ query: 'postgres', access: ['cli'] }))).toEqual([
      ['access', 'cli', 2],
      ['word', 'postgres', 1],
    ]);
    expect(r.preview).toMatchObject({ kind: 'unfiltered', total: 2, without: { what: 'access', value: 'cli' } });
    expect(slugs(r.preview!.agents)).toEqual(['postgres-mcp-pro', 'supabase']);
  });

  it('offers each filter, most results first, and a vendor rather than Official', () => {
    expect(removals(view({ vendor: 'github', category: 'data-analytics' }))).toEqual([
      ['vendor', 'github', 2],
      ['category', 'data-analytics', 1],
    ]);
    // As the vendor chip does, removing the vendor keeps ?official=1.
    expect(removals(view({ vendor: 'github', official: true, category: 'data-analytics' }))).toEqual([
      ['category', 'data-analytics', 1],
      ['vendor', 'github', 1],
    ]);
    expect(removals(view({ verified: true, auth: ['oauth2'] }))).toEqual([
      ['verified', '', 1],
      ['auth', 'oauth2', 1],
    ]);
    expect(removals(view({ query: 'blog', official: true }))).toEqual([
      ['official', '', 1],
      ['word', 'blog', 2],
    ]);
  });

  it('leaves out removals that still find nothing, and never offers the whole directory', () => {
    expect(removals(view({ query: 'postgres storage zzqxjv' }))).toEqual([['word', 'zzqxjv', 1]]);
    expect(removals(view({ query: 'zzqx' }))).toEqual([]);
  });

  it('treats a query of filler words as a search, and clears the filler a removal leaves', () => {
    expect(removals(view({ query: 'and', access: ['browser-extension'] }))).toEqual([['access', 'browser-extension', 3]]);
    const r = recover(agents, view({ query: 'postgres and', access: ['cli'] }), categories);
    expect(r.removals.map((x) => [x.what, x.state.query, x.count])).toEqual([
      ['access', 'postgres and', 2],
      ['word', '', 1],
    ]);
  });

  it('keeps the rest of the query, and drops what is left once its only word goes', () => {
    const tidy = recover(agents, view({ query: 'Postgres, storage zzqxjv!' }), categories);
    expect(tidy.removals.map((r) => r.state.query)).toEqual(['Postgres, storage']);
    const quoted = recover(agents, view({ query: '“Postgres”', access: ['browser-extension'] }), categories);
    expect(quoted.removals.map((r) => [r.what, r.state.query, r.count])).toEqual([
      ['access', '“Postgres”', 2],
      ['word', '', 1],
    ]);
  });
});

describe('recover: closest matches and categories', () => {
  it('ranks the closest matches by how many words they have, then by how well', () => {
    const r = recover(agents, view({ query: 'postgres storage zzqxjv' }), categories);
    expect(r.unknown).toEqual(['zzqxjv']);
    expect(r.preview?.kind).toBe('closest');
    expect(slugs(r.preview!.agents)).toEqual(['supabase', 'postgres-mcp-pro']);
  });

  it('suggests the categories of the closest matches', () => {
    const r = recover(agents, view({ query: 'blog storage zzqxjv' }), categories);
    expect(slugs(r.categories)).toEqual(['data-analytics', 'writing']);
  });

  it('falls back to the largest categories, never the one being browsed', () => {
    expect(slugs(recover(agents, view({ query: 'zzqx' }), categories).categories)).toEqual(['data-analytics', 'code-devtools']);
    const r = recover(agents, view({ vendor: 'github', category: 'data-analytics' }), categories);
    expect(r.preview).toBeUndefined();
    expect(slugs(r.categories)).toEqual(['code-devtools', 'writing']);
  });
});

describe('constraintLabel', () => {
  it('names words, filters and auth types the way the page shows them', () => {
    expect(constraintLabel({ what: 'word', value: 'zzqx' })).toBe('“zzqx”');
    expect(constraintLabel({ what: 'access', value: 'browser-extension' })).toBe('Extension');
    expect(constraintLabel({ what: 'category', value: 'writing' }, { category: 'Writing' })).toBe('Writing');
    expect(constraintLabel({ what: 'vendor', value: 'github' })).toBe('github');
    expect(constraintLabel({ what: 'verified', value: '' })).toBe('Verified');
    expect(constraintLabel({ what: 'auth', value: 'none' })).toBe('No auth needed');
    expect(constraintLabel({ what: 'auth', value: 'apiKey,oauth2' })).toBe('API Key or OAuth 2.0 auth');
  });
});

describe('editDistance', () => {
  it('counts inserted, deleted and changed letters, and swapped neighbours as one', () => {
    expect(editDistance('slak', 'slack', 2)).toBe(1);
    expect(editDistance('notoin', 'notion', 2)).toBe(1);
    expect(editDistance('gihtub', 'github', 2)).toBe(1);
    expect(editDistance('kitten', 'sitting', 3)).toBe(3);
    expect(editDistance('same', 'same', 1)).toBe(0);
  });

  it('stops at max + 1', () => {
    expect(editDistance('kitten', 'sitting', 2)).toBe(3);
    expect(editDistance('ab', 'abcdef', 1)).toBe(2);
  });
});
