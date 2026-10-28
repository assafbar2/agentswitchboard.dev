'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { AgentBar } from '@/components/AgentBar';

const navLinks = [
  { href: '/browse', label: 'Browse' },
  { href: '/categories', label: 'Categories' },
  { href: '/for-agents', label: 'For agents' },
  { href: '/submit', label: 'List Your Agent' },
];

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

const navLinkClass =
  'text-[var(--dir-ink)] decoration-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Agent entry: the first thing on every page, in human and agent view. */}
      <AgentBar />

      <header className="sticky top-0 z-50 border-b-[3px] border-[var(--dir-ink)] bg-[var(--dir-paper)] font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="flex h-16 items-stretch">
          {/* Logo block */}
          <Link
            href="/"
            className="flex shrink-0 items-center bg-[var(--dir-yellow)] px-4 text-xl font-extrabold tracking-[-0.01em] text-[var(--dir-on-yellow)] no-underline hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[6px] focus-visible:outline-[var(--dir-on-yellow)] sm:px-6 sm:text-2xl lg:px-10"
          >
            Agent Switchboard
          </Link>

          {/* Desktop nav — from lg up; four links plus the toggle don't fit at md. */}
          <nav aria-label="Main" className="hidden items-center gap-[30px] px-10 text-[17px] font-semibold lg:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`${navLinkClass} whitespace-nowrap py-2`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* View toggle, theme, mobile menu */}
          <div className="ml-auto flex items-center gap-3 pl-3 pr-4 sm:pr-6 lg:pr-10">
            {/* Segmented view toggle. Below lg it lives in the mobile menu
                instead, so it never shows twice. */}
            <LabelledViewModeToggle className="hidden lg:block" />

            <ThemeToggle />

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex h-11 w-11 items-center justify-center border-[3px] border-[var(--dir-ink)] text-[var(--dir-ink)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)] lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav aria-label="Main" className="border-t-[3px] border-[var(--dir-ink)] bg-[var(--dir-paper)] lg:hidden">
            <div className="flex flex-col px-4 py-3 sm:px-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`${navLinkClass} flex min-h-11 items-center border-b border-[var(--dir-rule)] px-1 text-[17px] font-semibold`}
                >
                  {link.label}
                </Link>
              ))}
              {/* View toggle in mobile menu */}
              <div className="mt-4">
                <LabelledViewModeToggle toggleClassName="w-full [&>button]:flex-1 [&>button]:justify-center" />
                <p aria-hidden="true" className="mt-2 px-1 text-sm text-[var(--dir-muted)]">
                  For Agents shows a compact plain-text version of each page.
                </p>
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
