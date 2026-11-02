import { describe, expect, it } from 'vitest';
import {
  entrySlug,
  extraText,
  listedAgents,
  requestedStackSlugs,
  sharedStack,
  sharedStackNoteText,
  sharedStackPath,
} from './shared-stack';
import { MY_STACK_MAX } from './stack-link';
import type { Agent } from './types';

function makeAgent(slug: string, name = slug.toUpperCase()): Agent {
  return {
    id: slug,
    name,
    slug,
    description: `${name} does one thing.`,
    providerName: name,
    providerUrl: `https://${slug}.example`,
    agentUrl: `https://${slug}.example`,
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
    accessMethods: ['mcp'],
  };
}

const catalog = ['linear', 'figma', 'github-mcp', ...Array.from({ length: MY_STACK_MAX + 2 }, (_, i) => `tool-${i}`)].map((s) =>
  makeAgent(s)
);
const retired = new Map([['midjourney', 'Midjourney']]);

describe('requestedStackSlugs', () => {
  it('splits the items on commas, in order, trimmed and lowercased', () => {
    expect(requestedStackSlugs(' Linear, figma ,,GitHub-MCP ')).toEqual(['linear', 'figma', 'github-mcp']);
    expect(requestedStackSlugs(['linear,figma', 'linear'])).toEqual(['linear', 'figma', 'linear']);
    expect(requestedStackSlugs(undefined)).toEqual([]);
    expect(requestedStackSlugs('')).toEqual([]);
  });

  it(`reads no more than ${3 * MY_STACK_MAX} of them`, () => {
    expect(requestedStackSlugs(Array.from({ length: 100 }, (_, i) => `t${i}`).join(','))).toHaveLength(3 * MY_STACK_MAX);
  });
});

describe('sharedStack', () => {
  it("keeps the link's order, each listing once, and notes what it leaves out", () => {
    const stack = sharedStack(['figma', 'linear', 'nope', 'figma', 'bad slug!', 'linear'], '  Design  to code ', catalog, retired);
    expect(stack.entries.map(entrySlug)).toEqual(['figma', 'linear']);
    expect(stack.title).toBe('Design to code');
    expect(stack.notes).toEqual([
      { slug: 'nope', kind: 'unknown' },
      { slug: 'figma', kind: 'duplicate', name: 'FIGMA' },
      { slug: '', kind: 'unknown' },
      { slug: 'linear', kind: 'duplicate', name: 'LINEAR' },
    ]);
    expect(stack.extra).toBe(0);
  });

  it('keeps a listing that has left the directory in its place, by name', () => {
    const stack = sharedStack(['linear', 'midjourney', 'figma'], '', catalog, retired);
    expect(stack.entries).toEqual([{ agent: catalog[0] }, { retired: { slug: 'midjourney', name: 'Midjourney' } }, { agent: catalog[1] }]);
    expect(listedAgents(stack).map((a) => a.slug)).toEqual(['linear', 'figma']);
    expect(sharedStackPath(stack)).toBe('/stack?items=linear,midjourney,figma');
  });

  it(`keeps the first ${MY_STACK_MAX} listings and counts the rest, each once`, () => {
    const requested = Array.from({ length: MY_STACK_MAX + 2 }, (_, i) => `tool-${i}`);
    const stack = sharedStack([...requested, 'tool-11'], '', catalog, retired);
    expect(stack.entries.map(entrySlug)).toEqual(requested.slice(0, MY_STACK_MAX));
    expect(stack.extra).toBe(2);
    expect(stack.notes).toEqual([]);
  });

  it('is empty, with a note per name, for a link that names no listing', () => {
    const stack = sharedStack(['nope', 'nope'], 'https://phish.example', catalog, retired);
    expect(stack).toEqual({ title: '', entries: [], notes: [{ slug: 'nope', kind: 'unknown' }], extra: 0 });
  });

  it('links what it shows: the kept listings and the cleaned title', () => {
    const stack = sharedStack(['figma', 'figma', 'nope', 'linear'], 'Ship\nit', catalog, retired);
    expect(sharedStackPath(stack)).toBe('/stack?items=figma,linear&title=Ship%20it');
  });
});

describe('what the page says', () => {
  it('names a repeat, quotes an unknown slug, and never echoes one that is not a slug', () => {
    expect(sharedStackNoteText({ slug: 'linear', kind: 'duplicate', name: 'Linear' })).toBe('Linear was named twice; it is shown once.');
    expect(sharedStackNoteText({ slug: 'nope', kind: 'unknown' })).toBe('“nope” isn’t a listing in the directory, so it is left out.');
    expect(sharedStackNoteText({ slug: '', kind: 'unknown' })).toBe('One item named no listing, so it is left out.');
  });

  it(`says how many listings past ${MY_STACK_MAX} are left out`, () => {
    expect(extraText(1)).toBe(`1 more listing is left out: a stack holds up to ${MY_STACK_MAX}.`);
    expect(extraText(4)).toBe(`4 more listings are left out: a stack holds up to ${MY_STACK_MAX}.`);
  });
});
