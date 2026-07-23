/**
 * Append entries to content/changelog.json (newest first).
 * Used by weekly-drop.ts and cms.ts so the audit log maintains itself.
 * Dates are included automatically going forward; older seeded entries
 * may omit them.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ChangelogEntry {
  action: 'added' | 'removed' | 'updated';
  slug: string;
  name: string;
  note?: string;
  date?: string;
}

const FILE = path.resolve(process.cwd(), 'content', 'changelog.json');

export function appendChangelog(entries: ChangelogEntry | ChangelogEntry[]): void {
  const list: ChangelogEntry[] = fs.existsSync(FILE)
    ? JSON.parse(fs.readFileSync(FILE, 'utf8'))
    : [];
  const additions = (Array.isArray(entries) ? entries : [entries]).map((e) => ({
    ...e,
    date: e.date ?? new Date().toISOString().slice(0, 10),
  }));
  fs.writeFileSync(FILE, JSON.stringify([...additions, ...list], null, 2) + '\n');
}
