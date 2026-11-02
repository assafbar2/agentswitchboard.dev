/**
 * Compare: two or three listings side by side, at /compare?a=&b=&c= and on the
 * curated /compare/<a>-vs-<b> pages (content/comparisons.json). The tray
 * (components/CompareTray.tsx) only builds the URL; this module decides what
 * the page shows, and the share cards reuse it.
 *
 * Everything shown is the listings' own data. Fact lines are fixed templates
 * that say what sets one column apart ("Only one with a CLI"): no verdict, no
 * winner.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cache } from 'react';
import { COMPARE_MAX } from './compare-link';
import { getAlternatives } from './related';
import { ACCESS_METHOD_LABELS, ALL_ACCESS_METHODS } from './search';
import type { Agent } from './types';
import { INSTALL_LABELS } from './use-it-now';
import { authTypeLabel, formatDay, pluralize } from './utils';

/** A requested listing the page leaves out, and why. */
export interface CompareNote {
  slug: string;
  kind: 'unknown' | 'retired' | 'duplicate' | 'extra';
  /** The listing's name, when the directory knows it. */
  name?: string;
}

export interface CompareSelection {
  agents: Agent[];
  notes: CompareNote[];
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** a, b and c are the columns; d to f are read too, so a longer link can say what it left out. */
const QUERY_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];

/** The slugs a /compare query names, in column order, repeated keys included. */
export function requestedSlugs(query: URLSearchParams | Record<string, string | string[] | undefined>): string[] {
  const values = (key: string) => (query instanceof URLSearchParams ? query.getAll(key) : [query[key] ?? []].flat());
  return QUERY_KEYS.flatMap(values).slice(0, 2 * COMPARE_MAX);
}

/**
 * The listings `requested` names, in order. An unknown or no-longer-listed
 * slug is left out with a note, a repeat is dropped, and anything past
 * COMPARE_MAX is cut, so a hand-edited or stale link still renders.
 * `retired` is lib/catalog.ts getRetiredListings.
 */
export function selectCompared(
  requested: readonly string[],
  catalog: readonly Agent[],
  retired: ReadonlyMap<string, string>
): CompareSelection {
  const bySlug = new Map(catalog.map((a) => [a.slug, a]));
  const agents: Agent[] = [];
  const notes: CompareNote[] = [];
  const seen = new Set<string>();
  for (const raw of requested) {
    const slug = raw.trim().toLowerCase();
    if (!slug) continue;
    const agent = bySlug.get(slug);
    if (seen.has(slug)) {
      notes.push({ slug, kind: 'duplicate', name: agent?.name });
      continue;
    }
    seen.add(slug);
    if (!agent) {
      const name = retired.get(slug);
      // Only a slug-shaped value is echoed back onto the page.
      notes.push(name ? { slug, kind: 'retired', name } : { slug: SLUG.test(slug) ? slug : '', kind: 'unknown' });
    } else if (agents.length === COMPARE_MAX) {
      notes.push({ slug, kind: 'extra', name: agent.name });
    } else {
      agents.push(agent);
    }
  }
  return { agents, notes };
}

/** "Figma MCP Server vs Framer MCP vs Penpot MCP" */
export function compareTitle(agents: readonly Pick<Agent, 'name'>[]): string {
  return agents.map((a) => a.name).join(' vs ');
}

/** What the page says about each requested listing it leaves out. */
export function noteText(note: CompareNote): string {
  const what = note.name ?? (note.slug ? `“${note.slug}”` : 'One listing');
  switch (note.kind) {
    case 'retired':
      return `${what} is no longer listed, so it is left out.`;
    case 'duplicate':
      return `${what} was named twice; it is shown once.`;
    case 'extra':
      return `${what} is left out: a comparison shows up to ${COMPARE_MAX}.`;
    default:
      return note.slug ? `${what} isn’t a listing in the directory, so it is left out.` : 'One link named no listing, so it is left out.';
  }
}

// ── The table ───────────────────────────────────────────────────────

/** A command or address from the listing's docs, shown as code, with what it is. */
export interface CompareCode {
  code: string;
  note?: string;
}

/** A line of text, a list, or a command or address. */
export type CompareValue = string | string[] | CompareCode;

export interface CompareRow {
  key: string;
  label: string;
  /** One value per column. */
  values: CompareValue[];
  /** Every column says the same, so the row is shown de-emphasized. */
  same: boolean;
}

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');
const names = (items: { name: string }[]) => items.map((i) => i.name);
const sameValue = (value: CompareValue) =>
  typeof value === 'string' ? value : Array.isArray(value) ? [...value].sort().join('\u0000') : JSON.stringify(value);

const offers = (a: Agent, method: Agent['accessMethods'][number]) => a.accessMethods.includes(method);

// The Use it now details (lib/use-it-now.ts): the value copied from the docs, or where to find it.

function mcpValue(a: Agent): CompareValue {
  if (!offers(a, 'mcp')) return 'No MCP server';
  if (a.mcpEndpoint) return { code: a.mcpEndpoint, note: 'Hosted' };
  if (a.mcpCommand) return { code: a.mcpCommand, note: 'Runs on your computer' };
  return 'In its setup guide';
}

function cliValue(a: Agent): CompareValue {
  if (!offers(a, 'cli')) return 'No CLI';
  return a.install ? { code: a.install.command, note: INSTALL_LABELS[a.install.type] } : 'In its docs';
}

function apiValue(a: Agent): CompareValue {
  if (!offers(a, 'api')) return 'No API';
  return a.apiBaseUrl ? { code: a.apiBaseUrl } : 'In its docs';
}

/** The rows of the comparison, in the order the page shows them. A setup row shows only when some column has that access method. */
export function compareRows(agents: readonly Agent[]): CompareRow[] {
  type Row = [key: string, label: string, value: (a: Agent) => CompareValue];
  const setup: Row[] = [];
  const any = (method: Agent['accessMethods'][number]) => agents.some((a) => offers(a, method));
  if (any('mcp')) setup.push(['mcp', 'MCP server', mcpValue]);
  if (any('cli')) setup.push(['cli', 'CLI install', cliValue]);
  if (any('api')) setup.push(['api', 'API base URL', apiValue]);
  const rows: Row[] = [
    ['description', 'What it is', (a) => a.description],
    ['provider', 'Provider', (a) => a.providerName],
    ['official', 'Official vendor', (a) => a.officialVendor?.name ?? 'Not an official listing'],
    ['verified', 'Verified', (a) => yesNo(a.verified)],
    ['access', 'Access', (a) => ALL_ACCESS_METHODS.filter((m) => offers(a, m as Agent['accessMethods'][number])).map((m) => ACCESS_METHOD_LABELS[m])],
    ['auth', 'Auth', (a) => authTypeLabel(a.authType)],
    ...setup,
    ['skills', 'Skills', (a) => names(a.skills)],
    ['streaming', 'Streaming', (a) => yesNo(a.supportsStreaming)],
    ['push', 'Push notifications', (a) => yesNo(a.supportsPushNotifications)],
    ['categories', 'Categories', (a) => names(a.categories)],
    ['tags', 'Tags', (a) => a.tags],
    ['added', 'Listed since', (a) => (a.createdAt ? formatDay(a.createdAt) : '—')],
  ];
  return rows.map(([key, label, value]) => {
    const values = agents.map(value);
    const first = sameValue(values[0] ?? '');
    return { key, label, values, same: agents.length > 1 && values.every((v) => sameValue(v) === first) };
  });
}

const METHOD_PHRASE: Record<string, string> = {
  api: 'an API',
  mcp: 'an MCP server',
  cli: 'a CLI',
  'browser-extension': 'a browser extension',
};

/** Most fact lines under one column. */
export const MAX_FACTS = 4;

/**
 * Up to MAX_FACTS one-line facts per column that set it apart from the others:
 * "Only one with a CLI", "No auth required", "Most skills (12)". A fact true of
 * every column says nothing, so it is left out. Fixed templates, never a verdict.
 */
export function factLines(agents: readonly Agent[]): string[][] {
  const lines = agents.map((): string[] => []);
  if (agents.length < 2) return lines;

  /** `line` for each column `test` holds for, unless it holds for all of them. */
  const some = (test: (a: Agent) => boolean, line: (a: Agent) => string) => {
    const hits = agents.map(test);
    if (hits.every(Boolean)) return;
    hits.forEach((hit, i) => hit && lines[i].push(line(agents[i])));
  };
  /** `line` for the one column `test` holds for, if exactly one. */
  const only = (test: (a: Agent) => boolean, line: string) => {
    const hits = agents.map(test);
    if (hits.filter(Boolean).length === 1) lines[hits.indexOf(true)].push(line);
  };

  for (const method of ALL_ACCESS_METHODS) {
    only((a) => a.accessMethods.includes(method as Agent['accessMethods'][number]), `Only one with ${METHOD_PHRASE[method]}`);
  }
  some((a) => a.authType === 'none', () => 'No auth required');
  some((a) => !!a.officialVendor, (a) => `Official ${a.officialVendor!.name} listing`);
  some((a) => a.verified, () => 'Verified');

  const skills = agents.map((a) => a.skills.length);
  const most = Math.max(...skills);
  if (most > 0 && skills.filter((n) => n === most).length === 1) lines[skills.indexOf(most)].push(`Most skills (${most})`);

  some((a) => a.supportsStreaming, () => 'Streams responses');
  some((a) => a.supportsPushNotifications, () => 'Sends push notifications');

  const added = agents.map((a) => a.createdAt?.slice(0, 10) ?? '');
  const newest = added.reduce((max, d) => (d > max ? d : max), '');
  if (added.every(Boolean) && added.filter((d) => d === newest).length === 1) {
    lines[added.indexOf(newest)].push(`Newest listing (added ${formatDay(newest)})`);
  }

  return lines.map((l) => l.slice(0, MAX_FACTS));
}

// ── Suggestions ─────────────────────────────────────────────────────

/** Up to `n` listings to compare `agents` with: the first one's alternatives (lib/related.ts) not already shown. */
export function compareSuggestions(agents: readonly Agent[], catalog: Agent[], n = 4): Agent[] {
  if (agents.length === 0 || agents.length >= COMPARE_MAX) return [];
  const shown = new Set(agents.map((a) => a.slug));
  return getAlternatives(agents[0], catalog)
    .map((alt) => alt.agent)
    .filter((a) => !shown.has(a.slug))
    .slice(0, n);
}

// ── Curated comparisons ─────────────────────────────────────────────

export const COMPARISON_INTRO_MIN = 40;
export const COMPARISON_INTRO_MAX = 220;

/** A curated comparison in content/comparisons.json. */
export interface Comparison {
  /** Two or three published listings, in column order. */
  items: string[];
  /** One editorial line on what the listings have in common and where they differ. Facts only. */
  intro: string;
}

const SEPARATOR = '-vs-';

/** Its address: /compare/<a>-vs-<b>[-vs-<c>]. */
export function comparisonSlug(comparison: Pick<Comparison, 'items'>): string {
  return comparison.items.join(SEPARATOR);
}

/** The slugs in a /compare/<a>-vs-<b> segment. No listing slug contains "-vs-" (scripts/validate-content.ts). */
export function pairSlugs(pair: string): string[] {
  return pair.split(SEPARATOR);
}

/** /compare/<a>-vs-<b>[-vs-<c>]: a curated comparison's page, with its share card under it. */
export function pairPath(slugs: readonly string[]): string {
  return `/compare/${slugs.join(SEPARATOR)}`;
}

/** The listings a /compare/<a>-vs-<b> segment names, or null unless it names 2 to COMPARE_MAX published listings, each once. */
export function pairListings(pair: string, catalog: readonly Agent[]): Agent[] | null {
  const slugs = pairSlugs(pair);
  if (slugs.length < 2 || slugs.length > COMPARE_MAX || new Set(slugs).size !== slugs.length) return null;
  const bySlug = new Map(catalog.map((a) => [a.slug, a]));
  const agents = slugs.map((s) => bySlug.get(s)).filter((a): a is Agent => !!a);
  return agents.length === slugs.length ? agents : null;
}

/** Listing slugs that would break a /compare/<a>-vs-<b> address. */
export function pairUnsafeSlugs(catalog: readonly Pick<Agent, 'slug'>[]): string[] {
  return catalog.map((a) => a.slug).filter((slug) => slug.includes(SEPARATOR));
}

const FILE = path.join(process.cwd(), 'content', 'comparisons.json');

/** Every curated comparison, in the file's order. */
export const getComparisons = cache((): Comparison[] =>
  fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, 'utf8')) as Comparison[]) : []
);

export interface CuratedComparison extends Comparison {
  slug: string;
  agents: Agent[];
}

/** The curated comparisons whose listings are all published, with them, in the file's order. */
export function curatedComparisons(catalog: readonly Agent[]): CuratedComparison[] {
  return getComparisons().flatMap((comparison) => {
    const slug = comparisonSlug(comparison);
    const agents = pairListings(slug, catalog);
    return agents ? [{ ...comparison, slug, agents }] : [];
  });
}

const setKey = (slugs: readonly string[]) => [...slugs].sort().join(',');

/** The curated comparison of exactly these listings, in any order. */
export function comparisonFor<C extends Comparison>(slugs: readonly string[], comparisons: readonly C[]): C | null {
  const key = setKey(slugs);
  return comparisons.find((c) => setKey(c.items) === key) ?? null;
}

/** Curated comparisons that include `slug`. */
export function comparisonsWith<C extends Comparison>(slug: string, comparisons: readonly C[]): C[] {
  return comparisons.filter((c) => c.items.includes(slug));
}

/**
 * What is wrong with content/comparisons.json beyond its shape: each names 2
 * to COMPARE_MAX published listings once each, no two compare the same set,
 * and every listing after the first is a genuine alternative to the first
 * (lib/related.ts), so curated pages come from the related-listing clusters.
 * At any rank: every new listing reshuffles the top MAX_ALTERNATIVES, and a
 * weekly drop must not fail on a comparison it never touched.
 */
export function comparisonProblems(comparisons: readonly Comparison[], catalog: Agent[]): string[] {
  const problems: string[] = [];
  const bySlug = new Map(catalog.map((a) => [a.slug, a]));
  const sets = new Map<string, string>();
  for (const comparison of comparisons) {
    const { items, intro } = comparison;
    const slug = comparisonSlug(comparison);
    if (items.length < 2 || items.length > COMPARE_MAX) {
      problems.push(`${slug}: compares ${items.length} ${pluralize(items.length, 'listing')}; use 2 to ${COMPARE_MAX}`);
    }
    if (new Set(items).size !== items.length) problems.push(`${slug}: names a listing twice`);
    for (const item of items) {
      if (!bySlug.has(item)) problems.push(`${slug}: "${item}" is not a published listing`);
      if (item.includes(SEPARATOR)) problems.push(`${slug}: "${item}" contains "${SEPARATOR}", which the address uses as its separator`);
    }
    const key = setKey(items);
    const other = sets.get(key);
    if (other) problems.push(`${slug}: compares the same listings as "${other}"`);
    else sets.set(key, slug);

    if (intro.length < COMPARISON_INTRO_MIN || intro.length > COMPARISON_INTRO_MAX) {
      problems.push(`${slug}: intro is ${intro.length} characters; keep it to ${COMPARISON_INTRO_MIN}–${COMPARISON_INTRO_MAX}`);
    }
    if (/https?:\/\//.test(intro)) problems.push(`${slug}: intro contains a URL`);

    const first = bySlug.get(items[0]);
    if (first) {
      const alternatives = new Set(getAlternatives(first, catalog, Infinity).map((a) => a.agent.slug));
      for (const item of items.slice(1)) {
        if (item !== items[0] && bySlug.has(item) && !alternatives.has(item)) {
          problems.push(`${slug}: "${item}" is not an alternative to ${items[0]} (lib/related.ts)`);
        }
      }
    }
  }
  return problems;
}
