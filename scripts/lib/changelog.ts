/**
 * Append entries to content/changelog.json (newest first).
 * Used by weekly-drop.ts and cms.ts so the audit log maintains itself.
 * The drop pages (lib/drops.ts) group the log by its dates.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ChangelogEntry } from '../../lib/types';

/** Dated today (UTC) unless it carries its own date. */
type NewEntry = Omit<ChangelogEntry, 'date'> & { date?: string };

const FILE = path.resolve(process.cwd(), 'content', 'changelog.json');

export function appendChangelog(entries: NewEntry | NewEntry[]): void {
  const list: ChangelogEntry[] = fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE, 'utf8'))
    : [];
  const additions = (Array.isArray(entries) ? entries : [entries]).map((e) => ({
    ...e,
    date: e.date ?? new Date().toISOString().slice(0, 10),
  }));
  fs.writeFileSync(FILE, JSON.stringify([...additions, ...list], null, 2) + '\n');
}
