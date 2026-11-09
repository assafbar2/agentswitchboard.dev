'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

// Square, ink-bordered control in the Exchange Directory look. 44px so it
// is a comfortable touch target; the placeholder matches its size so the
// header does not shift on mount.
const SIZE = 'w-11 h-11';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [mounted, setMounted] = useState(false);

  function applyTheme(t: 'dark' | 'light') {
    const html = document.documentElement;
    if (t === 'light') {
      html.classList.add('light');
    } else {
      html.classList.remove('light');
    }
  }

  useEffect(() => {
    // Intentional post-hydration sync from localStorage (SSR can't read it);
    // runs once, so no cascading-render risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = saved ?? 'light';

    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    localStorage.setItem('theme', next);
  }

  if (!mounted) return <div className={`${SIZE} shrink-0`} aria-hidden="true" />;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${SIZE} shrink-0 inline-flex items-center justify-center rounded-none border-[3px] border-[var(--dir-ink)] bg-[var(--dir-paper)] text-[var(--dir-ink)] hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] transition-colors cursor-pointer`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}
