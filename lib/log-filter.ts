/**
 * Filters for the directory change log on /changelog: by action and by
 * category. The page stays static, with every row in the HTML carrying
 * data-action and data-cats; a filter hides the other rows with one style
 * rule. The choice is kept in the URL as ?action=&category=.
 */

import type { ChangelogEntry } from './types';

export const LOG_ACTIONS = ['added', 'updated', 'removed'] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];

export interface LogFilter {
  /** '' for every action. */
  action: LogAction | '';
  /** A category slug, or '' for every category. */
  category: string;
}

/** Entries per category slug, '' for all of them: [every action, added, updated, removed]. */
export type LogCounts = Record<string, [number, number, number, number]>;

export function logCounts(entries: readonly ChangelogEntry[], categoriesOf: (slug: string) => readonly string[]): LogCounts {
  const counts: LogCounts = { '': [0, 0, 0, 0] };
  for (const entry of entries) {
    const column = 1 + LOG_ACTIONS.indexOf(entry.action);
    for (const key of ['', ...new Set(categoriesOf(entry.slug))]) {
      const row = (counts[key] ??= [0, 0, 0, 0]);
      row[0]++;
      row[column]++;
    }
  }
  return counts;
}

/** How many entries a filter keeps. */
export function logCount(counts: LogCounts, { action, category }: LogFilter): number {
  return counts[category]?.[action ? 1 + LOG_ACTIONS.indexOf(action) : 0] ?? 0;
}

/** The filter a URL asks for; an unknown action or category is ignored, so a stale link shows everything. */
export function parseLogFilter(params: URLSearchParams, categories: readonly string[]): LogFilter {
  const action = params.get('action');
  const category = params.get('category');
  return {
    action: LOG_ACTIONS.find((a) => a === action) ?? '',
    category: category && categories.includes(category) ? category : '',
  };
}

/** `search` with the filter in it, other parameters kept. */
export function logFilterSearch(search: string, filter: LogFilter): string {
  const params = new URLSearchParams(search);
  for (const key of ['action', 'category'] as const) {
    if (filter[key]) params.set(key, filter[key]);
    else params.delete(key);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** The style rule that hides the rows of list `listId` a filter leaves out. Values come from parseLogFilter. */
export function logFilterRules(listId: string, { action, category }: LogFilter): string {
  const keep = [action && `[data-action="${action}"]`, category && `[data-cats~="${category}"]`].filter(Boolean);
  return keep.length > 0 ? `#${listId} > li:not(${keep.join('')}) { display: none; }` : '';
}
