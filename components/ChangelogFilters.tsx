'use client';

import { useSearchParams } from 'next/navigation';
import { FILTER_BASE, FILTER_OFF, FILTER_ON } from '@/components/filter-chip';
import { count } from '@/lib/analytics';
import {
  LOG_ACTIONS,
  logCount,
  logFilterRules,
  logFilterSearch,
  parseLogFilter,
  type LogCounts,
  type LogFilter,
} from '@/lib/log-filter';
import { formatNumber } from '@/lib/utils';

const ACTION_LABELS = { '': 'All', added: 'Added', updated: 'Updated', removed: 'Removed' } as const;

/**
 * Action and category filters over the change log list `listId`
 * (lib/log-filter.ts). It reads useSearchParams, so the page renders it in a
 * Suspense boundary and it appears once the page has loaded: with JavaScript
 * off the whole log shows, without buttons that would do nothing. A choice
 * is written with history.replaceState, which updates useSearchParams
 * without refetching the page.
 */
export function ChangelogFilters({
  listId,
  categories,
  counts,
}: {
  listId: string;
  categories: { slug: string; name: string }[];
  counts: LogCounts;
}) {
  const filter = parseLogFilter(
    useSearchParams(),
    categories.map((c) => c.slug)
  );
  const total = logCount(counts, { action: '', category: '' });
  const shown = logCount(counts, filter);
  const rules = logFilterRules(listId, filter);

  function update(next: LogFilter) {
    count('changelog_filter', { action: next.action || 'all', category: next.category || 'all' });
    const { pathname, search, hash } = window.location;
    window.history.replaceState(null, '', `${pathname}${logFilterSearch(search, next)}${hash}`);
  }

  return (
    <div className="mt-3">
      {rules && <style>{rules}</style>}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show changes" className="flex flex-wrap gap-2">
          {(['', ...LOG_ACTIONS] as const).map((action) => (
            <button
              key={action || 'all'}
              type="button"
              aria-pressed={filter.action === action}
              onClick={() => update({ ...filter, action })}
              className={`${FILTER_BASE} ${filter.action === action ? FILTER_ON : FILTER_OFF}`}
            >
              {ACTION_LABELS[action]}
              <span className="font-semibold tracking-normal">{formatNumber(logCount(counts, { ...filter, action }))}</span>
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="changelog-category">
          Category
        </label>
        <select
          id="changelog-category"
          value={filter.category}
          onChange={(e) => update({ ...filter, category: e.target.value })}
          className={`min-h-11 max-w-full rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)] ${
            filter.category ? FILTER_ON : FILTER_OFF
          }`}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <p aria-live="polite" className="mt-2 text-[15px] text-[var(--dir-muted)]">
        {shown === total
          ? `Showing all ${formatNumber(total)} changes.`
          : shown === 0
            ? 'No changes match these filters.'
            : `Showing ${formatNumber(shown)} of ${formatNumber(total)} changes.`}
      </p>
    </div>
  );
}
