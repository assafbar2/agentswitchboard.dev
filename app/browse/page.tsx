import { getAllAgents } from '@/lib/contentful';
import { searchAgents } from '@/lib/search';
import { AgentCard } from '@/components/AgentCard';
import { SearchBar } from '@/components/SearchBar';
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
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  const { agents: allAgents } = await getAllAgents({ limit: 200 });
  const agents = query ? searchAgents(allAgents, query) : allAgents;

  return (
    <div className="container-wide section">
      {/* Search bar */}
      <div className="max-w-xl mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          {query ? (
            <>
              Results for{' '}
              <span className="text-[var(--accent)] mono">"{query}"</span>
            </>
          ) : (
            'Browse Agents'
          )}
        </h1>
        <SearchBar defaultValue={query} autoFocus={!!query} />
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
            No agents matched <span className="mono">"{query}"</span>
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Try searching by skill, category, or provider name.
          </p>
        </div>
      )}
    </div>
  );
}
