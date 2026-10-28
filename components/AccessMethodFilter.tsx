'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { ACCESS_METHOD_LABELS } from '@/lib/search';

// Square, ink-bordered toggles; the pressed one is filled with ink.
export const FILTER_BASE =
  'inline-flex min-h-11 items-center gap-1.5 rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-bold uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';
export const FILTER_ON = 'bg-[var(--dir-ink)] text-[var(--dir-paper)]';
export const FILTER_OFF =
  'bg-[var(--dir-paper)] text-[var(--dir-ink)] hover:bg-[var(--dir-rule)]';

export function AccessMethodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilters = searchParams.get('access')?.split(',').filter(Boolean) ?? [];

  const toggle = useCallback(
    (method: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const filters = activeFilters.includes(method)
        ? activeFilters.filter((m) => m !== method)
        : [...activeFilters, method];

      if (filters.length > 0) {
        params.set('access', filters.join(','));
      } else {
        params.delete('access');
      }

      router.push(`/browse?${params.toString()}`);
    },
    [activeFilters, searchParams, router]
  );

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(ACCESS_METHOD_LABELS).map(([key, label]) => {
        const active = activeFilters.includes(key);
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(key)}
            className={`${FILTER_BASE} ${active ? FILTER_ON : FILTER_OFF}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
