import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import { compareRows, compareSuggestions, compareTitle, curatedComparisons, factLines, pairPath } from './compare';
import { compareHref } from './compare-link';
import { alternativesDecision, bundleDecision, compareDecision } from './decide';
import { BASE_URL } from './env';
import { alternativeWhy, getAlternatives, MAX_ALTERNATIVES, MIN_ALTERNATIVES } from './related';
import { MY_STACK_MAX, stackHref } from './stack-link';
import type { Agent } from './types';

function listing(slug: string, overrides: Partial<Agent> = {}): Agent {
  const name = slug.replace(/(^|-)(\w)/g, (_, sep: string, c: string) => `${sep ? ' ' : ''}${c.toUpperCase()}`);
  return {
    id: slug,
    name,
    slug,
    description: `${name} is a listing used by the decision tests.`,
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
    accessMethods: ['mcp'],
    ...overrides,
  };
}

const retired = new Map([['gone', 'Gone Tool']]);
const none = new Map<string, string>();

function body<T>(decision: { ok: true; body: T } | { ok: false }): T {
  if (!decision.ok) throw new Error('expected an answer, got a refusal');
  return decision.body;
}

describe('compareDecision', () => {
  it("answers a curated set with its page, its intro and the compare page's table, each value by slug", async () => {
    const catalog = await getEveryAgent();
    const curated = curatedComparisons(catalog)[0];
    const answer = body(compareDecision(curated.items, catalog, none));
    expect(answer.title).toBe(compareTitle(curated.agents));
    expect(answer.url).toBe(`${BASE_URL}${pairPath(curated.items)}`);
    expect(answer.intro).toBe(curated.intro);
    expect(answer.notes).toEqual([]);

    const facts = factLines(curated.agents);
    expect(answer.agents.map((a) => [a.slug, a.authType, a.setsApart])).toEqual(
      curated.agents.map((a, i) => [a.slug, a.authType, facts[i]])
    );
    const rows = compareRows(curated.agents);
    expect(answer.rows.map((r) => r.key)).toEqual(rows.map((r) => r.key));
    for (const [i, row] of rows.entries()) {
      expect(answer.rows[i].same, row.key).toBe(row.same);
      expect(answer.rows[i].values, row.key).toEqual(Object.fromEntries(curated.items.map((slug, j) => [slug, row.values[j]])));
    }
  });

  it('keeps the order asked for and still finds the curated page for the same listings', async () => {
    const catalog = await getEveryAgent();
    const curated = curatedComparisons(catalog)[0];
    const reversed = [...curated.items].reverse();
    const answer = body(compareDecision(reversed, catalog, none));
    expect(answer.agents.map((a) => a.slug)).toEqual(reversed);
    expect(answer.url).toBe(`${BASE_URL}${pairPath(curated.items)}`);
    expect(answer.intro).toBe(curated.intro);
  });

  it('links any other mix to /compare, with no intro, and says what it left out', () => {
    const catalog = ['one', 'two', 'three', 'four'].map((slug) => listing(slug));
    const answer = body(compareDecision(['One', 'two', 'one', 'gone', 'nope', 'three', 'four'], catalog, retired));
    expect(answer.agents.map((a) => a.slug)).toEqual(['one', 'two', 'three']);
    expect(answer.url).toBe(`${BASE_URL}${compareHref(['one', 'two', 'three'])}`);
    expect(answer.intro).toBeNull();
    expect(answer.notes).toEqual([
      'One was named twice; it is shown once.',
      'Gone Tool is no longer listed, so it is left out.',
      '“nope” isn’t a listing in the directory, so it is left out.',
      'Four is left out: a comparison shows up to 3.',
    ]);
  });

  it("refuses one listing, naming listings to put beside it from its alternatives", async () => {
    const catalog = await getEveryAgent();
    const first = curatedComparisons(catalog)[0].agents[0];
    const refusal = compareDecision([first.slug, 'nope'], catalog, none);
    const suggested = compareSuggestions([first], catalog).map((a) => a.slug);
    expect(suggested.length).toBeGreaterThan(0);
    expect(refusal).toMatchObject({
      ok: false,
      status: 400,
      error: 'too_few_listings',
      message: `Name 2 or 3 listings to compare; only ${first.name} was found. “nope” isn’t a listing in the directory, so it is left out. Listings to put beside it: ${suggested.join(', ')}.`,
    });
    if (refusal.ok) return;
    expect(refusal.extra?.notes).toEqual(['“nope” isn’t a listing in the directory, so it is left out.']);
    expect((refusal.extra?.suggestions as Agent[]).map((a) => [a.slug, a.authType])).toEqual(
      compareSuggestions([first], catalog).map((a) => [a.slug, a.authType])
    );
  });

  it('refuses none found, or one with nothing to put beside it', () => {
    const lone = listing('lone');
    expect(compareDecision([], [lone], none)).toMatchObject({
      ok: false,
      message: 'Name 2 or 3 listings to compare. Search the directory for their slugs first.',
      extra: { notes: [], suggestions: [] },
    });
    expect(compareDecision(['lone', 'lone'], [lone], none)).toMatchObject({
      ok: false,
      message:
        'Name 2 or 3 listings to compare; only Lone was found. Lone was named twice; it is shown once. None of its alternatives is listed; search the directory for another.',
    });
  });
});

describe('alternativesDecision', () => {
  it("lists a listing's alternatives as its page does, each with why, and links the page and a comparison", async () => {
    const catalog = await getEveryAgent();
    const agent = catalog.find((a) => getAlternatives(a, catalog).length >= MIN_ALTERNATIVES)!;
    const alternatives = getAlternatives(agent, catalog);
    const answer = body(alternativesDecision(agent.slug, catalog, none));
    expect(answer.agent).toMatchObject({ slug: agent.slug, authType: agent.authType });
    expect(answer.total).toBe(alternatives.length);
    expect(answer.url).toBe(`${BASE_URL}/agents/${agent.slug}/alternatives`);
    expect(answer.compareUrl).toBe(
      `${BASE_URL}${compareHref([agent.slug, ...alternatives.slice(0, 2).map((a) => a.agent.slug)])}`
    );
    expect(answer.basis).toBe(
      `${alternatives.length} listings in ${agent.categories[0].name} that share a way to connect with ${agent.name} and overlap on what it does, strongest match first.`
    );
    expect(answer.alternatives.map((a) => [a.slug, a.sharedAccess, a.inCommon, a.why])).toEqual(
      alternatives.map((alt) => [alt.agent.slug, alt.access, alt.keywords, alternativeWhy(alt)])
    );
  });

  it('returns at most `limit`, reads the slug in any case, and keeps the total', async () => {
    const catalog = await getEveryAgent();
    const agent = catalog.find((a) => getAlternatives(a, catalog).length >= MIN_ALTERNATIVES)!;
    const all = body(alternativesDecision(agent.slug, catalog, none));
    const two = body(alternativesDecision(` ${agent.slug.toUpperCase()} `, catalog, none, 2));
    expect(two.alternatives.map((a) => a.slug)).toEqual(all.alternatives.slice(0, 2).map((a) => a.slug));
    expect(two.total).toBe(all.total);
    expect(all.alternatives.length).toBeLessThanOrEqual(MAX_ALTERNATIVES);
  });

  it('has no page link for a listing with too few alternatives for one, and still a comparison', async () => {
    const catalog = await getEveryAgent();
    const agent = catalog.find((a) => {
      const n = getAlternatives(a, catalog).length;
      return n > 0 && n < MIN_ALTERNATIVES;
    })!;
    const answer = body(alternativesDecision(agent.slug, catalog, none));
    expect(answer.url).toBeNull();
    expect(answer.compareUrl).toMatch(new RegExp(`^${BASE_URL}/compare\\?a=${agent.slug}&b=`));
  });

  it('says so when a listing has no close alternative', () => {
    const lone = listing('lone', { categories: [{ id: 'data', name: 'Data', slug: 'data', sortOrder: 1 }] });
    expect(body(alternativesDecision('lone', [lone], none))).toMatchObject({
      total: 0,
      url: null,
      compareUrl: null,
      basis: 'No listing is a close alternative to Lone: none in Data shares a way to connect with it and enough of what it does.',
      alternatives: [],
    });
  });

  it('is a 404 for an unknown slug, and names a listing that has left', () => {
    expect(alternativesDecision('nope', [listing('lone')], retired)).toEqual({
      ok: false,
      status: 404,
      error: 'not_found',
      message: 'No agent with slug "nope". Search the directory first, then retry with a returned slug.',
    });
    expect(alternativesDecision('gone', [listing('lone')], retired)).toMatchObject({
      status: 404,
      message:
        'Gone Tool is no longer listed in the directory, so it has no alternatives here. Search the directory for tools that do the same job.',
    });
  });
});

describe('bundleDecision', () => {
  const hosted = listing('hosted', { mcpEndpoint: 'https://mcp.example.com/mcp', authType: 'oauth2' });
  const local = listing('local', { mcpCommand: 'npx -y @example/mcp@latest', authType: 'none' });
  const guided = listing('guided', { quickstartUrl: 'https://docs.example.com/mcp' });
  const cli = listing('cli-only', { accessMethods: ['cli'], install: { type: 'npm', command: 'npm i -g example' } });
  const catalog = [hosted, local, guided, cli];

  it('answers in the order asked, with the config, the stack link and how each connects', () => {
    const answer = body(bundleDecision(['guided', 'hosted', 'cli-only', 'local'], catalog, none));
    expect(answer.summary).toBe('2 in the config, 1 to set up from its guide and 1 without an MCP server');
    expect(answer.stackUrl).toBe(`${BASE_URL}${stackHref(['guided', 'hosted', 'cli-only', 'local'])}`);
    expect(answer.config).toEqual({
      mcpServers: {
        hosted: { url: 'https://mcp.example.com/mcp' },
        local: { command: 'npx', args: ['-y', '@example/mcp@latest'] },
      },
    });
    expect(answer.claudeCode).toHaveLength(2);
    expect(answer.setupPrompt).toBe(
      'Connect Guided as an MCP server, following its setup instructions at https://docs.example.com/mcp'
    );
    expect(answer.items.map((i) => [i.slug, i.authType, i.how])).toEqual([
      ['guided', 'apiKey', 'guide'],
      ['hosted', 'oauth2', 'config'],
      ['cli-only', 'apiKey', 'other'],
      ['local', 'none', 'config'],
    ]);
    expect(answer.items[1]).toMatchObject({ server: { url: 'https://mcp.example.com/mcp' }, docsUrl: 'https://example.com/hosted' });
    expect(answer.notes).toEqual([]);
  });

  it('leaves out unknown, repeated and no-longer-listed slugs with a note, and keeps them out of the stack link', () => {
    const answer = body(bundleDecision(['hosted', 'nope', 'hosted', 'gone', 'local'], catalog, retired));
    expect(answer.items.map((i) => i.slug)).toEqual(['hosted', 'local']);
    expect(answer.stackUrl).toBe(`${BASE_URL}${stackHref(['hosted', 'local'])}`);
    expect(answer.notes).toEqual([
      '“nope” isn’t a listing in the directory, so it is left out.',
      'Hosted was named twice; it is shown once.',
      'Gone Tool is no longer listed, so it is left out.',
    ]);
  });

  it(`holds up to ${MY_STACK_MAX} listings`, () => {
    const many = Array.from({ length: MY_STACK_MAX + 2 }, (_, i) => listing(`tool-${i}`));
    const answer = body(bundleDecision(many.map((a) => a.slug), many, none));
    expect(answer.items).toHaveLength(MY_STACK_MAX);
    expect(answer.notes).toEqual([`2 more listings are left out: a stack holds up to ${MY_STACK_MAX}.`]);
  });

  it('refuses a list with no listing in the directory', () => {
    expect(bundleDecision(['nope', 'gone'], catalog, retired)).toEqual({
      ok: false,
      status: 400,
      error: 'no_listings',
      message:
        'Name 1 to 10 listings by slug. “nope” isn’t a listing in the directory, so it is left out. Gone Tool is no longer listed, so it is left out. Search the directory for their slugs first.',
      extra: {
        notes: ['“nope” isn’t a listing in the directory, so it is left out.', 'Gone Tool is no longer listed, so it is left out.'],
      },
    });
    expect(bundleDecision([], catalog, none)).toMatchObject({
      error: 'no_listings',
      message: 'Name 1 to 10 listings by slug. Search the directory for their slugs first.',
    });
  });
});
