/**
 * Ways back from a /browse view that found nothing: which words nothing in
 * the directory uses, the query respelled, one-click removal of each word
 * or filter that brings results back, a preview of the closest matches, and
 * two categories to browse.
 */

import {
  ACCESS_METHOD_LABELS,
  browseMatches,
  narrowingWords,
  scoreAgent,
  searchAgents,
  sortAgents,
  type BrowseState,
  type SortOrder,
} from './search';
import type { Agent, Category } from './types';
import { authTypeLabel } from './utils';

/** A search word or one filter of a view. */
export interface Constraint {
  what: 'word' | 'task' | 'access' | 'category' | 'vendor' | 'official' | 'verified' | 'auth';
  /** The word, task, access method, category or vendor slug, or auth types; empty for official and verified. */
  value: string;
}

export interface Removal extends Constraint {
  /** The view without it. */
  state: BrowseState;
  count: number;
}

/**
 * Results to show right away. `spelling`: the query respelled. `closest`:
 * listings with some of a several-word query's words, most first.
 * `unfiltered`: the query without the filter that left nothing. Spelling
 * and unfiltered previews are in the view's sort order, as their full
 * results are.
 */
export type Preview =
  | { kind: 'spelling'; agents: Agent[]; state: BrowseState; total: number }
  | { kind: 'closest'; agents: Agent[] }
  | { kind: 'unfiltered'; agents: Agent[]; state: BrowseState; total: number; without: Removal };

export interface Recovery {
  /** Query words no listing uses at all. */
  unknown: string[];
  /** Single removals that bring results back: those that keep searching first, then most results. */
  removals: Removal[];
  preview?: Preview;
  categories: Category[];
}

/** Results a preview shows. */
export const PREVIEW_SIZE = 6;

/** Closest matches that pick the nearby categories. */
const NEAR_SIZE = 20;

export function recover(
  agents: Agent[],
  state: BrowseState,
  categories: Category[],
  sort: SortOrder = 'relevance'
): Recovery {
  const words = narrowingWords(state.query);
  const unknown = words.filter((w) => searchAgents(agents, w).length === 0);
  const removals = removalsOf(agents, state);

  let preview: Preview | undefined;
  let near: Agent[] = [];
  const respelled = respell(agents, state, unknown);
  if (respelled) {
    near = sortAgents(browseMatches(agents, respelled), sort);
    preview = { kind: 'spelling', agents: near.slice(0, PREVIEW_SIZE), state: respelled, total: near.length };
  } else {
    const closest = words.length > 1 ? closestMatches(agents, state, words) : [];
    const unfiltered = removals.find((r) => r.what !== 'word' && hasWords(r.state));
    if (closest.length > 0) {
      near = closest.slice(0, NEAR_SIZE);
      preview = { kind: 'closest', agents: closest.slice(0, PREVIEW_SIZE) };
    } else if (unfiltered) {
      near = sortAgents(browseMatches(agents, unfiltered.state), sort);
      preview = { kind: 'unfiltered', agents: near.slice(0, PREVIEW_SIZE), state: unfiltered.state, total: near.length, without: unfiltered };
    }
  }
  return { unknown, removals, preview, categories: nearestCategories(near, categories, state.category) };
}

/**
 * How a word or filter is named on the page: "“zzqx”", "Task: query a
 * database", "MCP", "Legal", "API Key or OAuth 2.0 auth".
 */
export function constraintLabel(c: Constraint, names: { task?: string; category?: string; vendor?: string } = {}): string {
  switch (c.what) {
    case 'word':
      return `“${c.value}”`;
    case 'task':
      return `Task: ${names.task ?? c.value}`;
    case 'access':
      return ACCESS_METHOD_LABELS[c.value] ?? c.value;
    case 'category':
      return names.category ?? c.value;
    case 'vendor':
      return names.vendor ?? c.value;
    case 'official':
      return 'Official';
    case 'verified':
      return 'Verified';
    case 'auth':
      return c.value === 'none' ? 'No auth needed' : `${c.value.split(',').map(authTypeLabel).join(' or ')} auth`;
  }
}

const hasWords = (state: BrowseState) => narrowingWords(state.query).length > 0;

// ── Removals ────────────────────────────────────────────────────────

function removalsOf(agents: Agent[], state: BrowseState): Removal[] {
  const options: Omit<Removal, 'count'>[] = narrowingWords(state.query).map((word) => {
    const rest = replaceWords(state.query, new Map([[word, '']]));
    // Filler alone ("server for") would search for the filler words.
    return { what: 'word', value: word, state: { ...state, query: hasWords({ ...state, query: rest }) ? rest : '' } };
  });
  if (state.task) options.push({ what: 'task', value: state.task.slug, state: { ...state, task: undefined } });
  for (const method of state.access) {
    options.push({ what: 'access', value: method, state: { ...state, access: state.access.filter((m) => m !== method) } });
  }
  if (state.category) options.push({ what: 'category', value: state.category, state: { ...state, category: '' } });
  if (state.vendor) options.push({ what: 'vendor', value: state.vendor, state: { ...state, vendor: '' } });
  else if (state.official) options.push({ what: 'official', value: '', state: { ...state, official: false } });
  if (state.verified) options.push({ what: 'verified', value: '', state: { ...state, verified: false } });
  if (state.auth.length > 0) options.push({ what: 'auth', value: state.auth.join(','), state: { ...state, auth: [] } });

  return (
    options
      // Without its only word and with no filters, a view is the whole directory: not a way back.
      .filter((o) => !isEverything(o.state))
      .map((o) => ({ ...o, count: browseMatches(agents, o.state).length }))
      .filter((o) => o.count > 0)
      .sort((a, b) => Number(hasWords(b.state)) - Number(hasWords(a.state)) || b.count - a.count)
  );
}

function isEverything(state: BrowseState): boolean {
  return (
    !state.query.trim() &&
    !state.task &&
    !state.category &&
    !state.official &&
    !state.vendor &&
    !state.verified &&
    state.auth.length === 0 &&
    state.access.length === 0
  );
}

// new RegExp, so the 'u'-flag syntax isn't checked against the ES2017 target.
const NOT_WORD = new RegExp('[^\\p{L}\\p{N}]+', 'u');
const HAS_WORD = new RegExp('[\\p{L}\\p{N}]', 'u');

/**
 * `query` with each whole word in `by` (any case) replaced by its value.
 * Tokens left without a letter or digit, like the quotes or "!" around a
 * removed word, are dropped: search ignores them.
 */
function replaceWords(query: string, by: Map<string, string>): string {
  let result = query;
  for (const [word, replacement] of by) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
    result = result.replace(re, (_, before: string) => before + replacement);
  }
  return result
    .split(/\s+/)
    .filter((token) => HAS_WORD.test(token))
    .join(' ')
    .replace(/^[,;|]+|[,;|]+$/g, '');
}

// ── Closest matches ─────────────────────────────────────────────────

/** Listings in the view's filters with any of `words`: most words first, then the best match. */
function closestMatches(agents: Agent[], state: BrowseState, words: string[]): Agent[] {
  return browseMatches(agents, { ...state, query: '' })
    .map((agent) => {
      const scores = words.map((w) => scoreAgent(agent, w));
      return { agent, has: scores.filter((s) => s > 0).length, score: scores.reduce((sum, s) => sum + s, 0) };
    })
    .filter(({ has }) => has > 0)
    .sort((a, b) => b.has - a.has || b.score - a.score)
    .map(({ agent }) => agent);
}

// ── Spelling ────────────────────────────────────────────────────────

/**
 * The query with each `unknown` word of 4+ letters replaced by the nearest
 * word of 4+ letters the directory does use: within one edit, two for 6+
 * letters, the most used on a tie. Shorter words are left out both ways:
 * too many words are one edit from them ("azre" is from "are"). Only
 * offered when it finds something with the same filters.
 */
function respell(agents: Agent[], state: BrowseState, unknown: string[]): BrowseState | undefined {
  const fixes = new Map<string, string>();
  for (const word of unknown) {
    const better = word.length >= 4 ? nearestWord(vocabulary(agents), word) : undefined;
    if (better) fixes.set(word, better);
  }
  if (fixes.size === 0) return undefined;
  const respelled = { ...state, query: replaceWords(state.query, fixes) };
  return browseMatches(agents, respelled).length > 0 ? respelled : undefined;
}

const vocabularies = new WeakMap<Agent[], Map<string, number>>();

/** Every word of 4+ letters in the listings' searchable text, with how many listings use it. */
function vocabulary(agents: Agent[]): Map<string, number> {
  const cached = vocabularies.get(agents);
  if (cached) return cached;
  const words = new Map<string, number>();
  const text = (s: unknown) => (typeof s === 'string' ? s : '');
  for (const a of agents) {
    // Guard against legacy string-form skills and missing fields, as search does.
    const skills = (a.skills ?? []).filter((s) => s && typeof s === 'object');
    const all = [
      text(a.name),
      text(a.providerName),
      text(a.description),
      ...(a.tags ?? []).map(text),
      ...(a.categories ?? []).map((c) => text(c.name)),
      ...skills.flatMap((s) => [text(s.name), text(s.description)]),
    ]
      .join(' ')
      .toLowerCase();
    for (const w of new Set(all.split(NOT_WORD))) {
      if (w.length >= 4 && !/^\d+$/.test(w)) words.set(w, (words.get(w) ?? 0) + 1);
    }
  }
  vocabularies.set(agents, words);
  return words;
}

function nearestWord(words: Map<string, number>, word: string): string | undefined {
  const max = word.length >= 6 ? 2 : 1;
  let best: string | undefined;
  let bestDistance = max + 1;
  let bestUses = 0;
  for (const [candidate, uses] of words) {
    if (candidate === word) continue;
    const distance = editDistance(word, candidate, max);
    if (distance < bestDistance || (distance === bestDistance && uses > bestUses)) {
      best = candidate;
      bestDistance = distance;
      bestUses = uses;
    }
  }
  return bestDistance <= max ? best : undefined;
}

/**
 * Edits between `a` and `b`: insert, delete or change a letter, or swap two
 * neighbouring ones. Anything over `max` comes back as max + 1.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let twoBack: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowBest = i;
    for (let j = 1; j <= b.length; j++) {
      let d = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, twoBack[j - 2] + 1);
      row.push(d);
      rowBest = Math.min(rowBest, d);
    }
    if (rowBest > max) return max + 1;
    twoBack = previous;
    previous = row;
  }
  return Math.min(previous[b.length], max + 1);
}

// ── Categories ──────────────────────────────────────────────────────

/**
 * The two categories most of `near` belong to, leaving out the one being
 * browsed; the largest categories fill in when `near` has fewer.
 */
function nearestCategories(near: Agent[], categories: Category[], current: string): Category[] {
  const counts = new Map<string, number>();
  for (const a of near) {
    for (const c of a.categories) if (c.slug !== current) counts.set(c.slug, (counts.get(c.slug) ?? 0) + 1);
  }
  const others = categories.filter((c) => c.slug !== current);
  const nearest = others
    .filter((c) => counts.has(c.slug))
    .sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0));
  const largest = [...others].sort((a, b) => (b.agentCount ?? 0) - (a.agentCount ?? 0));
  return [...new Set([...nearest, ...largest])].slice(0, 2);
}
