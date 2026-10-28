import Link from 'next/link';
import { Unplug } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Not Found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="container-wide section">
      <div className="max-w-xl mx-auto text-center py-20">
        <Unplug className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          404 — no agent on this line
        </h1>
        <p className="text-[var(--text-secondary)] mb-8">
          This page doesn&apos;t exist, or the agent was disconnected from the
          switchboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/browse"
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--dir-yellow)] px-6 text-[17px] font-extrabold text-[var(--dir-on-yellow)] no-underline hover:underline cursor-pointer [font-family:var(--font-display)]"
          >
            Browse all agents
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--dir-ink)]! px-6 text-[17px] font-bold text-[var(--dir-ink)] no-underline hover:underline [font-family:var(--font-display)]"
          >
            Back to home
          </Link>
        </div>

        {/* Machine-readable entry points, so an agent that lands on a dead URL
            can recover instead of concluding the site is a wall. */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] text-sm text-[var(--text-secondary)]">
          <p className="mb-2">Looking for structured data? Start here:</p>
          <ul className="space-y-1 mono text-xs">
            <li>
              <a href="/llms.txt" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
                /llms.txt
              </a>{' '}
              — what this site is and when to use it
            </li>
            <li>
              <a href="/sitemap.xml" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
                /sitemap.xml
              </a>{' '}
              — every valid URL
            </li>
            <li>
              <a href="/agents.json" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
                /agents.json
              </a>{' '}
              — the full catalog as JSON
            </li>
            <li>
              <a href="/openapi.json" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
                /openapi.json
              </a>{' '}
              — the HTTP surface
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
