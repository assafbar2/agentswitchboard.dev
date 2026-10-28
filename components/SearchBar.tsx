'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { browseHref } from '@/lib/search';

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search agents, skills, categories...',
  autoFocus = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
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
      router.push(browseHref(value, current));
    },
    [value, router]
  );

  return (
    <form onSubmit={handleSubmit} role="search" className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--accent)] pointer-events-none" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search the directory"
        enterKeyHint="search"
        autoFocus={autoFocus}
        className="w-full pl-11 pr-14 py-3.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-accent)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] text-sm text-[var(--text-primary)] caret-[var(--accent)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-colors mono"
      />
      <kbd
        aria-hidden
        className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex px-2 py-0.5 rounded-sm text-[11px] mono text-[var(--text-tertiary)] bg-[var(--text-primary)]/5 border border-[var(--border)] pointer-events-none"
      >
        ↵
      </kbd>
    </form>
  );
}
