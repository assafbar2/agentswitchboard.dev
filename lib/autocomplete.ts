/**
 * Search-box suggestions. /search-index.json holds every listing, category
 * and official vendor in compact rows, built once per deploy. The search box
 * matches what is typed against it in the browser, so suggestions need no
 * request per keystroke.
 */

import { iconPath, iconVersion } from './icons';
import type { OfficialGroup } from './official';
import { narrowingWords } from './search';
import type { Agent, Category } from './types';

/** A listing: [name, slug, icon version ('' without an icon), 1 when Official]. */
export type AgentRow = [name: string, slug: string, icon: string, official: 0 | 1];
/** A category or official vendor: [name, slug, listings in it]. */
export type GroupRow = [name: string, slug: string, count: number];

export interface SuggestIndex {
  /** Catalog order: featured first, then A→Z. */
  agents: AgentRow[];
  categories: GroupRow[];
  /** Most listings first. */
  vendors: GroupRow[];
}

export function buildSuggestIndex(agents: Agent[], categories: Category[], vendors: OfficialGroup[]): SuggestIndex {
  return {
    agents: agents.map((a) => [a.name, a.slug, a.iconUrl ? iconVersion(a.iconUrl) : '', a.official ? 1 : 0]),
    categories: categories
      .filter((c) => (c.agentCount ?? 0) > 0)
      .map((c) => [c.name, c.slug, c.agentCount ?? 0]),
    vendors: vendors.map((g) => [g.vendor.name, g.vendor.slug, g.agents.length]),
  };
}

/** True when `data` has the shape of a SuggestIndex, so a malformed response never reaches suggest(). */
export function isSuggestIndex(data: unknown): data is SuggestIndex {
  const index = data as SuggestIndex | null;
  return !!index && Array.isArray(index.agents) && Array.isArray(index.categories) && Array.isArray(index.vendors);
}

export type SuggestionKind = 'agent' | 'category' | 'vendor';

export interface Suggestion {
  kind: SuggestionKind;
  name: string;
  href: string;
  /** Listings in a category, or a vendor's Official listings. */
  count?: number;
  iconUrl?: string;
}

/** The most suggestions of each kind. */
export const SUGGESTION_LIMITS: Record<SuggestionKind, number> = { agent: 5, category: 3, vendor: 3 };

/** Letters or digits a query needs before it gets suggestions. */
export const MIN_SUGGEST_CHARS = 2;

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

interface Prepared {
  agents: Entry[];
  categories: Entry[];
  vendors: Entry[];
}

const preparedIndexes = new WeakMap<SuggestIndex, Prepared>();

function prepare(index: SuggestIndex): Prepared {
  let prepared = preparedIndexes.get(index);
  if (!prepared) {
    const entries = (rows: (AgentRow | GroupRow)[]) => rows.map(([name]) => entryOf(name));
    prepared = { agents: entries(index.agents), categories: entries(index.categories), vendors: entries(index.vendors) };
    preparedIndexes.set(index, prepared);
  }
  return prepared;
}

interface Query {
  /** Every word, joined by single spaces. */
  phrase: string;
  /** Words a match must have. Filler ("for", "server") counts only when there is nothing else. */
  terms: string[];
}

function parse(query: string): Query | null {
  const words = wordsOf(query);
  if (words.join('').length < MIN_SUGGEST_CHARS) return null;
  const narrowing = narrowingWords(query).flatMap(wordsOf);
  return { phrase: words.join(' '), terms: [...new Set(narrowing.length > 0 ? narrowing : words)] };
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

/** The best `limit` rows: highest score, then `before`, then index order. */
function best<R>(rows: R[], entries: Entry[], query: Query, limit: number, before: (a: R, b: R) => number): R[] {
  const hits: { row: R; score: number; at: number }[] = [];
  entries.forEach((entry, at) => {
    const score = scoreOf(entry, query);
    if (score > 0) hits.push({ row: rows[at], score, at });
  });
  return hits
    .sort((a, b) => b.score - a.score || before(a.row, b.row) || a.at - b.at)
    .slice(0, limit)
    .map(({ row }) => row);
}

/** Official first, then the shorter name: the one closest to what was typed. */
const agentOrder = (a: AgentRow, b: AgentRow) => b[3] - a[3] || a[0].length - b[0].length;
/** Most listings first, then the shorter name. */
const groupOrder = (a: GroupRow, b: GroupRow) => b[2] - a[2] || a[0].length - b[0].length;

/** Suggestions for `query`: listings first, then categories, then official vendors. */
export function suggest(index: SuggestIndex, query: string): Suggestion[] {
  const parsed = parse(query);
  if (!parsed) return [];
  const prepared = prepare(index);
  const agents = best(index.agents, prepared.agents, parsed, SUGGESTION_LIMITS.agent, agentOrder);
  const categories = best(index.categories, prepared.categories, parsed, SUGGESTION_LIMITS.category, groupOrder);
  const vendors = best(index.vendors, prepared.vendors, parsed, SUGGESTION_LIMITS.vendor, groupOrder);
  return [
    ...agents.map(([name, slug, icon]): Suggestion => ({
      kind: 'agent',
      name,
      href: `/agents/${slug}`,
      iconUrl: icon ? iconPath(slug, { v: icon }) : undefined,
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
