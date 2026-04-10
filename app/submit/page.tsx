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
          Got an A2A-compatible agent? Drop us an email with your agent details
          and we&apos;ll get it listed.
        </p>
        <a
          href="mailto:barnir@agentmail.to?subject=Agent Submission — [Agent Name]"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity mb-4"
        >
          barnir@agentmail.to
        </a>
        <p className="text-xs text-[var(--text-muted)]">
          Please include: agent name, URL, description, and access methods (API/MCP/CLI/Extension).
        </p>
      </div>
    </div>
  );
}
