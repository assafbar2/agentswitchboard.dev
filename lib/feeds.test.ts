import { describe, expect, it } from 'vitest';
import type { Release } from './changelog';
import type { Drop, DropItem } from './drops';
import { atomFeed, dropEntry, FEED_NAMES, feedEntries, releaseEntry, rssFeed } from './feeds';
import type { Agent } from './types';

const SITE = 'https://agentswitchboard.dev';

const withHighlights: Release = {
  version: '2.5.0',
  date: '2026-11-02',
  title: 'Come back',
  highlights: [
    { text: 'See what is `new`.', tryIt: '/new' },
    { text: 'Filter the log.', tryIt: '/changelog?action=added&category=infrastructure#directory-changes' },
  ],
  sections: [{ name: 'Added', items: ['New listings.'] }],
};

const withoutHighlights: Release = {
  version: '2.1.0',
  date: '2026-10-01',
  title: 'Older',
  highlights: [],
  sections: [
    { name: 'Added', items: ['A [link](https://agentswitchboard.dev/connect).'] },
    { name: 'Fixed', items: ['A <fix>.'] },
  ],
};

function agent(slug: string, name = slug): Agent {
  return {
    id: slug,
    name,
    slug,
    description: '',
    providerName: name,
    providerUrl: 'https://example.com',
    agentUrl: 'https://example.com',
    categories: [],
    tags: [],
    skills: [],
    authType: 'none',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['api'],
  };
}

const item = (slug: string, name = slug): DropItem => ({ slug, name, date: '2026-10-31', notes: [] });

const drop: Drop = {
  date: '2026-10-31',
  days: ['2026-10-31'],
  intro: 'Apps & agents.',
  added: [item('kept', 'Kept'), item('since-removed', 'Since Removed')],
  updated: [item('kept', 'Kept')],
  removed: [item('old', 'Old <One>')],
};

describe('releaseEntry', () => {
  it('links /whats-new and lists the highlights, each with its Try it link, then the full notes', () => {
    const entry = releaseEntry(withHighlights);
    expect(entry).toMatchObject({
      url: `${SITE}/whats-new#v2-5-0`,
      title: 'Agent Switchboard 2.5.0: Come back',
      date: '2026-11-02',
    });
    expect(entry.html).toBe(
      '<ul>' +
        `<li>See what is <code>new</code>. <a href="${SITE}/new">Try it</a></li>` +
        `<li>Filter the log. <a href="${SITE}/changelog?action=added&amp;category=infrastructure#directory-changes">Try it</a></li>` +
        '</ul>' +
        `<p><a href="${SITE}/changelog#v2-5-0">All the notes for 2.5.0</a></p>`
    );
  });

  it('falls back to the sections, and links /changelog, for a release without highlights', () => {
    const entry = releaseEntry(withoutHighlights);
    expect(entry.url).toBe(`${SITE}/changelog#v2-1-0`);
    expect(entry.html).toBe(
      `<p><strong>Added</strong></p><ul><li>A <a href="${SITE}/connect">link</a>.</li></ul>` +
        '<p><strong>Fixed</strong></p><ul><li>A &lt;fix&gt;.</li></ul>'
    );
  });
});

describe('dropEntry', () => {
  it('names what the drop added, updated and removed, linking the listings still listed', () => {
    const entry = dropEntry(drop, [agent('kept', 'Kept')]);
    expect(entry).toMatchObject({
      url: `${SITE}/drops/2026-10-31`,
      title: 'The Oct 31, 2026 drop: 2 new AI agents',
      date: '2026-10-31',
    });
    expect(entry.html).toBe(
      '<p>Apps &amp; agents.</p>' +
        `<p><strong>Added (2)</strong>: <a href="${SITE}/agents/kept">Kept</a>, Since Removed</p>` +
        `<p><strong>Updated (1)</strong>: <a href="${SITE}/agents/kept">Kept</a></p>` +
        '<p><strong>Removed (1)</strong>: Old &lt;One&gt;</p>' +
        `<p><a href="${SITE}/drops/2026-10-31">See the drop</a></p>`
    );
  });

  it(`names at most ${FEED_NAMES} of each kind, then says how many more`, () => {
    const slugs = Array.from({ length: FEED_NAMES + 3 }, (_, i) => `a${String(i).padStart(2, '0')}`);
    const big: Drop = { date: '2026-10-31', days: ['2026-10-31'], added: slugs.map((s) => item(s)), updated: [], removed: [] };
    const html = dropEntry(big, slugs.map((s) => agent(s))).html;
    expect(html.match(/<a href="https:\/\/agentswitchboard\.dev\/agents\//g)).toHaveLength(FEED_NAMES);
    expect(html).toContain(' and 3 more</p>');
    expect(html).not.toContain('Updated');
  });
});

describe('feedEntries', () => {
  const sameDay: Drop = { ...drop, date: '2026-11-02', days: ['2026-11-02'] };

  it('puts the newest first, and a release before a drop of the same day', () => {
    const entries = feedEntries([withHighlights, withoutHighlights], [sameDay, drop], [agent('kept')]);
    expect(entries.map((e) => e.url)).toEqual([
      `${SITE}/whats-new#v2-5-0`,
      `${SITE}/drops/2026-11-02`,
      `${SITE}/drops/2026-10-31`,
      `${SITE}/changelog#v2-1-0`,
    ]);
    expect(feedEntries([withHighlights, withoutHighlights], [sameDay, drop], [], 2)).toHaveLength(2);
  });
});

describe('rssFeed and atomFeed', () => {
  const entries = feedEntries([withHighlights], [drop], [agent('kept', 'Kept')]);

  it('write RSS 2.0 with each entry dated, linked and its HTML escaped', () => {
    const rss = rssFeed(entries);
    expect(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"')).toBe(true);
    expect(rss).toContain(`<atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>`);
    expect(rss).toContain('<lastBuildDate>Mon, 02 Nov 2026 00:00:00 GMT</lastBuildDate>');
    expect(rss.match(/<item>/g)).toHaveLength(2);
    expect(rss).toContain(`<guid isPermaLink="true">${SITE}/whats-new#v2-5-0</guid>`);
    expect(rss).toContain('<pubDate>Sat, 31 Oct 2026 00:00:00 GMT</pubDate>');
    expect(rss).toContain('<description>&lt;ul&gt;&lt;li&gt;See what is &lt;code&gt;new&lt;/code&gt;.');
    expect(rss).not.toMatch(/<description>[^<]*<(?!\/description>)/);
  });

  it('write Atom 1.0 with a stable id per entry and its HTML escaped', () => {
    const atom = atomFeed(entries);
    expect(atom).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(atom).toContain(`<id>${SITE}/atom.xml</id>`);
    expect(atom).toContain(`<link rel="self" type="application/atom+xml" href="${SITE}/atom.xml"/>`);
    expect(atom).toContain('<updated>2026-11-02T00:00:00Z</updated>');
    expect(atom.match(/<entry>/g)).toHaveLength(2);
    expect(atom).toContain(`<id>${SITE}/drops/2026-10-31</id>`);
    expect(atom).toContain('<content type="html">&lt;p&gt;Apps &amp;amp; agents.&lt;/p&gt;');
    expect(atom).not.toMatch(/<content type="html">[^<]*<(?!\/content>)/);
  });
});
