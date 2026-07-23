import Link from 'next/link';
import { Suspense } from 'react';
import { getEveryAgent } from '@/lib/catalog';
import { searchAgents } from '@/lib/search';
import { AgentCard } from '@/components/AgentCard';
import { SearchBar } from '@/components/SearchBar';
import { AccessMethodFilter } from '@/components/AccessMethodFilter';
import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" — Search Results` : 'Browse Agents',
    description: 'Explore the full directory of A2A protocol agents.',
    // Self-referencing canonical without query params — filtered/search
    // views canonicalize to the clean browse URL.
    alternates: { canonical: '/browse' },
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; access?: string; category?: string }>;
}) {
  const { q, access, category } = await searchParams;
  const query = q?.trim() ?? '';
  const accessFilters = access?.split(',').filter(Boolean) ?? [];
  const categoryFilter = category?.trim() ?? '';

  const allAgents = await getEveryAgent();
  const inCategory = categoryFilter
    ? allAgents.filter((a) => a.categories.some((c) => c.slug === categoryFilter))
    : allAgents;
  const agents = searchAgents(inCategory, query, accessFilters.length > 0 ? accessFilters : undefined);

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section">
        {/* Search bar */}
        <div className="max-w-xl mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {query ? (
              <>
                Results for{' '}
                <span className="text-[var(--accent)] mono">&ldquo;{query}&rdquo;</span>
              </>
            ) : (
              'Browse Agents'
            )}
          </h1>
          <SearchBar defaultValue={query} autoFocus={!!query} />
        </div>

        {/* Access method filters */}
        <div className="mb-6">
          <Suspense>
            <AccessMethodFilter />
          </Suspense>
        </div>

        {/* Count */}
        <p className="text-sm text-[var(--text-muted)] mb-6 mono">
          {agents.length === 0
            ? 'No agents found'
            : `${agents.length} agent${agents.length !== 1 ? 's' : ''}${query ? ' matched' : ' listed'}`}
        </p>

        {/* Results */}
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[var(--text-secondary)] mb-2">
              No agents found{query && <> matching <span className="mono">&ldquo;{query}&rdquo;</span></>}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Try a different search or clear the filters.
            </p>
          </div>
        )}
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">

          {/* Header */}
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">
              {query ? `search: "${query}"` : '/browse'}
            </div>
            <div className="agent-dim text-xs">
              {agents.length} agent{agents.length !== 1 ? 's' : ''}{query ? ' matched' : ' indexed'}
              {categoryFilter && ` · category: ${categoryFilter}`}
              {accessFilters.length > 0 && ` · access: ${accessFilters.join('+')}`}
            </div>
          </div>

          {agents.length > 0 ? (
            <div>
              <div className="agent-section-title">results</div>
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.slug}`}
                  className="agent-row hover:opacity-80 transition-opacity no-underline"
                >
                  <span className="agent-accent">{agent.slug}</span>
                  <span className="agent-dim">{agent.categories[0]?.slug ?? '—'}</span>
                  <span className="agent-dim">{agent.accessMethods.join('+') || '—'}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="agent-dim py-8 text-xs">
              {query ? `no agents matched "${query}"` : 'no agents found'}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
