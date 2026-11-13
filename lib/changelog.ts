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

/**
 * Every x.y.0 release from this version on opens with a "### Highlights" list:
 * one line per feature, each ending in a Try it link. /whats-new, the homepage
 * and the feeds show those; /changelog shows the sections below them.
 */
export const HIGHLIGHTS_SINCE = '2.2.0';
/**
 * From this version on, patch releases need highlights too: a release
 * without them never reaches /whats-new or the homepage, so What's new would
 * fall behind what shipped.
 */
export const EVERY_RELEASE_HIGHLIGHTS_SINCE = '2.9.1';
/** So the homepage's What's new block stays a glance. */
export const MAX_HIGHLIGHTS = 5;

export interface ReleaseSection {
  name: ReleaseSectionName;
  /** One inline-Markdown line per bullet (links, `code`, **bold**). */
  items: string[];
}

export interface Highlight {
  /** What you can do now, as inline Markdown, without the Try it link. */
  text: string;
  /** Where to try it: a path on this site, with any query and hash. */
  tryIt: string;
}

export interface Release {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  highlights: Highlight[];
  sections: ReleaseSection[];
}

const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2}) - (\S.*)$/;
const HIGHLIGHTS = 'Highlights';
const TRY_IT = /^(\S.*?)\s+\[Try it\]\(https:\/\/agentswitchboard\.dev(\/[^\s)]*)\)$/;

function isSectionName(name: string): name is ReleaseSectionName {
  return (RELEASE_SECTIONS as readonly string[]).includes(name);
}

function toHighlight(line: string, version: string): Highlight {
  const match = TRY_IT.exec(line);
  if (!match) {
    throw new Error(`CHANGELOG.md ${version}: a highlight ends with a [Try it](https://agentswitchboard.dev/…) link: "${line}"`);
  }
  return { text: match[1], tryIt: match[2] };
}

export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  const highlightLines = new Map<Release, string[]>();
  let release: Release | null = null;
  let items: string[] | null = null;

  markdown.split('\n').forEach((raw, index) => {
    const line = raw.trimEnd();
    const where = `CHANGELOG.md line ${index + 1}`;

    if (line.startsWith('## ')) {
      const match = RELEASE_HEADING.exec(line);
      if (!match) throw new Error(`${where}: release headings look like "## [1.2.3] - YYYY-MM-DD - Title"`);
      release = { version: match[1], date: match[2], title: match[3].trim(), highlights: [], sections: [] };
      items = null;
      releases.push(release);
      return;
    }
    // Text before the first release (title, intro) is for GitHub readers only.
    if (!release) return;

    if (line.startsWith('### ')) {
      const name = line.slice(4).trim();
      if (name === HIGHLIGHTS) {
        if (release.sections.length > 0 || highlightLines.has(release)) {
          throw new Error(`${where}: "### ${HIGHLIGHTS}" comes once, before the other sections`);
        }
        items = [];
        highlightLines.set(release, items);
        return;
      }
      if (!isSectionName(name)) {
        throw new Error(`${where}: unknown section "${name}" (use ${HIGHLIGHTS}, ${RELEASE_SECTIONS.join(', ')})`);
      }
      const section: ReleaseSection = { name, items: [] };
      release.sections.push(section);
      items = section.items;
      return;
    }
    if (line.startsWith('- ')) {
      if (!items) throw new Error(`${where}: a bullet needs a "### Section" heading above it`);
      items.push(line.slice(2).trim());
      return;
    }
    // An indented line continues the bullet above it.
    if (/^\s+\S/.test(line) && items && items.length > 0) {
      items[items.length - 1] += ` ${line.trim()}`;
      return;
    }
    if (line.trim() !== '') throw new Error(`${where}: expected a "### Section" heading or a "- " bullet`);
  });

  for (const [r, lines] of highlightLines) r.highlights = lines.map((line) => toHighlight(line, r.version));
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
    const isPatch = r.version.split('.')[2] !== '0';
    if (r.highlights.length === 0) {
      if (compareVersions(r.version, EVERY_RELEASE_HIGHLIGHTS_SINCE) >= 0) {
        problems.push(`${r.version}: every release from ${EVERY_RELEASE_HIGHLIGHTS_SINCE} on opens with "### ${HIGHLIGHTS}"`);
      } else if (!isPatch && compareVersions(r.version, HIGHLIGHTS_SINCE) >= 0) {
        problems.push(`${r.version}: every x.y.0 release from ${HIGHLIGHTS_SINCE} on opens with "### ${HIGHLIGHTS}"`);
      }
    }
    if (r.highlights.length > MAX_HIGHLIGHTS) {
      problems.push(`${r.version}: ${r.highlights.length} highlights; keep it to ${MAX_HIGHLIGHTS}`);
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

/** The releases /whats-new shows, newest first: those with highlights. */
export function highlightedReleases(releases: Release[]): Release[] {
  return releases.filter((r) => r.highlights.length > 0);
}

/**
 * Try it links whose page the build didn't generate. `pages` holds every
 * path the build prerendered or serves without parameters (scripts/check-try-links.ts
 * reads them from .next); a link's query and hash aren't checked.
 */
export function tryItProblems(releases: Release[], pages: ReadonlySet<string>): string[] {
  return releases.flatMap((r) =>
    r.highlights
      .filter((h) => !pages.has(new URL(h.tryIt, 'https://agentswitchboard.dev').pathname))
      .map((h) => `${r.version}: Try it ${h.tryIt} is not a page the build generates`)
  );
}
