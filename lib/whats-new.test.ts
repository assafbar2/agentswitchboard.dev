import { describe, expect, it } from 'vitest';
import { getReleases, MAX_HIGHLIGHTS, parseChangelog } from './changelog';
import { getDropSchedule, type Drop } from './drops';
import { getStacks, type Stack } from './stacks';
import { homepageHighlights, highlightRows, whatsNewEntries, whatsNewOfDrop } from './whats-new';

const highlight = (text: string, path = '/browse') => `- ${text} [Try it](https://agentswitchboard.dev${path})`;
const release = (version: string, date: string, highlights: number) =>
  [
    `## [${version}] - ${date} - Release ${version}`,
    ...(highlights > 0 ? ['### Highlights', ...Array.from({ length: highlights }, (_, i) => highlight(`Feature ${i}.`))] : []),
    '### Changed',
    '- x',
  ].join('\n');

const item = (slug: string) => ({ slug, name: slug.toUpperCase(), date: '2026-03-05', notes: [] });
function drop(date: string, added = 3): Drop {
  return { date, days: [date], added: Array.from({ length: added }, (_, i) => item(`a${i}`)), updated: [item('u')], removed: [] };
}
const stack: Stack = { slug: 'ship-it', title: 'Ship it', promise: 'From idea to deploy.', week: '2026-03-05', items: [] };

describe('whatsNewOfDrop', () => {
  it("sums the drop up, linking its page, and adds its stack of the week, linking the stack", () => {
    const entry = whatsNewOfDrop(drop('2026-03-05'), [stack], []);
    expect(entry).toMatchObject({ kind: 'drop', id: 'drop-2026-03-05', anchor: 'drop-2026-03-05', label: 'Weekly drop' });
    expect(entry.title).toBe('3 new AI agents');
    expect(entry.highlights).toEqual([
      { text: '3 AI agents added and 1 listing updated.', tryIt: '/drops/2026-03-05' },
      { text: 'Stack of the week, **Ship it**: From idea to deploy.', tryIt: '/stacks/ship-it' },
    ]);
    expect(entry.more).toEqual({ href: '/drops/2026-03-05', label: 'The whole drop' });
  });

  it('has one highlight when the drop has no stack', () => {
    expect(whatsNewOfDrop(drop('2026-03-12'), [stack], []).highlights).toHaveLength(1);
  });
});

describe('whatsNewEntries', () => {
  const releases = parseChangelog(
    [release('2.3.1', '2026-03-05', 1), release('2.3.0', '2026-03-01', 2), release('2.2.1', '2026-02-20', 0), release('2.2.0', '2026-02-10', 1)].join('\n')
  );
  const drops = [drop('2026-03-08'), drop('2026-03-05'), drop('2026-02-12'), drop('2026-01-30')];

  it('puts releases with highlights and the drops since the oldest of them in one list, newest first, releases first on a day', () => {
    expect(whatsNewEntries(releases, drops, [], []).map((e) => e.id)).toEqual([
      'drop-2026-03-08',
      '2.3.1',
      'drop-2026-03-05',
      '2.3.0',
      'drop-2026-02-12',
      '2.2.0',
    ]);
  });

  it('gives the homepage the newest highlights from the last 30 days, at most five, each naming its entry', () => {
    const entries = whatsNewEntries(releases, drops, [], []);
    const rows = homepageHighlights(entries, '2026-03-01');
    expect(rows.map((r) => r.id)).toEqual(['drop-2026-03-08-1', 'v2-3-1-1', 'drop-2026-03-05-1', 'v2-3-0-1', 'v2-3-0-2']);
    expect(rows.length).toBeLessThanOrEqual(MAX_HIGHLIGHTS);
    expect(homepageHighlights(entries, '2026-03-06').map((r) => r.entry.id)).toEqual(['drop-2026-03-08']);
    expect(homepageHighlights(entries, '2026-04-01')).toEqual([]);
  });
});

describe("the site's What's new", () => {
  const entries = whatsNewEntries(getReleases(), getDropSchedule().drops, getStacks(), []);

  it('is never older than the newest release or drop', () => {
    const newest = [getReleases()[0].date, getDropSchedule().drops[0]?.date ?? ''].sort().at(-1);
    expect(entries[0].date).toBe(newest);
  });

  it('gives every highlight a unique id', () => {
    const ids = highlightRows(entries).map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
