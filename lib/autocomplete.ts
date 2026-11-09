/**
 * Search-box suggestions. /search-index.json holds every listing, task,
 * category and official vendor in compact rows, built once per deploy. The
 * search box matches what is typed against it in the browser, so
 * suggestions need no request per keystroke.
 */

import { iconPath, iconVersion } from './icons';
import type { OfficialGroup } from './official';
import { narrowingWords } from './search';
import type { Agent, Category } from './types';

/** A listing: [name, slug, icon version ('' without an icon), 1 when Official]. */
export type AgentRow = [name: string, slug: string, icon: string, official: 0 | 1];
/** A category or official vendor: [name, slug, listings in it]. */
export type GroupRow = [name: string, slug: string, count: number];
/** A task: [label, slug, listings that fit it, keywords]. */
export type TaskRow = [label: string, slug: string, count: number, keywords: string[]];

export interface SuggestIndex {
  /** Catalog order: featured first, then A→Z. */
  agents: AgentRow[];
  categories: GroupRow[];
  /** Most listings first. */
  vendors: GroupRow[];
  /** content/tasks.json order. Optional, so a page still open from before tasks reads a newer index, and the reverse. */
  tasks?: TaskRow[];
}

/** A task as the index needs it, with how many listings fit it. */
export interface TaskCount {
  label: string;
  slug: string;
  keywords: string[];
  count: number;
}

export function buildSuggestIndex(
  agents: Agent[],
  categories: Category[],
  vendors: OfficialGroup[],
  tasks: TaskCount[] = []
): SuggestIndex {
  return {
    agents: agents.map((a) => [a.name, a.slug, a.iconUrl ? iconVersion(a.iconUrl) : '', a.official ? 1 : 0]),
    categories: categories
      .filter((c) => (c.agentCount ?? 0) > 0)
      .map((c) => [c.name, c.slug, c.agentCount ?? 0]),
    vendors: vendors.map((g) => [g.vendor.name, g.vendor.slug, g.agents.length]),
    tasks: tasks.map((t) => [t.label, t.slug, t.count, t.keywords]),
  };
}

/** True when `data` has the shape of a SuggestIndex, so a malformed response never reaches suggest(). */
export function isSuggestIndex(data: unknown): data is SuggestIndex {
  const index = data as SuggestIndex | null;
  return (
    !!index &&
    Array.isArray(index.agents) &&
    Array.isArray(index.categories) &&
    Array.isArray(index.vendors) &&
    (index.tasks === undefined || Array.isArray(index.tasks))
  );
}

export type SuggestionKind = 'agent' | 'task' | 'category' | 'vendor';

export interface Suggestion {
  kind: SuggestionKind;
  name: string;
  href: string;
  /** Listings that fit a task or are in a category, or a vendor's Official listings. */
  count?: number;
  iconUrl?: string;
  /** A task's slug, for counting the pick. */
  task?: string;
}

/** The most suggestions of each kind. */
export const SUGGESTION_LIMITS: Record<SuggestionKind, number> = { agent: 5, task: 2, category: 3, vendor: 3 };

/** Letters or digits a query needs before it gets suggestions. */
export const MIN_SUGGEST_CHARS = 2;
/** Tasks need one more, so "ai" does not suggest "build a voice agent" for its keyword "voice ai". */
export const MIN_TASK_CHARS = 3;

// Built with new RegExp so the 'u'-flag syntax isn't checked against the ES2017 target.
const WORD = new RegExp('[\\p{L}\\p{N}]+', 'gu');
// Where a run-together name starts its next part: "Agent|Mail", "MCP|Jam".
const CAMEL_HUMP = new RegExp('([\\p{Ll}\\p{N}])(\\p{Lu})', 'gu');
const CAMEL_ACRONYM = new RegExp('(\\p{Lu})(\\p{Lu}\\p{Ll})', 'gu');

/** Lowercased runs of letters and digits: "Cal.com" is "cal", "com". */
function wordsOf(text: string): string[] {
  return text.toLowerCase().match(WORD) ?? [];
}

/** A name as matching sees it. */
interface Entry {
  words: string[];
  /** The words plus the capitalized parts of run-together ones: "AgentMail" adds "agent" and "mail". */
  parts: string[];
  /** The words joined by single spaces. */
  text: string;
}

function entryOf(name: string): Entry {
  const words = wordsOf(name);
  const humps = wordsOf(name.replace(CAMEL_HUMP, '$1 $2').replace(CAMEL_ACRONYM, '$1 $2'));
  return { words, parts: [...new Set([...words, ...humps])], text: words.join(' ') };
}

/** A task as matching sees it: its label, its keywords, and every word of both. */
interface TaskEntry {
  label: Entry;
  keywords: Entry[];
  words: string[];
}

interface Prepared {
  agents: Entry[];
  tasks: TaskEntry[];
  categories: Entry[];
  vendors: Entry[];
}

const preparedIndexes = new WeakMap<SuggestIndex, Prepared>();

function prepare(index: SuggestIndex): Prepared {
  let prepared = preparedIndexes.get(index);
  if (!prepared) {
    const entries = (rows: (AgentRow | GroupRow)[]) => rows.map(([name]) => entryOf(name));
    const tasks = (index.tasks ?? []).map(([label, , , keywords]): TaskEntry => {
      const entry = entryOf(label);
      const keywordEntries = keywords.map(entryOf);
      return { label: entry, keywords: keywordEntries, words: [...entry.words, ...keywordEntries.flatMap((k) => k.words)] };
    });
    prepared = {
      agents: entries(index.agents),
      tasks,
      categories: entries(index.categories),
      vendors: entries(index.vendors),
    };
    preparedIndexes.set(index, prepared);
  }
  return prepared;
}

interface Query {
  /** Every word, joined by single spaces. */
  phrase: string;
  /** Words a match must have. Filler ("for", "server") counts only when there is nothing else. */
  terms: string[];
  /** Letters and digits in the query. */
  chars: number;
}

function parse(query: string): Query | null {
  const words = wordsOf(query);
  const chars = words.join('').length;
  if (chars < MIN_SUGGEST_CHARS) return null;
  const narrowing = narrowingWords(query).flatMap(wordsOf);
  return { phrase: words.join(' '), terms: [...new Set(narrowing.length > 0 ? narrowing : words)], chars };
}

/**
 * How well a name matches: 5 when it is the query, 4 when it starts with it,
 * 3 when every term starts one of its words, 2 when every term starts a word
 * or a part of a run-together one ("mail" in AgentMail), 1 when terms of 4+
 * letters are anywhere inside it ("mail" in Gmail) and shorter ones start a
 * part. 0 is no match, so "git" never suggests DigitalOcean.
 */
function scoreOf(entry: Entry, query: Query): number {
  if (entry.text === query.phrase) return 5;
  if (entry.text.startsWith(query.phrase)) return 4;
  const starts = (list: string[]) => (term: string) => list.some((w) => w.startsWith(term));
  if (query.terms.every(starts(entry.words))) return 3;
  if (query.terms.every(starts(entry.parts))) return 2;
  if (query.terms.every((t) => (t.length >= 4 ? entry.text.includes(t) : starts(entry.parts)(t)))) return 1;
  return 0;
}

/**
 * How well a task matches: as scoreOf for its label; one less for its best
 * keyword, so "postgres" suggests "query a database"; or 2 when every term
 * starts a word of the label or a keyword ("query postgres").
 */
function taskScoreOf(entry: TaskEntry, query: Query): number {
  const label = scoreOf(entry.label, query);
  const keyword = Math.max(0, ...entry.keywords.map((k) => scoreOf(k, query)));
  const across = query.terms.every((t) => entry.words.some((w) => w.startsWith(t))) ? 2 : 0;
  return Math.max(label, keyword - 1, across);
}

/** The best `limit` rows by `score` (0 is no match): highest score, then `before`, then index order. */
function best<R, E>(
  rows: R[],
  entries: E[],
  score: (entry: E) => number,
  limit: number,
  before: (a: R, b: R) => number
): R[] {
  const hits: { row: R; score: number; at: number }[] = [];
  entries.forEach((entry, at) => {
    const points = score(entry);
    if (points > 0) hits.push({ row: rows[at], score: points, at });
  });
  return hits
    .sort((a, b) => b.score - a.score || before(a.row, b.row) || a.at - b.at)
    .slice(0, limit)
    .map(({ row }) => row);
}

/** Official first, then the shorter name: the one closest to what was typed. */
const agentOrder = (a: AgentRow, b: AgentRow) => b[3] - a[3] || a[0].length - b[0].length;
/** Most listings first, then the shorter name. */
const groupOrder = (a: GroupRow | TaskRow, b: GroupRow | TaskRow) => b[2] - a[2] || a[0].length - b[0].length;

/** Suggestions for `query`: listings first, then tasks, categories and official vendors. */
export function suggest(index: SuggestIndex, query: string): Suggestion[] {
  const parsed = parse(query);
  if (!parsed) return [];
  const prepared = prepare(index);
  const byName = (entry: Entry) => scoreOf(entry, parsed);
  const agents = best(index.agents, prepared.agents, byName, SUGGESTION_LIMITS.agent, agentOrder);
  const tasks =
    parsed.chars >= MIN_TASK_CHARS
      ? best(index.tasks ?? [], prepared.tasks, (entry) => taskScoreOf(entry, parsed), SUGGESTION_LIMITS.task, groupOrder)
      : [];
  const categories = best(index.categories, prepared.categories, byName, SUGGESTION_LIMITS.category, groupOrder);
  const vendors = best(index.vendors, prepared.vendors, byName, SUGGESTION_LIMITS.vendor, groupOrder);
  return [
    ...agents.map(([name, slug, icon]): Suggestion => ({
      kind: 'agent',
      name,
      href: `/agents/${slug}`,
      iconUrl: icon ? iconPath(slug, { v: icon }) : undefined,
    })),
    ...tasks.map(([label, slug, count]): Suggestion => ({
      kind: 'task',
      name: label,
      count,
      href: `/browse?task=${encodeURIComponent(slug)}`,
      task: slug,
    })),
    ...categories.map(([name, slug, count]): Suggestion => ({
      kind: 'category',
      name,
      count,
      href: `/browse?category=${encodeURIComponent(slug)}`,
    })),
    ...vendors.map(([name, slug, count]): Suggestion => ({
      kind: 'vendor',
      name,
      count,
      href: `/browse?vendor=${encodeURIComponent(slug)}`,
    })),
  ];
}
