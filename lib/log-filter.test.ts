import { describe, expect, it } from 'vitest';
import { logCount, logCounts, logFilterRules, logFilterSearch, parseLogFilter } from './log-filter';
import type { ChangelogEntry } from './types';

const entry = (slug: string, action: ChangelogEntry['action']): ChangelogEntry => ({
  slug,
  name: slug,
  action,
  date: '2026-10-31',
});

describe('logCounts and logCount', () => {
  const categories: Record<string, string[]> = { db: ['data', 'infra'], mail: ['communication'] };
  const counts = logCounts(
    [entry('db', 'added'), entry('db', 'updated'), entry('mail', 'added'), entry('gone', 'removed')],
    (slug) => categories[slug] ?? []
  );

  it('counts every entry under all categories and under each of its own', () => {
    expect(counts['']).toEqual([4, 2, 1, 1]);
    expect(counts.data).toEqual([2, 1, 1, 0]);
    expect(counts.communication).toEqual([1, 1, 0, 0]);
    expect(Object.keys(counts).sort()).toEqual(['', 'communication', 'data', 'infra']);
  });

  it('reads the count for an action and category, and 0 for a category with no entries', () => {
    expect(logCount(counts, { action: '', category: '' })).toBe(4);
    expect(logCount(counts, { action: 'added', category: 'infra' })).toBe(1);
    expect(logCount(counts, { action: 'removed', category: 'data' })).toBe(0);
    expect(logCount(counts, { action: 'added', category: 'legal' })).toBe(0);
  });

  it('counts a listing once per category even if it lists a category twice', () => {
    expect(logCounts([entry('x', 'added')], () => ['data', 'data']).data).toEqual([1, 1, 0, 0]);
  });
});

describe('parseLogFilter', () => {
  const slugs = ['data', 'infra'];

  it('reads a known action and category from the URL', () => {
    expect(parseLogFilter(new URLSearchParams('action=removed&category=infra'), slugs)).toEqual({
      action: 'removed',
      category: 'infra',
    });
  });

  it('ignores an unknown action or category, so a stale link shows everything', () => {
    expect(parseLogFilter(new URLSearchParams('action=deleted&category=legal'), slugs)).toEqual({
      action: '',
      category: '',
    });
    expect(parseLogFilter(new URLSearchParams(''), slugs)).toEqual({ action: '', category: '' });
  });
});

describe('logFilterSearch', () => {
  it('writes the filter into the query and keeps other parameters', () => {
    expect(logFilterSearch('?utm=x', { action: 'added', category: 'data' })).toBe('?utm=x&action=added&category=data');
    expect(logFilterSearch('?action=added&category=data', { action: '', category: 'data' })).toBe('?category=data');
    expect(logFilterSearch('?action=added', { action: '', category: '' })).toBe('');
  });
});

describe('logFilterRules', () => {
  it('hides the rows that miss the action, the category, or both', () => {
    expect(logFilterRules('log', { action: '', category: '' })).toBe('');
    expect(logFilterRules('log', { action: 'added', category: '' })).toBe(
      '#log > li:not([data-action="added"]) { display: none; }'
    );
    expect(logFilterRules('log', { action: 'updated', category: 'data' })).toBe(
      '#log > li:not([data-action="updated"][data-cats~="data"]) { display: none; }'
    );
  });
});
