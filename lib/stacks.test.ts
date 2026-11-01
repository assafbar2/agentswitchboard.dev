import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import { getDropSchedule } from './drops';
import {
  getStack,
  getStacks,
  STACK_MAX_ITEMS,
  STACK_MIN_ITEMS,
  stackAccessMethods,
  stackEntries,
  stackForDrop,
  stackOfTheWeek,
  stackProblems,
  stackSections,
  stacksInOrder,
  type Stack,
} from './stacks';
import type { Agent } from './types';

function stack(slug: string, items: string[], week?: string): Stack {
  return { slug, title: slug, promise: `${slug} promise`, ...(week ? { week } : {}), items: items.map((s) => ({ slug: s, why: `why ${s}` })) };
}

function agent(slug: string): Agent {
  return { slug, name: slug } as Agent;
}

describe('stack of the week', () => {
  const stacks = [
    stack('standing', ['a', 'b']),
    stack('older', ['a', 'b'], '2026-10-17'),
    stack('newest', ['a', 'b'], '2026-10-31'),
    stack('middle', ['a', 'b'], '2026-10-24'),
  ];

  it('is the stack of the newest drop that has one, wherever it sits in the file', () => {
    expect(stackOfTheWeek(stacks)?.slug).toBe('newest');
    expect(stackOfTheWeek([stack('standing', ['a', 'b'])])).toBeNull();
    expect(stackOfTheWeek([])).toBeNull();
  });

  it('belongs to its drop only', () => {
    expect(stackForDrop(stacks, '2026-10-24')?.slug).toBe('middle');
    expect(stackForDrop(stacks, '2026-10-10')).toBeNull();
  });

  it('leads /stacks, then the stacks with no week in file order, then earlier weeks newest first', () => {
    const more = [...stacks, stack('standing-2', ['a', 'b'])];
    const { week, standing, earlier } = stackSections(more);
    expect(week?.slug).toBe('newest');
    expect(standing.map((s) => s.slug)).toEqual(['standing', 'standing-2']);
    expect(earlier.map((s) => s.slug)).toEqual(['middle', 'older']);
    expect(stacksInOrder(more).map((s) => s.slug)).toEqual(['newest', 'standing', 'standing-2', 'middle', 'older']);
  });
});

describe('stackEntries', () => {
  it("keeps the stack's order and leaves out a slug that is no longer listed", () => {
    const entries = stackEntries(stack('s', ['c', 'gone', 'a']), [agent('a'), agent('b'), agent('c')]);
    expect(entries.map((e) => [e.agent.slug, e.why])).toEqual([
      ['c', 'why c'],
      ['a', 'why a'],
    ]);
  });
});

describe('stackAccessMethods', () => {
  it("lists the methods the stack's listings offer between them, in the site's order", () => {
    const entries = [['cli', 'mcp'], ['api'], ['mcp']].map((methods) => ({
      agent: { accessMethods: methods } as Agent,
      why: '',
    }));
    expect(stackAccessMethods(entries)).toEqual(['api', 'mcp', 'cli']);
  });
});

describe('stackProblems', () => {
  const published = new Set(['a', 'b', 'c']);
  const drops = [
    { date: '2026-10-31', added: [{ slug: 'a' }] },
    { date: '2026-10-24', added: [{ slug: 'b' }, { slug: 'c' }] },
  ];

  it('accepts stacks of published listings with weeks that are drops', () => {
    expect(stackProblems([stack('one', ['a', 'b'], '2026-10-31'), stack('two', ['b', 'c'])], published, drops)).toEqual([]);
  });

  it('rejects a stack of the week with nothing its drop added', () => {
    expect(stackProblems([stack('one', ['b', 'c'], '2026-10-31')], published, drops)).toEqual([
      'one: the 2026-10-31 drop added none of its listings; a stack of the week needs at least one',
    ]);
  });

  it('rejects an item that is not a published listing, or one listed twice', () => {
    expect(stackProblems([stack('one', ['a', 'archived', 'a'])], published, drops)).toEqual([
      'one: "archived" is not a published listing',
      'one: "a" is listed twice',
    ]);
  });

  it('rejects a repeated stack slug', () => {
    expect(stackProblems([stack('one', ['a', 'b']), stack('one', ['b', 'c'])], published, drops)).toEqual([
      'duplicate stack slug "one"',
    ]);
  });

  it('rejects a week that is not a drop, and a second stack for one drop', () => {
    expect(
      stackProblems(
        [stack('one', ['a', 'b'], '2026-10-30'), stack('two', ['a', 'b'], '2026-10-31'), stack('three', ['a', 'c'], '2026-10-31')],
        published,
        drops
      )
    ).toEqual([
      'one: week "2026-10-30" is not a drop; use a date from /drops (lib/drops.ts)',
      'three: the 2026-10-31 drop already has a stack of the week, "two"',
    ]);
  });
});

describe('content/stacks.json', () => {
  it('has no problems against the catalog and the drops', async () => {
    const catalog = await getEveryAgent();
    expect(stackProblems(getStacks(), new Set(catalog.map((a) => a.slug)), getDropSchedule().drops)).toEqual([]);
  });

  it('has a stack of the week for the homepage', () => {
    expect(stackOfTheWeek(getStacks())).not.toBeNull();
  });

  it('keeps every stack between the item limits, each item with its reason', async () => {
    const catalog = await getEveryAgent();
    for (const s of getStacks()) {
      expect(s.items.length, s.slug).toBeGreaterThanOrEqual(STACK_MIN_ITEMS);
      expect(s.items.length, s.slug).toBeLessThanOrEqual(STACK_MAX_ITEMS);
      expect(stackEntries(s, catalog), s.slug).toHaveLength(s.items.length);
      expect(getStack(s.slug)).toEqual(s);
    }
    expect(getStack('no-such-stack')).toBeNull();
  });
});
