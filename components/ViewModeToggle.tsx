'use client';

import { useEffect, useState } from 'react';

export function ViewModeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<'human' | 'agent'>('human');
  const [mounted, setMounted] = useState(false);

  function applyMode(m: 'human' | 'agent') {
    const html = document.documentElement;
    if (m === 'agent') {
      html.setAttribute('data-view', 'agent');
    } else {
      html.removeAttribute('data-view');
    }
  }

  useEffect(() => {
    // Intentional post-hydration sync from localStorage (SSR can't read it);
    // runs once, so no cascading-render risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const saved = localStorage.getItem('viewMode') as 'human' | 'agent' | null;
    const initial = saved ?? 'human';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initial);
    applyMode(initial);
  }, []);

  function select(next: 'human' | 'agent') {
    setMode(next);
    applyMode(next);
    localStorage.setItem('viewMode', next);
  }

  if (!mounted) return <div className={`h-9 w-40 rounded-lg bg-[var(--bg-card)] ${className ?? ''}`} />;

  return (
    <div
      className={`flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5 text-xs font-medium ${className ?? ''}`}
    >
      <button
        onClick={() => select('human')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
          mode === 'human'
            ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        aria-pressed={mode === 'human'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${mode === 'human' ? 'bg-[var(--text-secondary)]' : 'bg-[var(--border)]'}`} />
        For Humans
      </button>

      <button
        onClick={() => select('agent')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap font-mono ${
          mode === 'agent'
            ? 'bg-[var(--accent)]/15 text-[var(--accent)] shadow-sm border border-[var(--accent)]/20'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        aria-pressed={mode === 'agent'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${mode === 'agent' ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--border)]'}`} />
        For Agents
      </button>
    </div>
  );
}
