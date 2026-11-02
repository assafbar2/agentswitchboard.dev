import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import {
  compareRows,
  compareTitle,
  comparisonFor,
  comparisonProblems,
  comparisonsWith,
  factLines,
  getComparisons,
  MAX_FACTS,
  noteText,
  pairListings,
  pairPath,
  pairSlugs,
  pairUnsafeSlugs,
  requestedSlugs,
  selectCompared,
  type Comparison,
} from './compare';
import { COMPARE_MAX, compareHref } from './compare-link';
import type { Agent } from './types';
import { INSTALL_LABELS } from './use-it-now';
import { formatDay } from './utils';

function listing(slug: string, overrides: Partial<Agent> = {}): Agent {
  const name = slug.replace(/(^|-)(\w)/g, (_, sep: string, c: string) => `${sep ? ' ' : ''}${c.toUpperCase()}`);
  return {
    id: slug,
    name,
    slug,
    description: `${name} is a listing used by the compare tests.`,
    providerName: 'Example Inc',
    providerUrl: 'https://example.com',
    agentUrl: `https://example.com/${slug}`,
    categories: [],
    tags: [],
    skills: [],
    authType: 'apiKey',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['api'],
    ...overrides,
  };
}

const alpha = listing('alpha');
const beta = listing('beta');
const gamma = listing('gamma');
const delta = listing('delta');
const catalog = [alpha, beta, gamma, delta];
const intro = 'Two example listings that both answer over an API, with different sign-ins.';

describe('compareHref', () => {
  it('names the columns a, b and c, in order, and keeps the first three', () => {
    expect(compareHref(['alpha', 'beta'])).toBe('/compare?a=alpha&b=beta');
    expect(compareHref(['alpha', 'beta', 'gamma', 'delta'])).toBe('/compare?a=alpha&b=beta&c=gamma');
    expect(compareHref([])).toBe('/compare');
  });
});

describe('requestedSlugs', () => {
  it('reads a to f in key order, repeated keys included', () => {
    expect(requestedSlugs(new URLSearchParams('b=two&a=one&a=uno&d=four'))).toEqual(['one', 'uno', 'two', 'four']);
    expect(requestedSlugs({ a: 'one', b: ['two', 'dos'], c: undefined })).toEqual(['one', 'two', 'dos']);
  });

  it('reads no more than twice the column count', () => {
    const query = new URLSearchParams(['a', 'b', 'c', 'd', 'e', 'f', 'a'].map((k, i) => [k, `s${i}`]));
    expect(requestedSlugs(query)).toHaveLength(2 * COMPARE_MAX);
  });
});

describe('selectCompared', () => {
  it('keeps the order and says what it left out', () => {
    const retired = new Map([['old-tool', 'Old Tool']]);
    const { agents, notes } = selectCompared(
      ['alpha', ' ALPHA ', 'old-tool', 'nope', 'beta', 'gamma', 'delta', '<b>x</b>'],
      catalog,
      retired
    );
    expect(agents.map((a) => a.slug)).toEqual(['alpha', 'beta', 'gamma']);
    expect(notes).toEqual([
      { slug: 'alpha', kind: 'duplicate', name: 'Alpha' },
      { slug: 'old-tool', kind: 'retired', name: 'Old Tool' },
      { slug: 'nope', kind: 'unknown' },
      { slug: 'delta', kind: 'extra', name: 'Delta' },
      { slug: '', kind: 'unknown' },
    ]);
    expect(notes.map(noteText)).toEqual([
      'Alpha was named twice; it is shown once.',
      'Old Tool is no longer listed, so it is left out.',
      '“nope” isn’t a listing in the directory, so it is left out.',
      `Delta is left out: a comparison shows up to ${COMPARE_MAX}.`,
      'One link named no listing, so it is left out.',
    ]);
  });

  it('skips empty values', () => {
    expect(selectCompared(['', '  ', 'beta'], catalog, new Map())).toEqual({ agents: [beta], notes: [] });
  });
});

describe('compareTitle', () => {
  it('joins the names with vs', () => {
    expect(compareTitle([alpha, beta, gamma])).toBe('Alpha vs Beta vs Gamma');
  });
});

describe('compareRows', () => {
  const hosted = listing('hosted-mcp', {
    accessMethods: ['mcp'],
    mcpEndpoint: 'https://mcp.example.com/mcp',
    tags: ['search', 'docs'],
  });
  const local = listing('local-mcp', {
    accessMethods: ['mcp', 'cli'],
    mcpCommand: 'npx -y local-mcp',
    install: { type: 'npm', command: 'npm install -g local-mcp' },
    tags: ['docs', 'search'],
  });

  it('shows a setup row only for an access method some column offers', () => {
    const keys = compareRows([hosted, local]).map((r) => r.key);
    expect(keys).toEqual([
      'description',
      'provider',
      'official',
      'verified',
      'access',
      'auth',
      'mcp',
      'cli',
      'skills',
      'streaming',
      'push',
      'categories',
      'tags',
      'added',
    ]);
  });

  it('gives each column the command or address from its listing, or what it lacks', () => {
    const rows = new Map(compareRows([hosted, local, listing('docs-only', { accessMethods: ['api', 'mcp'] })]).map((r) => [r.key, r]));
    expect(rows.get('mcp')?.values).toEqual([
      { code: 'https://mcp.example.com/mcp', note: 'Hosted' },
      { code: 'npx -y local-mcp', note: 'Runs on your computer' },
      'In its setup guide',
    ]);
    expect(rows.get('cli')?.values).toEqual(['No CLI', { code: 'npm install -g local-mcp', note: INSTALL_LABELS.npm }, 'No CLI']);
    expect(rows.get('api')?.values).toEqual(['No API', 'No API', 'In its docs']);
  });

  it('marks a row the same when every column says the same, lists in any order', () => {
    const rows = new Map(compareRows([hosted, local]).map((r) => [r.key, r]));
    expect(rows.get('provider')?.same).toBe(true);
    expect(rows.get('tags')?.same).toBe(true);
    expect(rows.get('access')?.same).toBe(false);
    expect(rows.get('mcp')?.same).toBe(false);
    expect(compareRows([hosted]).some((r) => r.same)).toBe(false);
  });
});

describe('factLines', () => {
  it('says what sets each column apart, and nothing true of all of them', () => {
    const cli = listing('cli-tool', {
      accessMethods: ['api', 'cli'],
      authType: 'none',
      verified: true,
      skills: [
        { id: 'one', name: 'One', description: 'The first skill.' },
        { id: 'two', name: 'Two', description: 'The second skill.' },
      ],
      createdAt: '2026-10-30T00:00:00Z',
    });
    const api = listing('api-tool', { verified: true, createdAt: '2026-09-01T00:00:00Z' });
    expect(factLines([cli, api])).toEqual([
      ['Only one with a CLI', 'No auth required', 'Most skills (2)', `Newest listing (added ${formatDay('2026-10-30')})`],
      [],
    ]);
  });

  it('keeps at most MAX_FACTS lines a column', () => {
    const busy = listing('busy', {
      accessMethods: ['api', 'mcp', 'cli', 'browser-extension'],
      authType: 'none',
      verified: true,
      supportsStreaming: true,
    });
    const [lines] = factLines([busy, listing('plain')]);
    expect(lines).toHaveLength(MAX_FACTS);
  });

  it('has nothing to say about one listing', () => {
    expect(factLines([alpha])).toEqual([[]]);
  });
});

describe('curated comparison addresses', () => {
  it('joins and splits the slugs with -vs-', () => {
    expect(pairPath(['alpha', 'beta'])).toBe('/compare/alpha-vs-beta');
    expect(pairSlugs('alpha-vs-beta-vs-gamma')).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('finds the listings an address names, or null', () => {
    expect(pairListings('alpha-vs-beta', catalog)).toEqual([alpha, beta]);
    expect(pairListings('alpha', catalog)).toBeNull();
    expect(pairListings('alpha-vs-alpha', catalog)).toBeNull();
    expect(pairListings('alpha-vs-nope', catalog)).toBeNull();
    expect(pairListings('alpha-vs-beta-vs-gamma-vs-delta', catalog)).toBeNull();
  });

  it('flags a slug that would break an address', () => {
    expect(pairUnsafeSlugs([{ slug: 'cats-vs-dogs' }, { slug: 'alpha' }])).toEqual(['cats-vs-dogs']);
  });

  it('matches a curated comparison in any order', () => {
    const comparisons: Comparison[] = [{ items: ['alpha', 'beta'], intro }];
    expect(comparisonFor(['beta', 'alpha'], comparisons)).toBe(comparisons[0]);
    expect(comparisonFor(['alpha', 'beta', 'gamma'], comparisons)).toBeNull();
    expect(comparisonsWith('beta', comparisons)).toEqual(comparisons);
    expect(comparisonsWith('gamma', comparisons)).toEqual([]);
  });
});

describe('comparisonProblems', () => {
  it('reports each rule a comparison breaks', () => {
    const problems = comparisonProblems(
      [
        { items: ['alpha'], intro },
        { items: ['alpha', 'alpha'], intro },
        { items: ['alpha', 'nope'], intro },
        { items: ['beta', 'gamma'], intro: 'Too short.' },
        { items: ['gamma', 'beta'], intro: `${intro} See https://example.com` },
      ],
      catalog
    );
    expect(problems).toEqual([
      `alpha: compares 1 listing; use 2 to ${COMPARE_MAX}`,
      'alpha-vs-alpha: names a listing twice',
      'alpha-vs-nope: "nope" is not a published listing',
      'beta-vs-gamma: intro is 10 characters; keep it to 40–220',
      'beta-vs-gamma: "gamma" is not among beta\'s alternatives (lib/related.ts)',
      'gamma-vs-beta: compares the same listings as "beta-vs-gamma"',
      'gamma-vs-beta: intro contains a URL',
      'gamma-vs-beta: "beta" is not among gamma\'s alternatives (lib/related.ts)',
    ]);
  });

  it('passes every curated comparison in content/comparisons.json', async () => {
    const published = (await getEveryAgent()).filter((a) => a.status === 'published');
    expect(getComparisons().length).toBeGreaterThan(0);
    expect(comparisonProblems(getComparisons(), published)).toEqual([]);
  });
});
