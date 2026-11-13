/**
 * What's new: the site's releases with highlights (CHANGELOG.md) and the
 * weekly drops (content/changelog.json), newest first, each as highlights
 * with a Try it link. A drop's highlights are written from its data, so a
 * drop is on /whats-new and the homepage as soon as it merges, with nothing
 * added by hand.
 */

import { highlightedReleases, MAX_HIGHLIGHTS, releaseAnchor, type Highlight, type Release } from './changelog';
import { dropAdditions, dropHeadline, dropSummary, type Drop } from './drops';
import { stackForDrop, type Stack } from './stacks';
import type { Agent } from './types';

export interface WhatsNewEntry {
  kind: 'release' | 'drop';
  /** The release's version, or "drop-YYYY-MM-DD": what a Try it click counts as its release. */
  id: string;
  /** Its section's id on /whats-new. */
  anchor: string;
  /** "2.9.2", or "Weekly drop". */
  label: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  highlights: Highlight[];
  /** Where the whole story is: the release's notes or the drop's page. */
  more: { href: string; label: string };
}

export function whatsNewOfRelease(release: Release): WhatsNewEntry {
  const anchor = releaseAnchor(release.version);
  return {
    kind: 'release',
    id: release.version,
    anchor,
    label: release.version,
    title: release.title,
    date: release.date,
    highlights: release.highlights,
    more: { href: `/changelog#${anchor}`, label: `All the notes for ${release.version}` },
  };
}

export function whatsNewOfDrop(drop: Drop, stacks: Stack[], catalog: Agent[]): WhatsNewEntry {
  const page = `/drops/${drop.date}`;
  const highlights: Highlight[] = [{ text: dropSummary(drop, dropAdditions(drop, catalog).listed), tryIt: page }];
  const stack = stackForDrop(stacks, drop.date);
  if (stack) highlights.push({ text: `Stack of the week, **${stack.title}**: ${stack.promise}`, tryIt: `/stacks/${stack.slug}` });
  return {
    kind: 'drop',
    id: `drop-${drop.date}`,
    anchor: `drop-${drop.date}`,
    label: 'Weekly drop',
    title: dropHeadline(drop),
    date: drop.date,
    highlights,
    more: { href: page, label: 'The whole drop' },
  };
}

/**
 * Releases with highlights and the drops since the oldest of them, newest
 * first; on the same day, releases come first, as in the feeds.
 */
export function whatsNewEntries(releases: Release[], drops: Drop[], stacks: Stack[], catalog: Agent[]): WhatsNewEntry[] {
  const highlighted = highlightedReleases(releases);
  const oldest = highlighted.at(-1)?.date ?? '';
  return [
    ...highlighted.map(whatsNewOfRelease),
    ...drops.filter((d) => d.date >= oldest).map((d) => whatsNewOfDrop(d, stacks, catalog)),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/** One highlight with the entry it belongs to, as the Highlights list shows it. */
export interface HighlightRow {
  entry: WhatsNewEntry;
  highlight: Highlight;
  /** The id of its text, which its Try it link names. */
  id: string;
}

export function highlightRows(entries: WhatsNewEntry[]): HighlightRow[] {
  return entries.flatMap((entry) =>
    entry.highlights.map((highlight, i) => ({ entry, highlight, id: `${entry.anchor}-${i + 1}` }))
  );
}

/**
 * The homepage's What's new block: the newest highlights from entries dated
 * `since` or later, up to MAX_HIGHLIGHTS. Empty when nothing is that new.
 */
export function homepageHighlights(entries: WhatsNewEntry[], since: string): HighlightRow[] {
  return highlightRows(entries.filter((e) => e.date >= since)).slice(0, MAX_HIGHLIGHTS);
}
