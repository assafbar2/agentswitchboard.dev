import Link from 'next/link';
import type { Metadata } from 'next';
import { getAgentCount, getUniqueProviderCount } from '@/lib/catalog';
import { VerifiedBadge, VERIFIED_DEFINITION } from '@/components/VerifiedBadge';

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
    <div className="container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">About Agent Switchboard</h1>
        <p className="dir-label text-[var(--dir-muted)] pb-6 mb-8 border-b-[3px] border-[var(--dir-ink)]!">
          A directory for the agentic web
        </p>

        <div className="space-y-10 text-[17px] leading-relaxed">
          <section>
            <h2 className="dir-bar mb-3">
              What this is
            </h2>
            <p>
              Agent Switchboard is a curated directory of AI agents, MCP servers, and agentic
              developer tools. It currently lists {agentCount} agents from {providerCount}{' '}
              providers. Every entry records what an agent actually does and how you reach it —
              API, MCP, CLI, or browser extension — so a developer or another agent can go from
              &ldquo;does something like this exist?&rdquo; to the right tool without a scavenger
              hunt.
            </p>
          </section>

          <section>
            <h2 className="dir-bar mb-3">
              Who maintains it
            </h2>
            <p>
              The directory is built and maintained by Assaf Barnir, an operator and engineer
              working on customer-facing technical organisations for the AI era. Reach the
              maintainer at{' '}
              <Link href="/contact" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                the contact page
              </Link>
              . The catalog is open source and the full listing data lives in the{' '}
              <a
                href="https://github.com/assafbar2/agentswitchboard.dev"
                className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
              >
                public repository
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="dir-bar mb-3">
              How agents get listed
            </h2>
            <p>
              Anyone can{' '}
              <Link href="/submit" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                submit an agent
              </Link>{' '}
              through the form or by opening a pull request against the catalog. Submissions are
              reviewed by a human before they appear, against{' '}
              <Link href="/submit#rules" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                published acceptance rules
              </Link>
              , and the decision is posted on GitHub. Listing is free, and inclusion is not an
              endorsement — see the{' '}
              <Link href="/disclaimer" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                disclaimer
              </Link>
              .
            </p>
          </section>

          <section id="verification" className="scroll-mt-20">
            <h2 className="dir-bar mb-3">
              How we verify
            </h2>
            <p className="mb-3">
              <VerifiedBadge size="md" />
            </p>
            <p>{VERIFIED_DEFINITION}</p>
            <p className="mt-3">
              Every entry is reviewed before it&rsquo;s listed, but not every listing carries the
              label: a listing without it hasn&rsquo;t passed the check yet, or no longer does.
            </p>
          </section>

          <section>
            <h2 className="dir-bar mb-3">
              Built to be read by agents
            </h2>
            <p>
              The whole catalog is available to machines, not just browsers. There is a JSON index
              at{' '}
              <a href="/agents.json" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                /agents.json
              </a>
              , an MCP server at <code className="mono text-sm">/api/mcp</code>, an OpenAPI
              description at{' '}
              <a href="/openapi.json" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                /openapi.json
              </a>
              , and a plain-language site guide at{' '}
              <a href="/llms.txt" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                /llms.txt
              </a>
              . The{' '}
              <Link href="/for-agents" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                for-agents page
              </Link>{' '}
              explains how to use each of them.
            </p>
          </section>

          <section>
            <h2 className="dir-bar mb-3">Legal</h2>
            <p>
              How the directory handles data is on the{' '}
              <Link href="/privacy" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                privacy page
              </Link>
              . Use of the site and the public catalog API is covered by the{' '}
              <Link href="/terms" className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2">
                terms of use
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
