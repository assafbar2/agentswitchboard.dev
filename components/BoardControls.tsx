'use client';

import { useSearchParams } from 'next/navigation';
import { FILTER_BASE, FILTER_OFF, FILTER_ON } from '@/components/filter-chip';
import { count } from '@/lib/analytics';
import {
  boardDropName,
  boardFilterRules,
  boardFilterSearch,
  boardStatus,
  parseBoardFilter,
  type BoardFilter,
  type BoardSummary,
} from '@/lib/board';
import { formatNumber } from '@/lib/utils';

/**
 * The board's toggles: one category, and only the newest drop's jacks. It
 * reads useSearchParams, so the page renders it in a Suspense boundary and it
 * appears once the page has loaded: with JavaScript off the whole board
 * shows, without buttons that would do nothing. A choice is written with
 * history.replaceState, like the change log's filters, and dims the rest of
 * board `boardId` with one style rule.
 */
export function BoardControls({ boardId, summary }: { boardId: string; summary: BoardSummary }) {
  const filter = parseBoardFilter(
    useSearchParams(),
    summary.panels.map((p) => p.slug)
  );
  const rules = boardFilterRules(boardId, filter);

  function update(next: BoardFilter) {
    if (next.week !== filter.week) count('board_week_toggle', { on: next.week });
    const { pathname, search, hash } = window.location;
    window.history.replaceState(null, '', `${pathname}${boardFilterSearch(search, next)}${hash}`);
    if (next.category && next.category !== filter.category) {
      document.querySelector(`#${boardId} > [data-cat="${next.category}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  return (
    <div className="mt-4">
      {rules && <style>{rules}</style>}
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="board-category">
          Category
        </label>
        <select
          id="board-category"
          value={filter.category}
          onChange={(e) => update({ ...filter, category: e.target.value })}
          className={`min-h-11 max-w-full rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)] ${
            filter.category ? FILTER_ON : FILTER_OFF
          }`}
        >
          <option value="">All categories</option>
          {summary.panels.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} · {formatNumber(p.listings)}
            </option>
          ))}
        </select>
        {summary.lit > 0 && (
          <button
            type="button"
            aria-pressed={filter.week}
            onClick={() => update({ ...filter, week: !filter.week })}
            className={`${FILTER_BASE} ${filter.week ? FILTER_ON : FILTER_OFF}`}
          >
            Only {boardDropName(summary)}
            <span className="font-semibold tracking-normal">{formatNumber(summary.lit)}</span>
          </button>
        )}
      </div>
      <p aria-live="polite" className="mt-2 text-[15px] text-[var(--dir-muted)]">
        {boardStatus(summary, filter)}
      </p>
    </div>
  );
}
