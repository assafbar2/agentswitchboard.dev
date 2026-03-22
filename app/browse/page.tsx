import { Suspense } from 'react';
import { getAllAgents } from '@/lib/contentful';
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
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; access?: string }>;
}) {
  const { q, access } = await searchParams;
  const query = q?.trim() ?? '';
  const accessFilters = access?.split(',').filter(Boolean) ?? [];

  const { agents: allAgents } = await getAllAgents({ limit: 200 });
  const agents = searchAgents(allAgents, query, accessFilters.length > 0 ? accessFilters : undefined);

  return (
    <div className="container-wide section">
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
  );
}
