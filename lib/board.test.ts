import { describe, expect, it } from 'vitest';
import {
  boardDropName,
  boardFilterRules,
  boardFilterSearch,
  boardOf,
  boardStatus,
  boardSummary,
  cardBoard,
  jackCenter,
  JACK_PITCH,
  LIGHT_UP_MS,
  lightDelay,
  PANEL_COLUMNS,
  panelCode,
  panelSize,
  parseBoardFilter,
} from './board';
import { getAllCategories, getEveryAgent } from './catalog';
import { getDropSchedule, type Drop } from './drops';
import type { Agent, Category } from './types';

const cat = (slug: string, sortOrder: number): Category => ({ id: slug, name: slug.toUpperCase(), slug, sortOrder });
const CATEGORIES = [cat('first', 1), cat('second', 2), cat('empty', 3)];

function makeAgent(slug: string, overrides: Partial<Agent> = {}): Agent {
  return {
    id: slug,
    name: slug,
    slug,
    description: '',
    providerName: `${slug} Inc`,
    providerUrl: 'https://example.com',
    agentUrl: 'https://example.com',
    categories: [CATEGORIES[0]],
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
    accessMethods: ['api'],
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function dropOf(date: string, slugs: string[]): Drop {
  return { date, days: [date], added: slugs.map((slug) => ({ slug, name: slug, date, notes: [] })), updated: [], removed: [] };
}

const CATALOG = [
  makeAgent('zeta', { createdAt: '2026-10-31T09:00:00.000Z' }),
  makeAgent('alpha', { official: true }),
  makeAgent('beta'),
  makeAgent('gamma', { categories: [CATEGORIES[1], CATEGORIES[0]], accessMethods: ['mcp', 'cli'], official: true }),
  makeAgent('delta', { categories: [CATEGORIES[1]], createdAt: '2026-08-01T00:00:00.000Z' }),
];
const BOARD = boardOf(CATALOG, CATEGORIES, dropOf('2026-10-31', ['zeta', 'gamma', 'gone']));

describe('boardOf', () => {
  it('puts each listing once, in its primary category, the categories in order and empty ones left out', () => {
    expect(BOARD.panels.map((p) => [p.slug, p.name, p.jacks.map((j) => j.slug)])).toEqual([
      ['first', 'FIRST', ['alpha', 'beta', 'zeta']],
      ['second', 'SECOND', ['delta', 'gamma']],
    ]);
  });

  it('orders a panel oldest first, then by name, so the newest jacks end it', () => {
    expect(BOARD.panels[0].jacks.map((j) => j.slug)).toEqual(['alpha', 'beta', 'zeta']);
    expect(BOARD.panels[1].jacks.map((j) => j.slug)).toEqual(['delta', 'gamma']);
  });

  it("lights the drop's additions that are still listed, and counts what it shows", () => {
    expect(BOARD.panels.flatMap((p) => p.jacks).filter((j) => j.lit).map((j) => j.slug)).toEqual(['zeta', 'gamma']);
    expect(BOARD).toMatchObject({ drop: '2026-10-31', listings: 5, official: 2, lit: 2 });
    expect(BOARD.panels[1].jacks[1]).toEqual({
      slug: 'gamma',
      name: 'gamma',
      provider: 'gamma Inc',
      access: ['mcp', 'cli'],
      official: true,
      lit: true,
    });
  });

  it('lights nothing before the first drop', () => {
    const board = boardOf(CATALOG, CATEGORIES, null);
    expect(board).toMatchObject({ drop: null, lit: 0 });
    expect(boardDropName(board)).toBe('the newest drop');
    expect(boardDropName(BOARD)).toBe('the Oct 31, 2026 drop');
  });

  it('holds every published listing once on the real catalog, lit by the newest drop', async () => {
    const catalog = await getEveryAgent();
    const drop = getDropSchedule().drops[0];
    const board = boardOf(catalog, await getAllCategories(), drop);
    const slugs = board.panels.flatMap((p) => p.jacks.map((j) => j.slug));
    expect(slugs).toHaveLength(catalog.length);
    expect(new Set(slugs).size).toBe(catalog.length);
    const listed = new Set(catalog.map((a) => a.slug));
    expect(board.lit).toBe(drop.added.filter((item) => listed.has(item.slug)).length);
  });
});

describe('page panels', () => {
  it('lay jacks out in rows of PANEL_COLUMNS', () => {
    expect(panelSize(1)).toEqual({ width: PANEL_COLUMNS * JACK_PITCH, height: JACK_PITCH });
    expect(panelSize(PANEL_COLUMNS + 1).height).toBe(2 * JACK_PITCH);
    expect(jackCenter(0)).toEqual({ x: JACK_PITCH / 2, y: JACK_PITCH / 2 });
    expect(jackCenter(PANEL_COLUMNS)).toEqual({ x: JACK_PITCH / 2, y: JACK_PITCH * 1.5 });
  });

  it('light the lit jacks one after another within LIGHT_UP_MS', () => {
    expect(lightDelay(0, 59)).toBe(0);
    expect(lightDelay(58, 59)).toBeLessThan(LIGHT_UP_MS);
    expect(lightDelay(1, 59)).toBeGreaterThan(lightDelay(0, 59));
    expect(lightDelay(0, 0)).toBe(0);
  });
});

describe('toggles', () => {
  const slugs = ['first', 'second'];

  it('read the URL, ignoring an unknown category', () => {
    expect(parseBoardFilter(new URLSearchParams('category=second&week=1'), slugs)).toEqual({ category: 'second', week: true });
    expect(parseBoardFilter(new URLSearchParams('category=nope&week=yes'), slugs)).toEqual({ category: '', week: false });
  });

  it('write the URL, keeping other parameters', () => {
    expect(boardFilterSearch('?x=1', { category: 'first', week: true })).toBe('?x=1&category=first&week=1');
    expect(boardFilterSearch('?category=first&week=1', { category: '', week: false })).toBe('');
  });

  it('dim the other panels, or every jack the drop did not add', () => {
    expect(boardFilterRules('board', { category: '', week: false })).toBe('');
    expect(boardFilterRules('board', { category: 'first', week: false })).toBe(
      '#board > [data-cat]:not([data-cat="first"]) { opacity: 0.25; }'
    );
    expect(boardFilterRules('board', { category: '', week: true })).toBe('#board svg a:not(.l) { opacity: 0.15; }');
    expect(boardFilterRules('board', { category: 'first', week: true }).split('\n')).toHaveLength(2);
  });

  it('say what stays bright', () => {
    const summary = boardSummary(BOARD);
    expect(summary.panels).toEqual([
      { slug: 'first', name: 'FIRST', listings: 3, lit: 1 },
      { slug: 'second', name: 'SECOND', listings: 2, lit: 1 },
    ]);
    expect(boardStatus(summary, { category: '', week: false })).toBe('All 5 listings.');
    expect(boardStatus(summary, { category: '', week: true })).toBe('2 listings added in the Oct 31, 2026 drop.');
    expect(boardStatus(summary, { category: 'first', week: false })).toBe(
      'FIRST: 3 listings, 1 of them added in the Oct 31, 2026 drop.'
    );
    expect(boardStatus(summary, { category: 'first', week: true })).toBe('FIRST: 1 listing added in the Oct 31, 2026 drop.');
    const unlit = boardSummary(boardOf(CATALOG, CATEGORIES, dropOf('2026-10-31', ['zeta'])));
    expect(boardStatus(unlit, { category: 'second', week: false })).toBe('SECOND: 2 listings.');
    expect(boardStatus(unlit, { category: 'second', week: true })).toBe('Nothing in SECOND was added in the Oct 31, 2026 drop.');
  });
});

describe('the share card board', () => {
  it('codes each jack by how it is drawn', () => {
    expect(BOARD.panels.map(panelCode)).toEqual(['o-l', '-b']);
  });

  function check(panels: string[], width: number, height: number) {
    const { pitch, jacks } = cardBoard(panels, width, height);
    expect(jacks).toHaveLength(panels.join('').length);
    for (const { x, y } of jacks) {
      expect(x - pitch / 2).toBeGreaterThanOrEqual(0);
      expect(x + pitch / 2).toBeLessThanOrEqual(width);
      expect(y + pitch / 2).toBeLessThanOrEqual(height);
    }
    expect(new Set(jacks.map(({ x, y }) => `${x},${y}`)).size).toBe(jacks.length);
    return pitch;
  }

  it("fits today's board at the biggest pitch that fits, each panel a block of its own", async () => {
    const board = boardOf(await getEveryAgent(), await getAllCategories(), getDropSchedule().drops[0]);
    const panels = board.panels.map(panelCode);
    const pitch = check(panels, 1072, 318);
    expect(pitch).toBeGreaterThanOrEqual(12);
    expect(check(panels, 1072, 318 + pitch * 4)).toBeGreaterThan(pitch);

    const { jacks } = cardBoard(panels, 1072, 318);
    let at = 0;
    const blocks = panels.map((code) => {
      const xs = jacks.slice(at, (at += code.length)).map((j) => j.x);
      return [Math.min(...xs), Math.max(...xs)];
    });
    for (let i = 1; i < blocks.length; i++) expect(blocks[i][0]).toBeGreaterThan(blocks[i - 1][1]);
  });

  it('still fits a board several times bigger, at a smaller pitch', () => {
    const big = Array.from({ length: 30 }, (_, i) => '-'.repeat(40 + i * 7));
    expect(check(big, 1072, 318)).toBeLessThan(12);
  });

  it('draws each kind of jack', () => {
    expect(cardBoard(['o-lb'], 1072, 318).jacks.map(({ official, lit }) => [official, lit])).toEqual([
      [true, false],
      [false, false],
      [false, true],
      [true, true],
    ]);
  });
});
