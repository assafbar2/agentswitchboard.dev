import { describe, expect, it } from 'vitest';
import {
  describeNotes,
  dropAdditions,
  dropHeadline,
  dropHighlights,
  dropSummary,
  getDropSchedule,
  groupDrops,
  type DropChanges,
} from './drops';
import type { Agent, ChangelogEntry } from './types';

function entry(date: string, action: ChangelogEntry['action'], slug: string, note?: string): ChangelogEntry {
  return { action, slug, name: slug, date, ...(note ? { note } : {}) };
}

/** `n` additions on one day, as content/changelog.json lists them: newest first. */
function adds(date: string, n: number, prefix = `a${date}`): ChangelogEntry[] {
  return Array.from({ length: n }, (_, i) => entry(date, 'added', `${prefix}-${i}`));
}

function updates(date: string, slugs: string[]): ChangelogEntry[] {
  return slugs.map((slug) => entry(date, 'updated', slug, 'description updated'));
}

const ten = Array.from({ length: 10 }, (_, i) => `u${i}`);

describe('groupDrops: what makes a drop', () => {
  it('needs five additions or ten changed listings in a day', () => {
    expect(groupDrops(adds('2026-10-10', 4)).drops).toEqual([]);
    expect(groupDrops(adds('2026-10-10', 5)).drops.map((d) => d.date)).toEqual(['2026-10-10']);
    expect(groupDrops(updates('2026-10-10', ten)).drops.map((d) => d.date)).toEqual(['2026-10-10']);
  });

  it('counts listings, not entries: one listing edited ten times is not a batch', () => {
    expect(groupDrops(updates('2026-10-10', Array(10).fill('same'))).drops).toEqual([]);
  });

  it('takes in batch days up to two days later and is named by its first day', () => {
    const { drops } = groupDrops([...updates('2026-10-26', ten), ...adds('2026-10-24', 5)]);
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({ date: '2026-10-24', days: ['2026-10-24', '2026-10-26'] });
    expect(drops[0].added).toHaveLength(5);
    expect(drops[0].updated).toHaveLength(10);
  });

  it('starts a new drop three days later, and lists drops newest first', () => {
    const { drops } = groupDrops([...adds('2026-10-27', 5), ...adds('2026-10-24', 5)]);
    expect(drops.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-24']);
  });

  it('counts smaller days toward the next drop, and keeps changes after the newest drop pending', () => {
    const { drops, pending } = groupDrops([
      entry('2026-10-28', 'removed', 'old', 'Duplicate'),
      ...adds('2026-10-24', 5),
      entry('2026-10-20', 'added', 'early'),
    ]);
    expect(drops).toHaveLength(1);
    expect(drops[0].days).toEqual(['2026-10-20', '2026-10-24']);
    expect(drops[0].added.map((i) => i.slug)).toContain('early');
    expect(pending).toMatchObject({ days: ['2026-10-28'], added: [], updated: [] });
    expect(pending?.removed).toEqual([{ slug: 'old', name: 'old', date: '2026-10-28', notes: ['Duplicate'] }]);
    expect(groupDrops(adds('2026-10-24', 5)).pending).toBeNull();
  });

  it('groups by date even when the log has entries out of order', () => {
    const { drops } = groupDrops([...adds('2026-08-11', 1, 'late'), ...adds('2026-10-24', 5), ...adds('2026-08-11', 5)]);
    expect(drops.map((d) => [d.date, d.added.length])).toEqual([
      ['2026-10-24', 5],
      ['2026-08-11', 6],
    ]);
  });

  it('attaches intros from content/drops.json by date', () => {
    const { drops } = groupDrops(adds('2026-10-24', 5), { '2026-10-24': { intro: 'A big week.' } });
    expect(drops[0].intro).toBe('A big week.');
  });
});

describe('groupDrops: one line per listing', () => {
  // Same day, newest first: each listing's later entry is listed above its earlier one.
  const { drops } = groupDrops([
    entry('2026-10-24', 'updated', 'fixed', 'agentUrl updated'),
    entry('2026-10-24', 'removed', 'gone', 'Duplicate'),
    entry('2026-10-24', 'added', 'back'),
    entry('2026-10-24', 'removed', 'back'),
    entry('2026-10-24', 'updated', 'edited', 'providerUrl updated'),
    entry('2026-10-24', 'updated', 'edited', 'providerName updated'),
    entry('2026-10-24', 'updated', 'edited', 'providerName updated'),
    ...adds('2026-10-24', 3),
    entry('2026-10-24', 'added', 'fixed', 'Its one-liner.'),
    entry('2026-10-24', 'added', 'gone'),
  ]);
  const [drop] = drops;

  it('an addition fixed in the same drop is an addition', () => {
    expect(drop.added.find((i) => i.slug === 'fixed')).toEqual({
      slug: 'fixed',
      name: 'fixed',
      date: '2026-10-24',
      notes: ['Its one-liner.'],
    });
    expect(drop.updated.map((i) => i.slug)).not.toContain('fixed');
  });

  it('the last action decides: added then removed is removed, removed then re-added is added', () => {
    expect(drop.removed.map((i) => i.slug)).toEqual(['gone']);
    expect(drop.added.map((i) => i.slug)).toContain('back');
  });

  it('several edits to one listing are one update with each note once, oldest first', () => {
    expect(drop.updated).toEqual([
      { slug: 'edited', name: 'edited', date: '2026-10-24', notes: ['providerName updated', 'providerUrl updated'] },
    ]);
  });
});

function agent(slug: string, overrides: Partial<Agent> = {}): Agent {
  return {
    id: slug,
    name: slug,
    slug,
    description: `${slug} does one thing well for agents.`,
    providerName: slug,
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
    accessMethods: ['mcp'],
    ...overrides,
  };
}

function officialOf(slug: string, vendor: string): Agent {
  return agent(slug, { providerName: vendor, official: true, officialVendor: { slug: vendor.toLowerCase(), name: vendor } });
}

const item = (slug: string) => ({ slug, name: slug, date: '2026-10-31', notes: [] });

describe('dropAdditions and dropHighlights', () => {
  const catalog = [
    agent('zeta'),
    officialOf('small-mcp', 'Small'),
    agent('alpha'),
    officialOf('big-b', 'Big'),
    officialOf('big-a', 'Big'),
    officialOf('big-other', 'Big'),
  ];
  const changes: DropChanges = {
    days: ['2026-10-31'],
    added: ['zeta', 'small-mcp', 'alpha', 'big-b', 'big-a', 'archived'].map(item),
    updated: [],
    removed: [],
  };

  it('lists Official first, the biggest vendor first, then the rest A→Z; and sets aside what has left', () => {
    const { listed, gone } = dropAdditions(changes, catalog);
    expect(listed.map((a) => a.slug)).toEqual(['big-a', 'big-b', 'small-mcp', 'alpha', 'zeta']);
    expect(gone.map((i) => i.slug)).toEqual(['archived']);
  });

  it('highlights one listing per provider before repeating one', () => {
    const { listed } = dropAdditions(changes, catalog);
    expect(dropHighlights(listed).map((a) => a.slug)).toEqual(['big-a', 'small-mcp', 'alpha']);
    expect(dropHighlights(listed, 5).map((a) => a.slug)).toEqual(['big-a', 'small-mcp', 'alpha', 'zeta', 'big-b']);
  });

  it('sums a drop up in one line', () => {
    const { listed } = dropAdditions(changes, catalog);
    const drop = { ...changes, updated: [item('u1'), item('u2')], removed: [item('r1')] };
    expect(dropHeadline(drop)).toBe('6 new AI agents');
    expect(dropSummary(drop, listed)).toBe(
      '6 AI agents added (3 Official), 2 listings updated and 1 removed, including big-a, small-mcp and alpha.'
    );
    const updatesOnly = { days: [], added: [], updated: [item('u1')], removed: [] };
    expect(dropHeadline(updatesOnly)).toBe('1 listing updated');
    expect(dropSummary(updatesOnly, [])).toBe('1 listing updated.');
    const removalsOnly = { days: [], added: [], updated: [], removed: Array.from({ length: 12 }, (_, i) => item(`r${i}`)) };
    expect(dropHeadline(removalsOnly)).toBe('12 listings removed');
    expect(dropSummary(removalsOnly, [])).toBe('12 listings removed.');
  });
});

describe('describeNotes', () => {
  it('turns logged field edits into one plain sentence', () => {
    expect(describeNotes(['agentUrl updated', 'providerName updated', 'providerUrl updated'])).toBe(
      'Product link, provider name and provider link updated.'
    );
    expect(describeNotes(['tags updated'])).toBe('Tags updated.');
  });

  it('keeps written notes as sentences, after the field edits', () => {
    expect(describeNotes(['Fixed dead URL', 'accessMethods updated'])).toBe('Access methods updated. Fixed dead URL.');
    expect(describeNotes(['Re-described as the managed cloud.'])).toBe('Re-described as the managed cloud.');
    expect(describeNotes([])).toBe('');
  });
});

describe('the drops in content/changelog.json', () => {
  const { drops } = getDropSchedule();

  it('are unique and newest first', () => {
    const dates = drops.map((d) => d.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('include the Oct 30 weekly drop, merged on Oct 31 UTC, with its intro', () => {
    const drop = drops.find((d) => d.date === '2026-10-31');
    expect(drop?.added.map((i) => i.slug)).toEqual(expect.arrayContaining(['xcode-mcp', 'android-cli', 'copilot-sdk']));
    expect(drop?.intro).toBeTruthy();
  });
});
