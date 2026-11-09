import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_STACK,
  inMyStack,
  parseMyStack,
  readMyStack,
  withItem,
  withItems,
  withMoved,
  withoutItem,
  withTitle,
  writeMyStack,
  type MyStack,
  type MyStackItem,
} from './my-stack';
import { MY_STACK_MAX, STACK_TITLE_MAX } from './stack-link';

const item = (slug: string, icon: string | null = null): MyStackItem => ({ slug, name: slug.toUpperCase(), icon });
const stackOf = (...slugs: string[]): MyStack => ({ title: '', items: slugs.map((s) => item(s)) });
const slugsOf = (stack: MyStack) => stack.items.map((i) => i.slug);
const full = stackOf(...Array.from({ length: MY_STACK_MAX }, (_, i) => `tool-${i}`));

describe('parseMyStack', () => {
  it('is empty for nothing stored, or anything that is not a stack', () => {
    for (const raw of [null, '', 'not json', 'null', '3', '"a"', '[]', '{"items":{}}']) expect(parseMyStack(raw), raw ?? 'null').toEqual(EMPTY_STACK);
  });

  it('keeps each well-formed listing once, in order, and drops the rest', () => {
    const raw = JSON.stringify({
      title: 'Mine',
      items: [
        { slug: 'linear', name: 'Linear', icon: '/icons/linear.png?v=1' },
        { slug: 'Bad Slug', name: 'Bad' },
        { slug: 'figma', name: 3 },
        null,
        { slug: 'linear', name: 'Linear again' },
        { slug: 'github-mcp', name: 'GitHub MCP' },
      ],
    });
    expect(parseMyStack(raw)).toEqual({
      title: 'Mine',
      items: [
        { slug: 'linear', name: 'Linear', icon: '/icons/linear.png?v=1' },
        { slug: 'github-mcp', name: 'GitHub MCP', icon: null },
      ],
    });
  });

  it('keeps only icons from the site', () => {
    const icons = ['https://evil.example/x.png', 'javascript:alert(1)', '//evil.example/x.png', 7];
    const parsed = parseMyStack(JSON.stringify({ items: icons.map((icon, i) => ({ slug: `tool-${i}`, name: 'T', icon })) }));
    expect(parsed.items.map((i) => i.icon)).toEqual([null, null, null, null]);
  });

  it(`keeps the first ${MY_STACK_MAX} listings, names of at most 120 characters, a title on one line`, () => {
    const items = Array.from({ length: MY_STACK_MAX + 3 }, (_, i) => ({ slug: `tool-${i}`, name: 'n'.repeat(200) }));
    const parsed = parseMyStack(JSON.stringify({ title: `Line one\nline two ${'x'.repeat(100)}`, items }));
    expect(parsed.items).toHaveLength(MY_STACK_MAX);
    expect(parsed.items[0].name).toHaveLength(120);
    expect(parsed.title.startsWith('Line one line two ')).toBe(true);
    expect(parsed.title).toHaveLength(STACK_TITLE_MAX);
  });

  it('keeps a title as typed, spaces included, so typing one is not interrupted', () => {
    expect(parseMyStack(JSON.stringify({ title: 'From ', items: [] })).title).toBe('From ');
  });
});

describe('changing a stack', () => {
  it('adds at the end, once, until the stack is full', () => {
    expect(slugsOf(withItem(stackOf('a'), item('b')))).toEqual(['a', 'b']);
    const ab = stackOf('a', 'b');
    expect(withItem(ab, item('a'))).toBe(ab);
    expect(withItem(full, item('one-more'))).toBe(full);
    expect(inMyStack(ab, 'b')).toBe(true);
    expect(inMyStack(ab, 'c')).toBe(false);
  });

  it('removes one listing, keeping the title', () => {
    expect(withoutItem({ ...stackOf('a', 'b', 'c'), title: 'T' }, 'b')).toEqual({ ...stackOf('a', 'c'), title: 'T' });
  });

  it('moves a listing one place, never past either end', () => {
    const abc = stackOf('a', 'b', 'c');
    expect(slugsOf(withMoved(abc, 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(slugsOf(withMoved(abc, 'b', 1))).toEqual(['a', 'c', 'b']);
    expect(withMoved(abc, 'a', -1)).toBe(abc);
    expect(withMoved(abc, 'c', 1)).toBe(abc);
    expect(withMoved(abc, 'z', 1)).toBe(abc);
    expect(slugsOf(abc)).toEqual(['a', 'b', 'c']);
  });

  it('sets the title on one line, at most STACK_TITLE_MAX characters', () => {
    expect(withTitle(stackOf('a'), 'Two\nlines').title).toBe('Two lines');
    expect(withTitle(stackOf('a'), 'x'.repeat(100)).title).toHaveLength(STACK_TITLE_MAX);
  });

  it('adds several in order, saying how many went in, were there already, or did not fit', () => {
    const merged = withItems(stackOf('a', 'b'), [item('b'), item('c'), item('d')]);
    expect(slugsOf(merged.stack)).toEqual(['a', 'b', 'c', 'd']);
    expect(merged).toMatchObject({ added: 2, already: 1, full: 0 });

    const nearlyFull = stackOf(...full.items.slice(1).map((i) => i.slug));
    const overflow = withItems(nearlyFull, [item('tool-1'), item('x'), item('y'), item('z')]);
    expect(slugsOf(overflow.stack).slice(-1)).toEqual(['x']);
    expect(overflow).toMatchObject({ added: 1, already: 1, full: 2 });
  });
});

describe('readMyStack and writeMyStack', () => {
  const stored = new Map<string, string>();

  beforeEach(() => {
    stored.clear();
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
      removeItem: (key: string) => void stored.delete(key),
    });
  });

  afterEach(() => {
    writeMyStack(EMPTY_STACK);
    vi.unstubAllGlobals();
  });

  it('stores the stack, tells every listener, and reads back the same object until it changes', () => {
    const changed = vi.fn();
    window.addEventListener('my-stack-change', changed);
    writeMyStack(stackOf('a', 'b'));
    expect(changed).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stored.get('my-stack')!)).toEqual(stackOf('a', 'b'));

    const read = readMyStack();
    expect(read).toEqual(stackOf('a', 'b'));
    expect(readMyStack()).toBe(read);
    writeMyStack(withItem(read, item('c')));
    expect(readMyStack()).not.toBe(read);
    expect(slugsOf(readMyStack())).toEqual(['a', 'b', 'c']);
  });

  it('removes the key once the stack holds nothing', () => {
    writeMyStack(stackOf('a'));
    writeMyStack(EMPTY_STACK);
    expect(stored.has('my-stack')).toBe(false);
    expect(readMyStack()).toEqual(EMPTY_STACK);
  });

  it('keeps the stack for this page when the browser refuses storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    });
    writeMyStack(stackOf('a'));
    expect(slugsOf(readMyStack())).toEqual(['a']);
  });
});
