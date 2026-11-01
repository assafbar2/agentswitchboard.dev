'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { count } from '@/lib/analytics';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import { FILTER_BASE, FILTER_OFF, FILTER_ON } from '@/components/filter-chip';

export function AccessMethodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilters = searchParams.get('access')?.split(',').filter(Boolean) ?? [];

  const toggle = useCallback(
    (method: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const wasOn = activeFilters.includes(method);
      const filters = wasOn ? activeFilters.filter((m) => m !== method) : [...activeFilters, method];
      count('filter_change', { filter: 'access', value: method, state: wasOn ? 'off' : 'on' });

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
