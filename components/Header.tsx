'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ViewModeToggle } from '@/components/ViewModeToggle';

const navLinks = [
  { href: '/browse', label: 'Browse' },
  { href: '/categories', label: 'Categories' },
  { href: '/for-agents', label: 'For agents' },
  { href: '/submit', label: 'List Your Agent', cta: true },
];

// Terminal look: mono, lowercased by CSS only (the DOM text, and so what
// screen readers announce, is unchanged). The primary CTA is an outlined
// accent button.
const NAV_LINK = 'mono lowercase text-sm transition-colors whitespace-nowrap';
const NAV_PLAIN =
  'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border border-transparent';
const NAV_CTA =
  'text-[var(--accent)] border border-[var(--border-accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]';

const VIEW_MODE_HINT =
  'Switch how pages are shown. For Humans is the normal site; For Agents shows a compact plain-text version of each page, for AI agents and LLM tools. Your choice is remembered in this browser.';

/** The view toggle with a name and an explanation, for hover and for screen readers. */
function LabelledViewModeToggle({ className, toggleClassName }: { className?: string; toggleClassName?: string }) {
  const hintId = useId();
  return (
    <div role="group" aria-label="Page view" aria-describedby={hintId} title={VIEW_MODE_HINT} className={className}>
      <span id={hintId} className="sr-only">
        {VIEW_MODE_HINT}
      </span>
      <ViewModeToggle className={toggleClassName} />
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-accent)] bg-[var(--bg-primary)]/85 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-3 w-3">
            <span className="absolute inset-0 rounded-full bg-[var(--accent)] animate-pulse-glow" />
            <span className="relative rounded-full h-3 w-3 bg-[var(--accent)]" />
          </span>
          <span className="mono text-lg font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
            switchboard
          </span>
        </Link>

        {/* Desktop nav — from lg up; four links plus the toggle don't fit at md. */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-2 rounded-md ${NAV_LINK} ${link.cta ? `ml-2 ${NAV_CTA}` : NAV_PLAIN}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-3">
          {/* Segmented view toggle — replaces Activate Pro. Below lg it lives
              in the mobile menu instead, so it never shows twice. */}
          <LabelledViewModeToggle className="hidden lg:block" />

          <ThemeToggle />

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="container-wide py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-md ${NAV_LINK} ${link.cta ? NAV_CTA : NAV_PLAIN}`}
              >
                {link.label}
              </Link>
            ))}
            {/* View toggle in mobile menu */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <LabelledViewModeToggle toggleClassName="w-full justify-center" />
              <p aria-hidden="true" className="mt-2 px-1 text-xs text-[var(--text-muted)]">
                For Agents shows a compact plain-text version of each page.
              </p>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
