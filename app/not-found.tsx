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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Browse all agents
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] transition-all"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
