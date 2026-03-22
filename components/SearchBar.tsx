'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (q) {
        router.push(`/browse?q=${encodeURIComponent(q)}`);
      } else {
        router.push('/browse');
      }
    },
    [value, router]
  );

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-11 pr-14 py-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all mono"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] mono text-[var(--text-muted)] bg-white/[0.04] border border-[var(--border)] pointer-events-none">
        ↵
      </kbd>
    </form>
  );
}
