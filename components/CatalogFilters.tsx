'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Building2, X } from 'lucide-react';
import { FILTER_BASE, FILTER_OFF, FILTER_ON } from '@/components/AccessMethodFilter';

/**
 * Official toggle + category picker for /browse. Both write to the URL
 * (?official=1, ?category=<slug>) so they combine with each other, with
 * access-method chips, and with the search box.
 */
export function CatalogFilters({
  categories,
  vendorName,
}: {
  categories: { slug: string; name: string }[];
  vendorName?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const official = searchParams.get('official') === '1' || searchParams.get('official') === 'true';
  const category = searchParams.get('category') ?? '';

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      router.push(qs ? `/browse?${qs}` : '/browse');
    },
    [searchParams, router]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={official}
        onClick={() => update(official ? { official: null, vendor: null } : { official: '1' })}
        className={`${FILTER_BASE} ${official ? FILTER_ON : FILTER_OFF}`}
      >
        <Building2 className="w-3.5 h-3.5" aria-hidden />
        Official
      </button>

      {vendorName && (
        <button
          type="button"
          onClick={() => update({ vendor: null })}
          className={`${FILTER_BASE} ${FILTER_ON}`}
        >
          {vendorName}
          <X className="w-3 h-3" aria-label={`Clear ${vendorName}`} />
        </button>
      )}

      <label className="sr-only" htmlFor="category-filter">
        Category
      </label>
      <select
        id="category-filter"
        value={category}
        onChange={(e) => update({ category: e.target.value || null })}
        className={`min-h-11 max-w-full rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)] ${
          category ? FILTER_ON : FILTER_OFF
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
  );
}
