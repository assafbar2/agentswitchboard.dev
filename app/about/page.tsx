import Link from 'next/link';
import type { Metadata } from 'next';
import { getAgentCount, getUniqueProviderCount } from '@/lib/catalog';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'About',
  description:
    'What Agent Switchboard is, who maintains it, how agents get listed, and how the directory is kept accurate.',
  alternates: { canonical: '/about' },
};

export default async function AboutPage() {
  const [agentCount, providerCount] = await Promise.all([
    getAgentCount(),
    getUniqueProviderCount(),
  ]);

  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">About Agent Switchboard</h1>
        <p className="text-sm text-[var(--text-muted)] mono mb-10">
          A directory for the agentic web
        </p>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              What this is
            </h2>
            <p>
              Agent Switchboard is a curated directory of AI agents, MCP servers, and agentic
              developer tools. It currently lists {agentCount} agents from {providerCount}{' '}
              providers. Every entry records what an agent actually does and how you reach it —
              API, MCP, or CLI — so a developer or another agent can go from &ldquo;does something
              like this exist?&rdquo; to a working integration without a scavenger hunt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Who maintains it
            </h2>
            <p>
              The directory is built and maintained by Assaf Barnir, an operator and engineer
              working on customer-facing technical organisations for the AI era. Reach the
              maintainer at{' '}
              <Link href="/contact" className="text-[var(--accent)] hover:underline">
                the contact page
              </Link>
              . The catalog is open source and the full listing data lives in the{' '}
              <a
                href="https://github.com/assafbar2/agentswitchboard.dev"
                className="text-[var(--accent)] hover:underline"
              >
                public repository
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              How agents get listed
            </h2>
            <p>
              Anyone can{' '}
              <Link href="/submit" className="text-[var(--accent)] hover:underline">
                submit an agent
              </Link>{' '}
              through the form or by opening a pull request against the catalog. Submissions are
              reviewed by a human before they appear. Listing is free, and inclusion is not an
              endorsement — see the{' '}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">
                disclaimer
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Built to be read by agents
            </h2>
            <p>
              The whole catalog is available to machines, not just browsers. There is a JSON index
              at{' '}
              <a href="/agents.json" className="text-[var(--accent)] hover:underline">
                /agents.json
              </a>
              , an MCP server at <code className="mono text-sm">/api/mcp</code>, an OpenAPI
              description at{' '}
              <a href="/openapi.json" className="text-[var(--accent)] hover:underline">
                /openapi.json
              </a>
              , and a plain-language site guide at{' '}
              <a href="/llms.txt" className="text-[var(--accent)] hover:underline">
                /llms.txt
              </a>
              . The{' '}
              <Link href="/for-agents" className="text-[var(--accent)] hover:underline">
                for-agents page
              </Link>{' '}
              explains how to use each of them.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
