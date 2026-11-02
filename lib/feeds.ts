/**
 * The site's feeds, /feed.xml (RSS 2.0) and /atom.xml (Atom 1.0): one entry
 * per site release, with its highlights from CHANGELOG.md, and one per weekly
 * drop, with what it added, updated and removed. Newest first. Entries are
 * dated by their release or drop day, so a feed changes only when it has
 * something new.
 */

import { releaseAnchor, type Release } from './changelog';
import { dropAdditions, dropHeadline, type Drop } from './drops';
import { escapeHtml, inlineMarkdownToHtml } from './inline-markdown';
import type { Agent } from './types';
import { formatDay, formatNumber } from './utils';

const SITE = 'https://agentswitchboard.dev';

export const FEED_ENTRIES = 30;
/** How many names a drop's entry lists for each kind of change, before "and N more". */
export const FEED_NAMES = 25;

export const FEED_TITLE = 'Agent Switchboard';
export const FEED_DESCRIPTION =
  'Site releases and weekly drops of Agent Switchboard, the directory of AI agents, MCP servers and agent tools.';

export interface FeedEntry {
  /** Absolute URL: the entry's id and its link. */
  url: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** The entry's content, as HTML. */
  html: string;
}

const list = (items: string[]) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
const link = (href: string, label: string) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

export function releaseEntry(release: Release): FeedEntry {
  const anchor = releaseAnchor(release.version);
  const notes = `${SITE}/changelog#${anchor}`;
  const html =
    release.highlights.length > 0
      ? list(release.highlights.map((h) => `${inlineMarkdownToHtml(h.text)} ${link(`${SITE}${h.tryIt}`, 'Try it')}`)) +
        `<p>${link(notes, `All the notes for ${release.version}`)}</p>`
      : release.sections
          .map((s) => `<p><strong>${escapeHtml(s.name)}</strong></p>${list(s.items.map(inlineMarkdownToHtml))}`)
          .join('');
  return {
    url: release.highlights.length > 0 ? `${SITE}/whats-new#${anchor}` : notes,
    title: `Agent Switchboard ${release.version}: ${release.title}`,
    date: release.date,
    html,
  };
}

function names(items: { name: string; href?: string }[]): string {
  const shown = items.slice(0, FEED_NAMES).map((i) => (i.href ? link(i.href, i.name) : escapeHtml(i.name)));
  const more = items.length - shown.length;
  return `${shown.join(', ')}${more > 0 ? ` and ${formatNumber(more)} more` : ''}`;
}

export function dropEntry(drop: Drop, catalog: Agent[]): FeedEntry {
  const url = `${SITE}/drops/${drop.date}`;
  const listedSlugs = new Set(catalog.map((a) => a.slug));
  const { listed, gone } = dropAdditions(drop, catalog);
  const page = (slug: string) => (listedSlugs.has(slug) ? `${SITE}/agents/${slug}` : undefined);
  const parts = [
    drop.intro && `<p>${escapeHtml(drop.intro)}</p>`,
    drop.added.length > 0 &&
      `<p><strong>Added (${formatNumber(drop.added.length)})</strong>: ${names([
        ...listed.map((a) => ({ name: a.name, href: page(a.slug) })),
        ...gone.map((g) => ({ name: g.name })),
      ])}</p>`,
    drop.updated.length > 0 &&
      `<p><strong>Updated (${formatNumber(drop.updated.length)})</strong>: ${names(
        drop.updated.map((u) => ({ name: u.name, href: page(u.slug) }))
      )}</p>`,
    drop.removed.length > 0 &&
      `<p><strong>Removed (${formatNumber(drop.removed.length)})</strong>: ${names(drop.removed.map((r) => ({ name: r.name })))}</p>`,
    `<p>${link(url, 'See the drop')}</p>`,
  ];
  return {
    url,
    title: `The ${formatDay(drop.date)} drop: ${dropHeadline(drop)}`,
    date: drop.date,
    html: parts.filter(Boolean).join(''),
  };
}

/** Releases and drops, newest first; on the same day, releases come first. */
export function feedEntries(releases: Release[], drops: Drop[], catalog: Agent[], limit = FEED_ENTRIES): FeedEntry[] {
  return [...releases.map(releaseEntry), ...drops.map((d) => dropEntry(d, catalog))]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

const dayStart = (date: string) => new Date(`${date}T00:00:00Z`);

export function rssFeed(entries: FeedEntry[]): string {
  const items = entries.map(
    (e) => `    <item>
      <title>${escapeHtml(e.title)}</title>
      <link>${escapeHtml(e.url)}</link>
      <guid isPermaLink="true">${escapeHtml(e.url)}</guid>
      <pubDate>${dayStart(e.date).toUTCString()}</pubDate>
      <description>${escapeHtml(e.html)}</description>
    </item>`
  );
  const built = entries[0] ? `\n    <lastBuildDate>${dayStart(entries[0].date).toUTCString()}</lastBuildDate>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${SITE}/</link>
    <description>${escapeHtml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>${built}
${items.join('\n')}
  </channel>
</rss>
`;
}

export function atomFeed(entries: FeedEntry[]): string {
  const stamp = (date: string) => dayStart(date).toISOString().replace('.000Z', 'Z');
  const items = entries.map(
    (e) => `  <entry>
    <id>${escapeHtml(e.url)}</id>
    <title>${escapeHtml(e.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeHtml(e.url)}"/>
    <published>${stamp(e.date)}</published>
    <updated>${stamp(e.date)}</updated>
    <content type="html">${escapeHtml(e.html)}</content>
  </entry>`
  );
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${SITE}/atom.xml</id>
  <title>${FEED_TITLE}</title>
  <subtitle>${escapeHtml(FEED_DESCRIPTION)}</subtitle>
  <link rel="alternate" type="text/html" href="${SITE}/"/>
  <link rel="self" type="application/atom+xml" href="${SITE}/atom.xml"/>
  <updated>${stamp(entries[0]?.date ?? '1970-01-01')}</updated>
  <author><name>${FEED_TITLE}</name><uri>${SITE}/</uri></author>
${items.join('\n')}
</feed>
`;
}
