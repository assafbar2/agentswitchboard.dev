'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { count } from '@/lib/analytics';
import { parseSort, type SortOrder } from '@/lib/search';

const ORDERS: { value: Exclude<SortOrder, 'relevance'>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'skills', label: 'Most skills' },
  { value: 'name', label: 'A–Z' },
];

/** Result order for /browse, kept in the URL as ?sort= (absent for the default). */
export function SortSelect({ hasQuery }: { hasQuery: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = parseSort(searchParams.get('sort'));

  function change(value: SortOrder) {
    count('sort_change', { sort: value });
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'relevance') params.delete('sort');
    else params.set('sort', value);
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : '/browse', { scroll: false });
  }

  return (
    <label className="inline-flex shrink-0 items-center gap-2 text-sm font-bold uppercase tracking-[0.06em] text-[var(--dir-ink)]">
      Sort
      <select
        value={sort}
        onChange={(e) => change(parseSort(e.target.value))}
        className="min-h-11 rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-3 text-sm font-bold normal-case tracking-normal text-[var(--dir-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
      >
        <option value="relevance">{hasQuery ? 'Best match' : 'Featured first'}</option>
        {ORDERS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
