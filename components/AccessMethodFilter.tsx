'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { ACCESS_METHOD_LABELS } from '@/lib/search';

const methodColors: Record<string, string> = {
  api: 'border-[var(--blue)]/30 text-[var(--blue)] bg-[var(--blue-glow)]',
  mcp: 'border-[var(--accent)]/30 text-[var(--accent)] bg-[var(--accent-subtle)]',
  cli: 'border-[var(--amber)]/30 text-[var(--amber)] bg-[var(--amber-glow)]',
  'browser-extension':
    'border-[var(--rose)]/30 text-[var(--rose)] bg-[var(--rose-glow)]',
};

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
            onClick={() => toggle(key)}
            className={`px-3 py-1.5 text-xs mono font-medium rounded-lg border transition-all ${
              active
                ? methodColors[key]
                : 'border-[var(--border)] text-[var(--text-muted)] bg-transparent hover:border-[var(--border-accent)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
