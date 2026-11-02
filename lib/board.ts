/**
 * The Switchboard (/switchboard): every listing as a jack on one board, in a
 * panel for its primary category. Official listings are filled in, and the
 * newest drop's additions are lit. The page draws each panel as rows of
 * PANEL_COLUMNS jacks; the share card stands the panels side by side, as
 * cardBoard places them.
 *
 * The toggles work like the change log's filters (lib/log-filter.ts): every
 * jack is in the HTML, and a choice kept in ?category=&week= dims the rest
 * with one style rule.
 */

import type { Drop } from './drops';
import type { Agent, Category } from './types';
import { formatDay, formatNumber, pluralize } from './utils';

export interface BoardJack {
  slug: string;
  name: string;
  provider: string;
  access: Agent['accessMethods'];
  official: boolean;
  /** Added in the newest drop. */
  lit: boolean;
}

export interface BoardPanel {
  /** The category's slug and name. */
  slug: string;
  name: string;
  /** Oldest listing first, so each panel ends with its newest jacks. */
  jacks: BoardJack[];
}

export interface Board {
  /** In the categories' order, leaving out a category no listing has first. */
  panels: BoardPanel[];
  /** The newest drop's date, whose additions are lit; null before the first drop. */
  drop: string | null;
  listings: number;
  official: number;
  lit: number;
}

export function boardOf(catalog: readonly Agent[], categories: readonly Category[], drop: Drop | null): Board {
  const added = new Set(drop?.added.map((item) => item.slug));
  const byCategory = new Map<string, Agent[]>();
  for (const agent of catalog) {
    const slug = agent.categories[0].slug;
    byCategory.set(slug, [...(byCategory.get(slug) ?? []), agent]);
  }

  const panels = categories.flatMap((category) => {
    const agents = byCategory.get(category.slug) ?? [];
    if (agents.length === 0) return [];
    const jacks = [...agents]
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.name.localeCompare(b.name))
      .map((agent) => ({
        slug: agent.slug,
        name: agent.name,
        provider: agent.providerName,
        access: agent.accessMethods,
        official: agent.official,
        lit: added.has(agent.slug),
      }));
    return [{ slug: category.slug, name: category.name, jacks }];
  });

  const jacks = panels.flatMap((p) => p.jacks);
  return {
    panels,
    drop: drop?.date ?? null,
    listings: jacks.length,
    official: jacks.filter((j) => j.official).length,
    lit: jacks.filter((j) => j.lit).length,
  };
}

/** A board's counts without its jacks, all the toggles need. */
export interface BoardSummary {
  listings: number;
  lit: number;
  drop: string | null;
  panels: { slug: string; name: string; listings: number; lit: number }[];
}

export function boardSummary(board: Board): BoardSummary {
  return {
    listings: board.listings,
    lit: board.lit,
    drop: board.drop,
    panels: board.panels.map((p) => ({
      slug: p.slug,
      name: p.name,
      listings: p.jacks.length,
      lit: p.jacks.filter((j) => j.lit).length,
    })),
  };
}

/** "the Oct 31, 2026 drop" */
export function boardDropName(board: Pick<Board, 'drop'>): string {
  return board.drop ? `the ${formatDay(board.drop)} drop` : 'the newest drop';
}

// ── The page's panels ──────────────────────────────────────────────

/** Jacks per row in a page panel, and the distance between jack centres, in SVG units. */
export const PANEL_COLUMNS = 12;
export const JACK_PITCH = 24;
export const JACK_RADIUS = 7;

export function panelSize(jacks: number): { width: number; height: number } {
  return { width: PANEL_COLUMNS * JACK_PITCH, height: Math.max(1, Math.ceil(jacks / PANEL_COLUMNS)) * JACK_PITCH };
}

/** The centre of jack `i` in a page panel. */
export function jackCenter(i: number): { x: number; y: number } {
  return {
    x: (i % PANEL_COLUMNS) * JACK_PITCH + JACK_PITCH / 2,
    y: Math.floor(i / PANEL_COLUMNS) * JACK_PITCH + JACK_PITCH / 2,
  };
}

/** The lit jacks light one after another over this long when the page opens, unless the visitor asks for reduced motion. */
export const LIGHT_UP_MS = 1800;

/** When the `k`th of `lit` lit jacks, in board order, lights up. */
export function lightDelay(k: number, lit: number): number {
  return Math.round((k * LIGHT_UP_MS) / Math.max(1, lit));
}

// ── Toggles ────────────────────────────────────────────────────────

export interface BoardFilter {
  /** A category slug, or '' for the whole board. */
  category: string;
  /** Only the newest drop's jacks stay bright. */
  week: boolean;
}

/** The filter a URL asks for; an unknown category is ignored, so a stale link shows the whole board. */
export function parseBoardFilter(params: URLSearchParams, categories: readonly string[]): BoardFilter {
  const category = params.get('category');
  return { category: category && categories.includes(category) ? category : '', week: params.get('week') === '1' };
}

/** `search` with the filter in it, other parameters kept. */
export function boardFilterSearch(search: string, { category, week }: BoardFilter): string {
  const params = new URLSearchParams(search);
  if (category) params.set('category', category);
  else params.delete('category');
  if (week) params.set('week', '1');
  else params.delete('week');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** The style rules that dim what a filter leaves out on board `boardId`. Values come from parseBoardFilter. */
export function boardFilterRules(boardId: string, { category, week }: BoardFilter): string {
  return [
    category && `#${boardId} > [data-cat]:not([data-cat="${category}"]) { opacity: 0.25; }`,
    week && `#${boardId} svg a:not(.l) { opacity: 0.15; }`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** What a filter leaves bright, for the line under the toggles. */
export function boardStatus(summary: BoardSummary, { category, week }: BoardFilter): string {
  const drop = boardDropName(summary);
  const panel = summary.panels.find((p) => p.slug === category);
  if (!panel) {
    return week
      ? `${formatNumber(summary.lit)} ${pluralize(summary.lit, 'listing')} added in ${drop}.`
      : `All ${formatNumber(summary.listings)} listings.`;
  }
  const { name, listings, lit } = panel;
  if (week) {
    return lit === 0
      ? `Nothing in ${name} was added in ${drop}.`
      : `${name}: ${formatNumber(lit)} ${pluralize(lit, 'listing')} added in ${drop}.`;
  }
  return `${name}: ${formatNumber(listings)} ${pluralize(listings, 'listing')}${lit > 0 ? `, ${formatNumber(lit)} of them added in ${drop}` : ''}.`;
}

// ── The share card's board ─────────────────────────────────────────

/** A panel's jacks, one character each: "o" Official, "l" lit, "b" both, "-" neither. */
export function panelCode(panel: BoardPanel): string {
  return panel.jacks.map((j) => (j.official ? (j.lit ? 'b' : 'o') : j.lit ? 'l' : '-')).join('');
}

export interface CardJack {
  /** The jack's centre, in px. */
  x: number;
  y: number;
  official: boolean;
  lit: boolean;
}

export interface CardBoard {
  /** Distance between jack centres, in px. */
  pitch: number;
  jacks: CardJack[];
}

const CARD_PITCHES = { max: 28, min: 4 };

/**
 * The share card's board: each panel (a panelCode) a block of columns, the
 * blocks side by side with a half-pitch gap and centred across `width`, at
 * the biggest whole-pixel pitch at which every block fits `height`. Each
 * block fills row by row, oldest jack first, like a page panel.
 */
export function cardBoard(panels: readonly string[], width: number, height: number): CardBoard {
  let pitch = CARD_PITCHES.max;
  while (pitch > CARD_PITCHES.min && blocksAt(panels, pitch, height).used > width) pitch--;
  const { columns, gap, used } = blocksAt(panels, pitch, height);

  const jacks: CardJack[] = [];
  let left = Math.max(0, Math.floor((width - used) / 2));
  panels.forEach((code, p) => {
    [...code].forEach((c, i) => {
      jacks.push({
        x: left + (i % columns[p]) * pitch + pitch / 2,
        y: Math.floor(i / columns[p]) * pitch + pitch / 2,
        official: c === 'o' || c === 'b',
        lit: c === 'l' || c === 'b',
      });
    });
    left += columns[p] * pitch + gap;
  });
  return { pitch, jacks };
}

function blocksAt(panels: readonly string[], pitch: number, height: number) {
  const rows = Math.max(1, Math.floor(height / pitch));
  const gap = Math.round(pitch / 2);
  const columns = panels.map((code) => Math.ceil(code.length / rows));
  return { columns, gap, used: columns.reduce((sum, c) => sum + c * pitch, 0) + gap * (panels.length - 1) };
}
