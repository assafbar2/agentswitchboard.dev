import { describe, expect, it } from 'vitest';
import type { Drop } from './drops';
import { isNew, NEW_DAYS, newListings, newSince } from './freshness';
import type { Agent } from './types';

function agent(slug: string, createdAt: string | undefined, over: Partial<Agent> = {}): Agent {
  return { id: slug, slug, name: slug, providerName: slug, official: false, createdAt, ...over } as Agent;
}

function drop(date: string, days: string[]): Drop {
  return { date, days, added: [], updated: [], removed: [] };
}

describe('newSince and isNew', () => {
  const now = Date.parse('2026-11-02T09:00:00Z');

  it(`counts today and the ${NEW_DAYS - 1} days before it`, () => {
    expect(newSince(now)).toBe('2026-10-04');
    expect(isNew('2026-10-04T00:00:00.000Z', newSince(now))).toBe(true);
    expect(isNew('2026-10-03T23:59:59.000Z', newSince(now))).toBe(false);
    expect(isNew('2026-11-02T08:00:00Z', newSince(now))).toBe(true);
  });

  it('moves on at midnight UTC, not at the hour a listing was added', () => {
    expect(newSince(Date.parse('2026-11-02T23:59:00Z'))).toBe('2026-10-04');
    expect(newSince(Date.parse('2026-11-03T00:00:00Z'))).toBe('2026-10-05');
  });

  it('is never new without a date it can read', () => {
    expect(isNew(undefined, '2026-10-04')).toBe(false);
    expect(isNew('', '2026-10-04')).toBe(false);
    expect(isNew('yesterday', '2026-10-04')).toBe(false);
  });
});

describe('newListings', () => {
  const drops = [
    drop('2026-10-31', ['2026-10-28', '2026-10-31']),
    drop('2026-10-24', ['2026-10-24', '2026-10-25']),
    drop('2026-10-04', ['2026-09-26', '2026-10-04']),
  ];
  const since = '2026-10-04';

  it('groups the new listings by the drop that took them in, newest first, with later additions first', () => {
    const catalog = [
      agent('quiet-day', '2026-10-28T00:00:00Z'),
      agent('batch', '2026-10-31T00:00:00Z'),
      agent('merged-day', '2026-10-25T00:00:00Z'),
      agent('edge', '2026-10-04T00:00:00Z'),
      agent('too-old', '2026-09-26T00:00:00Z'),
      agent('after-drops', '2026-11-01T00:00:00Z'),
    ];
    const groups = newListings(catalog, drops, since);
    expect(groups.map((g) => [g.drop?.date ?? null, g.agents.map((a) => a.slug)])).toEqual([
      [null, ['after-drops']],
      ['2026-10-31', ['batch', 'quiet-day']],
      ['2026-10-24', ['merged-day']],
      ['2026-10-04', ['edge']],
    ]);
  });

  it('places a day between drops in the next drop, and leaves out drops with nothing new', () => {
    const groups = newListings([agent('gap', '2026-10-20T00:00:00Z')], drops, since);
    expect(groups.map((g) => g.drop?.date)).toEqual(['2026-10-24']);
  });

  it('ranks each group like a drop page: Official first, biggest vendor first, then A→Z', () => {
    const vendor = (name: string) => ({ official: true, officialVendor: { slug: name, name } });
    const catalog = [
      agent('zeta', '2026-10-31T00:00:00Z'),
      agent('alpha', '2026-10-31T00:00:00Z'),
      agent('small-co', '2026-10-31T00:00:00Z', vendor('small')),
      agent('big-co', '2026-10-31T00:00:00Z', vendor('big')),
      agent('big-old', '2026-01-01T00:00:00Z', vendor('big')),
    ];
    expect(newListings(catalog, drops, since)[0].agents.map((a) => a.slug)).toEqual([
      'big-co',
      'small-co',
      'alpha',
      'zeta',
    ]);
  });

  it('is empty when nothing is new', () => {
    expect(newListings([agent('old', '2026-01-01T00:00:00Z')], drops, since)).toEqual([]);
  });
});
