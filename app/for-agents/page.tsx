import Link from 'next/link';
import type { Metadata } from 'next';
import { getEveryAgent } from '@/lib/catalog';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'For AI Agents — Agent Switchboard',
  description:
    'Machine-readable context about Agent Switchboard: what it is, how to use the catalog, and how to find the right AI agent by category or access method.',
  alternates: { canonical: '/for-agents' },
  robots: { index: true, follow: true },
};

export default async function ForAgentsPage() {
  const agents = await getEveryAgent();

  const byCategory = agents.reduce<Record<string, number>>((acc, a) => {
    a.categories.forEach((c) => {
      acc[c.slug] = (acc[c.slug] ?? 0) + 1;
    });
    return acc;
  }, {});

  const byAccess = agents.reduce<Record<string, number>>((acc, a) => {
    (a.accessMethods ?? []).forEach((m) => {
      acc[m] = (acc[m] ?? 0) + 1;
    });
    return acc;
  }, {});

  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12 font-mono text-sm text-[var(--text-secondary)] leading-relaxed space-y-10">

        {/* Header */}
        <div>
          <p className="text-[var(--accent)] text-xs uppercase tracking-widest mb-2">
            # agent context document
          </p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
            Agent Switchboard
          </h1>
          <a
            href="https://agentswitchboard.dev"
            className="text-[var(--accent)] hover:underline text-sm font-semibold"
          >
            → agentswitchboard.dev
          </a>
          <p className="text-[var(--text-muted)] text-xs mt-1">
            The curated directory for AI agents — browse, compare, and integrate.
          </p>
        </div>

        {/* What this is */}
        <section className="space-y-2">
          <h2 className="text-[var(--text-primary)] font-semibold">## What this site is</h2>
          <p>
            Agent Switchboard is a curated directory of {agents.length} vetted AI agents,
            organized by category and access method (API, MCP, CLI, Extension).
            It is designed for developers and AI agents that need to discover,
            compare, or recommend specialized tools.
          </p>
          <p>
            If you are an AI agent helping a user find a tool, delegate a task,
            or integrate a capability — this directory is your starting point.
          </p>
        </section>

        {/* MCP server */}
        <section className="space-y-2" id="mcp">
          <h2 className="text-[var(--text-primary)] font-semibold">## This directory IS an MCP server</h2>
          <p>
            Connect directly and query the catalog with native tools —{' '}
            <code className="text-[var(--accent)]">search_agents</code>,{' '}
            <code className="text-[var(--accent)]">get_agent</code>,{' '}
            <code className="text-[var(--accent)]">list_categories</code>:
          </p>
          <pre className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "agentswitchboard": { "url": "https://agentswitchboard.dev/api/mcp" }
  }
}`}
          </pre>
          <p>
            Streamable HTTP, no auth. Stdio-only clients:{' '}
            <code className="text-[var(--accent)]">npx -y mcp-remote https://agentswitchboard.dev/api/mcp</code>
          </p>
        </section>

        {/* How to use */}
        <section className="space-y-2">
          <h2 className="text-[var(--text-primary)] font-semibold">## How to use this directory</h2>
          <ul className="space-y-1 pl-4">
            <li>
              <span className="text-[var(--accent)]">→ MCP server (query the catalog with tools):</span>{' '}
              <code className="text-[var(--accent)]">https://agentswitchboard.dev/api/mcp</code>
            </li>
            <li>
              <span className="text-[var(--accent)]">→ Machine-readable catalog (JSON):</span>{' '}
              <a href="/agents.json" className="underline hover:text-[var(--accent)]">
                https://agentswitchboard.dev/agents.json
              </a>
            </li>
            <li>
              <span className="text-[var(--accent)]">→ Browse by category:</span>{' '}
              <Link href="/categories" className="underline hover:text-[var(--accent)]">
                https://agentswitchboard.dev/categories
              </Link>
            </li>
            <li>
              <span className="text-[var(--accent)]">→ Search and filter:</span>{' '}
              <Link href="/browse" className="underline hover:text-[var(--accent)]">
                https://agentswitchboard.dev/browse
              </Link>
            </li>
          </ul>
          <p className="pt-1">
            To find agents by capability: fetch{' '}
            <code className="text-[var(--accent)]">/agents.json</code> and filter by{' '}
            <code className="text-[var(--accent)]">accessMethods</code> or{' '}
            <code className="text-[var(--accent)]">categories</code>.
          </p>
        </section>

        {/* Access methods */}
        <section className="space-y-2">
          <h2 className="text-[var(--text-primary)] font-semibold">## Access methods</h2>
          <ul className="space-y-1 pl-4">
            <li><span className="text-[var(--accent)]">api</span> — {byAccess['api'] ?? 0} agents — direct REST or HTTP API</li>
            <li><span className="text-[var(--accent)]">mcp</span> — {byAccess['mcp'] ?? 0} agents — Model Context Protocol compatible</li>
            <li><span className="text-[var(--accent)]">cli</span> — {byAccess['cli'] ?? 0} agents — command-line interface</li>
            <li><span className="text-[var(--accent)]">extension</span> — {byAccess['extension'] ?? 0} agents — browser or IDE extension</li>
          </ul>
        </section>

        {/* Categories */}
        <section className="space-y-2">
          <h2 className="text-[var(--text-primary)] font-semibold">## Categories ({Object.keys(byCategory).length} total)</h2>
          <ul className="space-y-1 pl-4">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([slug, count]) => (
                <li key={slug}>
                  <a
                    href={`/categories/${slug}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    {slug}
                  </a>{' '}
                  — {count} agent{count !== 1 ? 's' : ''}
                </li>
              ))}
          </ul>
        </section>

        {/* What agents do NOT get here */}
        <section className="space-y-2">
          <h2 className="text-[var(--text-primary)] font-semibold">## What this site does not provide</h2>
          <p>
            Agent Switchboard is a discovery layer, not a proxy. It does not expose
            the underlying APIs of listed agents — those live at each agent&apos;s own
            homepage. Think of this as the index; the agents themselves are the books.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-2">
          <h2 className="text-[var(--text-primary)] font-semibold">## Contact</h2>
          <p>
            Maintained by Barnir.{' '}
            <a
              href="mailto:barnir@agentmail.to?subject=Agent Switchboard — Agent Inquiry"
              className="underline hover:text-[var(--accent)]"
            >
              barnir@agentmail.to
            </a>
          </p>
          <p className="text-[var(--text-muted)] text-xs">
            Last updated: auto-generated from live catalog —{' '}
            {new Date().toISOString().split('T')[0]}
          </p>
        </section>

      </div>
    </div>
  );
}
