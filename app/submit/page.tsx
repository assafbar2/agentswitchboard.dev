import { Terminal } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit an Agent',
  description: 'Submit your A2A-compatible agent to the directory.',
};

export default function SubmitPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-xl mx-auto text-center py-20">
        <Terminal className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">Submit an Agent</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Submission form coming soon. Got an A2A-compatible agent?
          We&apos;ll have a way for you to list it here shortly.
        </p>
        <div className="mono text-xs text-[var(--text-muted)] px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] inline-block">
          Phase 5 · Coming soon
        </div>
      </div>
    </div>
  );
}
