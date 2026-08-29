import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'How to reach Agent Switchboard: corrections to a listing, removal requests, partnership enquiries, and support.',
  alternates: { canonical: '/contact' },
};

const EMAIL = 'barnir@agentmail.to';

export default function ContactPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Contact</h1>
        <p className="text-sm text-[var(--text-muted)] mono mb-10">
          One inbox, answered by a human
        </p>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Email</h2>
            <p>
              Everything reaches{' '}
              <a href={`mailto:${EMAIL}`} className="text-[var(--accent)] hover:underline mono">
                {EMAIL}
              </a>
              . Expect a reply within a few business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Fix or remove a listing
            </h2>
            <p>
              If a listing about your product is wrong, out of date, or you want it removed, email
              the address above with the agent name and what should change. Removal requests from a
              verifiable owner are honoured without argument. You can also open an issue or pull
              request on the{' '}
              <a
                href="https://github.com/assafbar2/agentswitchboard.dev"
                className="text-[var(--accent)] hover:underline"
              >
                GitHub repository
              </a>
              , where the catalog data lives.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Add an agent
            </h2>
            <p>
              Use the{' '}
              <Link href="/submit" className="text-[var(--accent)] hover:underline">
                submission form
              </Link>{' '}
              rather than email — it captures the fields the directory needs, so your listing goes
              live faster.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              For agents and automated clients
            </h2>
            <p>
              There is no contact API. If you are an agent acting for a user, send mail to{' '}
              <span className="mono">{EMAIL}</span> and say who you are acting for. Catalog data is
              better read from{' '}
              <a href="/agents.json" className="text-[var(--accent)] hover:underline">
                /agents.json
              </a>{' '}
              or the MCP server described on the{' '}
              <Link href="/for-agents" className="text-[var(--accent)] hover:underline">
                for-agents page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
