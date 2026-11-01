'use client';

import { useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { count } from '@/lib/analytics';
import { browseHref } from '@/lib/search';

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search agents, skills, categories...',
  autoFocus = false,
  label,
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Visible label above the box (e.g. "Look it up"). Without one the box keeps its aria-label. */
  label?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState(defaultValue);

  // Follow the URL's query when it changes under a mounted bar (back/forward
  // between searches), so the box never shows a different query than the results.
  const [syncedDefault, setSyncedDefault] = useState(defaultValue);
  if (defaultValue !== syncedDefault) {
    setSyncedDefault(defaultValue);
    setValue(defaultValue);
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // On /browse, keep the active category/access/official/vendor filters;
      // elsewhere (the homepage hero) start a fresh search. Read at submit time
      // rather than with useSearchParams, which would need a Suspense boundary
      // on the statically rendered homepage.
      const current = window.location.pathname === '/browse' ? window.location.search : '';
      const words = value.trim().split(/\s+/).filter(Boolean).length;
      count('search_submit', { page: window.location.pathname, words });
      router.push(browseHref(value, current));
    },
    [value, router]
  );

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="w-full [font-family:var(--font-display)]"
    >
      {label && (
        <label
          htmlFor={inputId}
          className="dir-label mb-1.5 block text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--dir-ink)]"
        >
          {label}
        </label>
      )}
      <div className="flex border-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--dir-ink)]">
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={label ? undefined : 'Search the directory'}
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="min-h-[50px] min-w-0 flex-1 rounded-none border-0 bg-transparent px-3.5 text-[19px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] outline-none"
        />
        <button
          type="submit"
          className="min-h-[50px] min-w-[64px] shrink-0 cursor-pointer rounded-none border-0 border-l-[3px] border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-5 text-[17px] font-extrabold text-[var(--dir-on-yellow)] hover:underline focus-visible:outline-2 focus-visible:-outline-offset-6 focus-visible:outline-[var(--dir-on-yellow)]"
        >
          Find
        </button>
      </div>
    </form>
  );
}
