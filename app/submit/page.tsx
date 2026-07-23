import { GitPullRequest, Terminal, FileJson } from 'lucide-react';
import { SubmitForm } from '@/components/SubmitForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'List Your Agent',
  description:
    'Add your agent, MCP server, or agentic tool to the directory — open a pull request or use the form. Every entry is verified before listing.',
  alternates: { canonical: '/submit' },
};

const REPO = 'https://github.com/assafbar2/agentswitchboard.dev';

export default function SubmitPage() {
  return (
    <div className="container-wide pt-8 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Terminal className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight mb-3">List Your Agent</h1>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
            The catalog is maintained in the open — every agent is a JSON file
            in a public repo. Two ways in; every entry is verified before it
            ships.
          </p>
        </div>

        {/* Path A: pull request */}
        <div className="card p-6 mb-6 border-[var(--border-accent)]">
          <div className="flex items-center gap-2 mb-2">
            <GitPullRequest className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-semibold">Open a pull request</h2>
            <span className="mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)]">
              fastest
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Add one file —{' '}
            <span className="mono text-[var(--accent)]">content/agents/&lt;your-slug&gt;.json</span>{' '}
            — CI validates it against the quality bar, we verify your endpoints
            and merge. Merge = live.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`${REPO}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <FileJson className="w-4 h-4" />
              Read the listing guide
            </a>
            <a
              href={`${REPO}/tree/main/content/agents`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] transition-all"
            >
              Browse existing entries
            </a>
          </div>
        </div>

        {/* Path B: form */}
        <div className="card p-6">
          <h2 className="font-semibold mb-1">No GitHub? Use the form</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Tell us what to list and how to reach you — we do the rest.
          </p>
          <SubmitForm />
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          What gets accepted: real products with API, MCP, CLI, or
          browser-extension access and verifiable signals. No vaporware, no
          wrappers. Details in the listing guide.
        </p>
      </div>
    </div>
  );
}
