import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import { cleanStackTitle, isListingSlug, MY_STACK_MAX, STACK_TITLE_MAX, stackHref, stackQuery } from './stack-link';

describe('isListingSlug', () => {
  it('accepts every listing in the directory, so any of them can be kept', async () => {
    const rejected = (await getEveryAgent()).map((a) => a.slug).filter((slug) => !isListingSlug(slug));
    expect(rejected).toEqual([]);
  });

  it('rejects what no listing file is named', () => {
    for (const value of ['', '-figma', 'Figma', 'figma mcp', 'figma/mcp', '../etc', '<b>', 'a'.repeat(82)]) {
      expect(isListingSlug(value), value).toBe(false);
    }
    expect(isListingSlug('1password')).toBe(true);
  });
});

describe('cleanStackTitle', () => {
  it('makes one line of whatever whitespace it holds', () => {
    expect(cleanStackTitle('  From design\n\tto   production ')).toBe('From design to production');
  });

  it('drops control and text-direction characters', () => {
    expect(cleanStackTitle('Ship\u0000 it')).toBe('Ship it');
    expect(cleanStackTitle('\u202eevil\u202c tools\u200f')).toBe('evil tools');
  });

  it('drops a title that holds a web address', () => {
    expect(cleanStackTitle('Free credits at https://example.com')).toBe('');
    expect(cleanStackTitle('go to www.example.com')).toBe('');
    expect(cleanStackTitle('data://x')).toBe('');
  });

  it(`keeps at most ${STACK_TITLE_MAX} characters, counting an emoji as one`, () => {
    expect(cleanStackTitle('é'.repeat(80))).toBe('é'.repeat(STACK_TITLE_MAX));
    expect([...cleanStackTitle('🚀'.repeat(80))]).toHaveLength(STACK_TITLE_MAX);
    expect(cleanStackTitle(`${'a'.repeat(STACK_TITLE_MAX - 1)} b`)).toBe('a'.repeat(STACK_TITLE_MAX - 1));
  });

  it('is empty for anything but text', () => {
    for (const value of [undefined, null, 3, ['a'], { title: 'a' }]) expect(cleanStackTitle(value)).toBe('');
    expect(cleanStackTitle(' \n ')).toBe('');
  });
});

describe('stackHref', () => {
  it('names the listings in order, then the title', () => {
    expect(stackHref(['figma-mcp-server', 'linear'])).toBe('/stack?items=figma-mcp-server,linear');
    expect(stackHref(['linear'], 'Ship it & go')).toBe('/stack?items=linear&title=Ship%20it%20%26%20go');
    expect(stackQuery(['linear'], 'Ship it')).toBe('items=linear&title=Ship%20it');
  });

  it('leaves out a title that cleans to nothing', () => {
    expect(stackHref(['linear'], '   ')).toBe('/stack?items=linear');
    expect(stackHref(['linear'], 'see https://example.com')).toBe('/stack?items=linear');
  });

  it(`keeps the first ${MY_STACK_MAX} listings`, () => {
    const slugs = Array.from({ length: MY_STACK_MAX + 2 }, (_, i) => `tool-${i}`);
    expect(stackHref(slugs)).toBe(`/stack?items=${slugs.slice(0, MY_STACK_MAX).join(',')}`);
  });
});
