'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Building2, LockOpen, Verified, X } from 'lucide-react';
import { FILTER_BASE, FILTER_OFF, FILTER_ON } from '@/components/filter-chip';
import { count } from '@/lib/analytics';
import { normalizeAuthTypes } from '@/lib/public-api';
import { parseFlag } from '@/lib/search';

/**
 * Official, Verified and No auth needed toggles + category picker for
 * /browse. All write to the URL (?official=1, ?verified=1, ?auth=none,
 * ?category=<slug>) so they combine with each other, with access-method
 * chips, and with the search box.
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
  const official = parseFlag(searchParams.get('official'));
  const verified = parseFlag(searchParams.get('verified'));
  const auth = normalizeAuthTypes(searchParams.get('auth')?.split(',') ?? []);
  const noAuth = auth.length === 1 && auth[0] === 'none';
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

  const toggle = (filter: string, wasOn: boolean, changes: Record<string, string | null>) => {
    count('filter_change', { filter, state: wasOn ? 'off' : 'on' });
    update(changes);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={official}
        onClick={() => toggle('official', official, official ? { official: null, vendor: null } : { official: '1' })}
        className={`${FILTER_BASE} ${official ? FILTER_ON : FILTER_OFF}`}
      >
        <Building2 className="w-3.5 h-3.5" aria-hidden />
        Official
      </button>

      {vendorName && (
        <button
          type="button"
          onClick={() => toggle('vendor', true, { vendor: null })}
          className={`${FILTER_BASE} ${FILTER_ON}`}
        >
          {vendorName}
          <X className="w-3 h-3" aria-label={`Clear ${vendorName}`} />
        </button>
      )}

      <button
        type="button"
        aria-pressed={verified}
        onClick={() => toggle('verified', verified, { verified: verified ? null : '1' })}
        className={`${FILTER_BASE} ${verified ? FILTER_ON : FILTER_OFF}`}
      >
        <Verified className="w-3.5 h-3.5" aria-hidden />
        Verified
      </button>

      <button
        type="button"
        aria-pressed={noAuth}
        onClick={() => toggle('auth', noAuth, { auth: noAuth ? null : 'none' })}
        className={`${FILTER_BASE} ${noAuth ? FILTER_ON : FILTER_OFF}`}
      >
        <LockOpen className="w-3.5 h-3.5" aria-hidden />
        No auth needed
      </button>

      <label className="sr-only" htmlFor="category-filter">
        Category
      </label>
      <select
        id="category-filter"
        value={category}
        onChange={(e) => {
          count('filter_change', { filter: 'category', value: e.target.value || 'all' });
          update({ category: e.target.value || null });
        }}
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
