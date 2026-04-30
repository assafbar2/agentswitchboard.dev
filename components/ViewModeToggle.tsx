'use client';

import { useEffect, useState } from 'react';

export function ViewModeToggle() {
  const [mode, setMode] = useState<'human' | 'agent'>('human');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('viewMode') as 'human' | 'agent' | null;
    const initial = saved ?? 'human';
    setMode(initial);
    applyMode(initial);
  }, []);

  function applyMode(m: 'human' | 'agent') {
    const html = document.documentElement;
    if (m === 'agent') {
      html.setAttribute('data-view', 'agent');
    } else {
      html.removeAttribute('data-view');
    }
  }

  function toggle() {
    const next = mode === 'human' ? 'agent' : 'human';
    setMode(next);
    applyMode(next);
    localStorage.setItem('viewMode', next);
  }

  if (!mounted) return <div className="w-8 h-8" />;

  const isAgent = mode === 'agent';

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all
        ${isAgent
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-accent)]'
        }
      `}
      aria-label={isAgent ? 'Switch to human view' : 'Switch to agent view'}
      title={isAgent ? 'Agent view — click for human view' : 'Switch to agent view'}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isAgent ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--text-muted)]'}`} />
      {isAgent ? 'agent' : 'human'}
    </button>
  );
}
