import Link from 'next/link';
import { ArrowRight, Terminal } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import {
  getHomepageAgents,
  getAllCategories,
  getAgentCount,
  getUniqueProviderCount,
  getSiteSettings,
} from '@/lib/catalog';
import { FeaturedAgentCard } from '@/components/FeaturedAgentCard';
import { CategoryCard } from '@/components/CategoryCard';
import { JsonLd } from '@/components/JsonLd';
import type { Metadata } from 'next';

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export const metadata: Metadata = {
  alternates: { canonical: BASE_URL },
  openGraph: {
    url: BASE_URL,
  },
};

export default async function HomePage() {
  const [homepageAgents, categories, agentCount, providerCount, settings] =
    await Promise.all([
      getHomepageAgents(),
      getAllCategories(),
      getAgentCount(),
      getUniqueProviderCount(),
      getSiteSettings(),
    ]);

  const homeSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Agent Switchboard',
      url: BASE_URL,
      description: 'Browse, compare, and integrate AI agents with real API, MCP, and CLI access.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/browse?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Agent Switchboard',
      url: BASE_URL,
      description: 'The curated AI agent directory for developers building on the agentic web.',
    },
  ];

  return (
    <>
      <JsonLd schema={homeSchema as Record<string, unknown>[]} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="pt-14 pb-8 relative overflow-hidden">
          {/* Top gradient wash */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--accent)] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />

          <div className="container-wide relative">
            <div className="max-w-3xl mx-auto text-center">
              {/* Terminal-style tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] mb-8 animate-fade-in">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="mono text-xs text-[var(--text-secondary)]">
                  {settings?.tagline || 'The directory for the agentic web'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-slide-up">
                Every AI Agent{' '}
                <span className="gradient-text">Worth Knowing</span>
                {', '}in One Place
              </h1>

              <p
                className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto mb-8 animate-slide-up"
                style={{ animationDelay: '100ms' }}
              >
                {settings?.heroSubtitle ||
                  'Browse, compare, and integrate verified AI agents with real API, MCP, and CLI access. The curated switchboard for the agentic web.'}
              </p>

              <div
                className="max-w-lg mx-auto animate-slide-up"
                style={{ animationDelay: '200ms' }}
              >
                <SearchBar />
              </div>

              {/* ── Stats pill ── */}
              <div
                className="inline-flex items-center gap-0 mt-6 rounded-full border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden animate-fade-in"
                style={{ animationDelay: '300ms' }}
              >
                {[
                  { value: agentCount, label: 'Agents' },
                  { value: providerCount, label: 'Providers' },
                  { value: categories.length, label: 'Categories' },
                ].map(({ value, label }, i) => (
                  <div
                    key={label}
                    className={`flex items-center gap-1.5 px-5 py-2 ${i < 2 ? 'border-r border-[var(--border)]' : ''}`}
                  >
                    <span className="mono text-sm font-bold text-[var(--text-primary)]">{value}</span>
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── MCP callout ──────────────────────────────────────────── */}
        <section className="pb-4">
          <div className="container-wide">
            <Link
              href="/for-agents#mcp"
              className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 rounded-xl border border-[var(--border-accent)] bg-[var(--bg-card)] px-5 py-3.5 hover:border-[var(--accent)] transition-colors group"
            >
              <span className="mono text-xs text-[var(--accent)]">$ this directory is an MCP server</span>
              <span className="mono text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                connect your agent → agentswitchboard.dev/api/mcp
              </span>
              <span className="mono text-xs text-[var(--text-muted)]">search_agents · get_agent · list_categories</span>
            </Link>
          </div>
        </section>

        {/* ── Featured Agents ──────────────────────────────────────── */}
        {homepageAgents.length > 0 && (
          <section className="pt-4 pb-14">
            <div className="container-wide">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Top Agents
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Editor&apos;s picks and the latest additions to the switchboard
                  </p>
                </div>
                <Link
                  href="/browse"
                  className="hidden sm:flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {homepageAgents.map(({ agent, label }, i) => (
                  <FeaturedAgentCard key={agent.id} agent={agent} label={label} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Categories ───────────────────────────────────────────── */}
        <section className="section">
          <div className="container-wide">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Browse by Category
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Find agents by what they do
                </p>
              </div>
              <Link
                href="/categories"
                className="hidden sm:flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
              >
                All categories <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="section">
          <div className="container-wide">
            <div className="relative rounded-2xl border border-[var(--border-accent)] bg-[var(--bg-card)] p-10 sm:p-14 text-center overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[var(--accent)] opacity-[0.04] blur-[100px] rounded-full pointer-events-none" />

              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                  List your agent on the switchboard
                </h2>
                <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
                  The catalog is open source — add your agent with a pull request
                  or the listing form. Verified entries get discovered by
                  developers and agents across the agentic web.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/submit"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    List Your Agent
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/advertise"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] transition-all"
                  >
                    Advertise with us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">

          {/* Header */}
          <div className="mb-8">
            <div className="agent-accent text-base font-bold mb-1">agentswitchboard.dev</div>
            <div className="agent-dim text-xs">
              {agentCount} agents indexed · {providerCount} providers · {categories.length} categories · api+mcp+cli
            </div>
          </div>

          {/* Featured agents */}
          {homepageAgents.length > 0 && (
            <div className="mb-8">
              <div className="agent-section-title">featured</div>
              {homepageAgents.map(({ agent }) => (
                <Link key={agent.id} href={`/agents/${agent.slug}`} className="agent-row hover:opacity-80 transition-opacity no-underline">
                  <span className="agent-accent">{agent.slug}</span>
                  <span className="agent-dim">{agent.categories[0]?.slug ?? '—'}</span>
                  <span className="agent-dim">{agent.accessMethods.join('+') || '—'}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Categories */}
          <div className="mb-8">
            <div className="agent-section-title">categories</div>
            {categories.map((cat) => (
              <Link key={cat.id} href={`/categories/${cat.slug}`} className="agent-row hover:opacity-80 transition-opacity no-underline">
                <span className="agent-accent">{cat.slug}</span>
                <span className="agent-dim">{cat.name}</span>
                <span className="agent-dim">{cat.agentCount != null ? `${cat.agentCount} agents` : ''}</span>
              </Link>
            ))}
          </div>

          {/* Endpoints */}
          <div>
            <div className="agent-section-title">endpoints</div>
            <div className="agent-row">
              <Link href="/agents.json" className="agent-accent hover:opacity-80">/agents.json</Link>
              <span className="agent-dim">machine-readable full index</span>
              <span className="agent-dim">GET · no auth</span>
            </div>
            <div className="agent-row">
              <span className="agent-accent">/api/mcp</span>
              <span className="agent-dim">MCP server · search_agents, get_agent, list_categories</span>
              <span className="agent-dim">streamable-http · no auth</span>
            </div>
            <div className="agent-row">
              <Link href="/browse" className="agent-accent hover:opacity-80">/browse</Link>
              <span className="agent-dim">filterable directory</span>
              <span className="agent-dim">?q= ?category= ?access=</span>
            </div>
            <div className="agent-row">
              <Link href="/submit" className="agent-accent hover:opacity-80">/submit</Link>
              <span className="agent-dim">list your agent · PR or form</span>
              <span className="agent-dim">see CONTRIBUTING.md</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
