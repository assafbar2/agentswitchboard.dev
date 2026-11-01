/**
 * Site releases, parsed from CHANGELOG.md at the repo root. That file is the
 * one source for both the GitHub changelog and the releases on /changelog,
 * so its shape is strict: anything the parser doesn't recognise is an error
 * (caught by tests/changelog.test.ts in CI) rather than silently dropped.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cache } from 'react';

export const RELEASE_SECTIONS = ['Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Directory'] as const;
export type ReleaseSectionName = (typeof RELEASE_SECTIONS)[number];

export interface ReleaseSection {
  name: ReleaseSectionName;
  /** One inline-Markdown line per bullet (links, `code`, **bold**). */
  items: string[];
}

export interface Release {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  sections: ReleaseSection[];
}

const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2}) - (\S.*)$/;

function isSectionName(name: string): name is ReleaseSectionName {
  return (RELEASE_SECTIONS as readonly string[]).includes(name);
}

export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | null = null;
  let section: ReleaseSection | null = null;

  markdown.split('\n').forEach((raw, index) => {
    const line = raw.trimEnd();
    const where = `CHANGELOG.md line ${index + 1}`;

    if (line.startsWith('## ')) {
      const match = RELEASE_HEADING.exec(line);
      if (!match) throw new Error(`${where}: release headings look like "## [1.2.3] - YYYY-MM-DD - Title"`);
      release = { version: match[1], date: match[2], title: match[3].trim(), sections: [] };
      section = null;
      releases.push(release);
      return;
    }
    // Text before the first release (title, intro) is for GitHub readers only.
    if (!release) return;

    if (line.startsWith('### ')) {
      const name = line.slice(4).trim();
      if (!isSectionName(name)) {
        throw new Error(`${where}: unknown section "${name}" (use ${RELEASE_SECTIONS.join(', ')})`);
      }
      section = { name, items: [] };
      release.sections.push(section);
      return;
    }
    if (line.startsWith('- ')) {
      if (!section) throw new Error(`${where}: a bullet needs a "### Section" heading above it`);
      section.items.push(line.slice(2).trim());
      return;
    }
    // An indented line continues the bullet above it.
    if (/^\s+\S/.test(line) && section && section.items.length > 0) {
      section.items[section.items.length - 1] += ` ${line.trim()}`;
      return;
    }
    if (line.trim() !== '') throw new Error(`${where}: expected a "### Section" heading or a "- " bullet`);
  });

  return releases;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/** Problems that would make the rendered changelog wrong: order, dates, empty releases. */
export function changelogProblems(releases: Release[]): string[] {
  const problems: string[] = [];
  if (releases.length === 0) problems.push('no releases found');
  releases.forEach((r, i) => {
    if (Number.isNaN(Date.parse(r.date))) problems.push(`${r.version}: invalid date ${r.date}`);
    if (r.sections.length === 0 || r.sections.some((s) => s.items.length === 0)) {
      problems.push(`${r.version}: every release and section needs at least one bullet`);
    }
    const older = releases[i + 1];
    if (!older) return;
    if (compareVersions(r.version, older.version) <= 0) {
      problems.push(`${r.version} is listed above ${older.version}; newest first, no repeats`);
    }
    if (r.date < older.date) problems.push(`${r.version} (${r.date}) is dated before ${older.version} (${older.date})`);
  });
  return problems;
}

export const getReleases = cache((): Release[] =>
  parseChangelog(fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8'))
);

export function releaseAnchor(version: string): string {
  return `v${version.replaceAll('.', '-')}`;
}
