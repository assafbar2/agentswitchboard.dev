/**
 * Drops: the directory's changes in batches, one page each (/drops/<date>).
 * Grouped from content/changelog.json, so a batch of listings merged into the
 * catalog becomes a drop with nothing written by hand; content/drops.json
 * only adds an optional intro line.
 *
 * A drop starts on a batch day (at least DROP_MIN_ADDITIONS listings added
 * or DROP_MIN_CHANGES changed) and takes in the batch days up to
 * DROP_MERGE_DAYS later. Smaller days count toward the next drop. Dates are
 * UTC days, as the change log records them, and a drop is named by its first
 * batch day.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cache } from 'react';
import type { Agent, ChangelogEntry } from './types';
import { formatNumber, joinList, pluralize } from './utils';

export const DROP_MIN_ADDITIONS = 5;
export const DROP_MIN_CHANGES = 10;
export const DROP_MERGE_DAYS = 2;

/** The most an intro in content/drops.json may say. */
export const DROP_INTRO_MAX = 280;

/** One listing's part in a drop, however many log entries it took. */
export interface DropItem {
  slug: string;
  name: string;
  /** The day it was added, or last changed. */
  date: string;
  /** What changed or why it was removed; for an addition, its one-liner if the log has one. */
  notes: string[];
}

export interface DropChanges {
  /** Days with changes, oldest first. */
  days: string[];
  added: DropItem[];
  updated: DropItem[];
  removed: DropItem[];
}

export interface Drop extends DropChanges {
  /** The first batch day: the drop's name and URL segment. */
  date: string;
  intro?: string;
}

export interface DropSchedule {
  /** Newest first. */
  drops: Drop[];
  /** Changes since the newest drop, not yet a drop of their own. */
  pending: DropChanges | null;
}

export interface DropIntro {
  intro: string;
}

export function groupDrops(entries: readonly ChangelogEntry[], intros: Record<string, DropIntro> = {}): DropSchedule {
  // The log is newest first but not strictly: sort by day, and within a day
  // reverse the file order so a listing's latest entry comes last.
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.date.localeCompare(b.entry.date) || b.index - a.index)
    .map(({ entry }) => entry);

  const days = new Map<string, ChangelogEntry[]>();
  for (const entry of ordered) days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);

  const batches: { date: string; entries: ChangelogEntry[] }[] = [];
  let pending: ChangelogEntry[] = [];
  for (const [day, dayEntries] of days) {
    if (!isBatchDay(dayEntries)) {
      pending.push(...dayEntries);
      continue;
    }
    const last = batches.at(-1);
    if (last && daysBetween(last.date, day) <= DROP_MERGE_DAYS) last.entries.push(...pending, ...dayEntries);
    else batches.push({ date: day, entries: [...pending, ...dayEntries] });
    pending = [];
  }

  return {
    drops: batches
      .map(({ date, entries: batch }) => ({
        date,
        ...summarize(batch),
        ...(intros[date] ? { intro: intros[date].intro } : {}),
      }))
      .reverse(),
    pending: pending.length > 0 ? summarize(pending) : null,
  };
}

function isBatchDay(entries: ChangelogEntry[]): boolean {
  const added = new Set(entries.filter((e) => e.action === 'added').map((e) => e.slug));
  const changed = new Set(entries.map((e) => e.slug));
  return added.size >= DROP_MIN_ADDITIONS || changed.size >= DROP_MIN_CHANGES;
}

function daysBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000;
}

/** One line per listing: its last action decides the list, so added-then-fixed counts as added. */
function summarize(entries: ChangelogEntry[]): DropChanges {
  const bySlug = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) bySlug.set(entry.slug, [...(bySlug.get(entry.slug) ?? []), entry]);

  const changes: DropChanges = { days: [...new Set(entries.map((e) => e.date))], added: [], updated: [], removed: [] };
  for (const [slug, log] of bySlug) {
    const last = log[log.length - 1];
    const additions = log.filter((e) => e.action === 'added');
    if (last.action === 'removed') {
      changes.removed.push({ slug, name: last.name, date: last.date, notes: notesOf([last]) });
    } else if (additions.length > 0) {
      changes.added.push({ slug, name: last.name, date: additions[0].date, notes: notesOf(additions) });
    } else {
      changes.updated.push({ slug, name: last.name, date: last.date, notes: notesOf(log) });
    }
  }
  for (const list of [changes.added, changes.updated, changes.removed]) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return changes;
}

function notesOf(entries: ChangelogEntry[]): string[] {
  return [...new Set(entries.map((e) => e.note?.trim()).filter((note): note is string => !!note))];
}

/**
 * A drop's additions that are still listed, in the order a drop shows them:
 * Official first, the biggest vendor in the catalog first, then the rest A→Z.
 * `gone` are the additions that have since left the directory.
 */
export function dropAdditions(drop: DropChanges, catalog: Agent[]): { listed: Agent[]; gone: DropItem[] } {
  const bySlug = new Map(catalog.map((a) => [a.slug, a]));
  const vendorSize = new Map<string, number>();
  for (const a of catalog) {
    if (a.officialVendor) vendorSize.set(a.officialVendor.slug, (vendorSize.get(a.officialVendor.slug) ?? 0) + 1);
  }
  const rank = (a: Agent) => (a.officialVendor ? (vendorSize.get(a.officialVendor.slug) ?? 0) : -1);

  const listed: Agent[] = [];
  const gone: DropItem[] = [];
  for (const item of drop.added) {
    const agent = bySlug.get(item.slug);
    if (agent) listed.push(agent);
    else gone.push(item);
  }
  listed.sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name));
  return { listed, gone };
}

/** The first `n` of dropAdditions(…).listed, one per provider before any repeats, so one vendor can't fill the line. */
export function dropHighlights(listed: Agent[], n = 3): Agent[] {
  const providers = new Set<string>();
  const first: Agent[] = [];
  const repeats: Agent[] = [];
  for (const agent of listed) {
    const provider = agent.officialVendor?.slug ?? agent.providerName.toLowerCase();
    (providers.has(provider) ? repeats : first).push(agent);
    providers.add(provider);
  }
  return [...first, ...repeats].slice(0, n);
}

/** scripts/cms.ts logs an edit as "<field> updated"; these are the fields' plain names. */
const FIELD_NAMES: Record<string, string> = {
  agentUrl: 'product link',
  providerUrl: 'provider link',
  providerName: 'provider name',
  accessMethods: 'access methods',
  authType: 'auth type',
};

/** A listing's notes as one line: "Product link and provider name updated. Re-described as …" */
export function describeNotes(notes: string[]): string {
  const fields: string[] = [];
  const sentences: string[] = [];
  for (const note of notes) {
    const field = /^(\w+) updated$/.exec(note)?.[1];
    if (field) fields.push(FIELD_NAMES[field] ?? field);
    else sentences.push(note.replace(/\.$/, ''));
  }
  if (fields.length > 0) {
    const list = joinList(fields);
    sentences.unshift(`${list[0].toUpperCase()}${list.slice(1)} updated`);
  }
  return sentences.length > 0 ? `${sentences.join('. ')}.` : '';
}

/** "59 new AI agents", or for a drop with no additions, what it did change. */
export function dropHeadline(drop: DropChanges): string {
  const { added, updated, removed } = drop;
  if (added.length > 0) return `${formatNumber(added.length)} new AI ${pluralize(added.length, 'agent')}`;
  if (updated.length > 0) return `${formatNumber(updated.length)} ${pluralize(updated.length, 'listing')} updated`;
  return `${formatNumber(removed.length)} ${pluralize(removed.length, 'listing')} removed`;
}

/**
 * One sentence on a drop: "59 AI agents added (13 Official), 6 listings
 * updated and 1 removed, including Android CLI, Copilot SDK and Xcode MCP."
 * `listed` is dropAdditions(…).listed.
 */
export function dropSummary(drop: DropChanges, listed: Agent[]): string {
  const official = listed.filter((a) => a.official).length;
  const { added, updated, removed } = drop;
  const clauses = [
    added.length > 0 &&
      `${formatNumber(added.length)} AI ${pluralize(added.length, 'agent')} added${official > 0 ? ` (${official} Official)` : ''}`,
    updated.length > 0 && `${formatNumber(updated.length)} ${pluralize(updated.length, 'listing')} updated`,
    removed.length > 0 &&
      `${formatNumber(removed.length)} ${added.length + updated.length === 0 ? `${pluralize(removed.length, 'listing')} ` : ''}removed`,
  ].filter((c): c is string => !!c);
  const names = dropHighlights(listed).map((a) => a.name);
  return `${joinList(clauses)}${names.length > 0 ? `, including ${joinList(names)}` : ''}.`;
}

const CONTENT_DIR = path.join(process.cwd(), 'content');

function readJson<T>(file: string, fallback: T): T {
  const full = path.join(CONTENT_DIR, file);
  return fs.existsSync(full) ? (JSON.parse(fs.readFileSync(full, 'utf8')) as T) : fallback;
}

export const getDropSchedule = cache(
  (): DropSchedule => groupDrops(readJson<ChangelogEntry[]>('changelog.json', []), readJson('drops.json', {}))
);

/** A drop with its neighbours, for the prev/next links. */
export function getDrop(date: string): { drop: Drop; newer: Drop | null; older: Drop | null } | null {
  const { drops } = getDropSchedule();
  const i = drops.findIndex((d) => d.date === date);
  if (i === -1) return null;
  return { drop: drops[i], newer: drops[i - 1] ?? null, older: drops[i + 1] ?? null };
}
