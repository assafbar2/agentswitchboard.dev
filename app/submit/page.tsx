import { Terminal } from 'lucide-react';
import { SubmitForm } from '@/components/SubmitForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit an Agent',
  description: 'Submit your agent, MCP server, or agentic tool to the directory.',
  alternates: { canonical: '/submit' },
};

export default function SubmitPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-xl mx-auto py-10">
        <div className="text-center mb-8">
          <Terminal className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight mb-3">Submit an Agent</h1>
          <p className="text-[var(--text-secondary)]">
            Got an agent with real API, MCP, CLI, or A2A access? Tell us about
            it — every entry is verified before listing.
          </p>
        </div>

        <SubmitForm />

        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          Developers: the catalog is maintained in the open — you can also
          submit a pull request adding a{' '}
          <span className="mono">content/agents/&lt;slug&gt;.json</span> file.
        </p>
      </div>
    </div>
  );
}
