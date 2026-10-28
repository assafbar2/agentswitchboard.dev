import Link from 'next/link';
import { Suspense } from 'react';
import { getAllCategories, getEveryAgent, loadOfficialVendors } from '@/lib/catalog';
import { filterAgents, parseFlag, searchAgents } from '@/lib/search';
import { AgentCard } from '@/components/AgentCard';
import { SearchBar } from '@/components/SearchBar';
import { AccessMethodFilter } from '@/components/AccessMethodFilter';
import { CatalogFilters } from '@/components/CatalogFilters';
import type { Metadata } from 'next';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `"${q}" — Search Results` : 'Browse Agents',
    description:
      'Search and filter the full directory of AI agents, MCP servers and agent tools by category, access method (MCP, API, CLI or browser extension) and official vendor.',
    // Self-referencing canonical without query params — filtered/search
    // views canonicalize to the clean browse URL.
    alternates: { canonical: '/browse' },
  };
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; access?: string; category?: string; official?: string; vendor?: string }>;
}) {
  const { q, access, category, official, vendor } = await searchParams;
  const query = q?.trim() ?? '';
  const accessFilters = access?.split(',').filter(Boolean) ?? [];
  const categoryFilter = category?.trim() ?? '';
  const vendorFilter = vendor?.trim() ?? '';
  const officialOnly = parseFlag(official) || !!vendorFilter;

  const [allAgents, categories, vendors] = await Promise.all([
    getEveryAgent(),
    getAllCategories(),
    loadOfficialVendors(),
  ]);
  const vendorName = vendors.find((v) => v.slug === vendorFilter)?.name;
  const narrowed = filterAgents(allAgents, {
    category: categoryFilter,
    official: officialOnly,
    vendor: vendorFilter,
  });
  const agents = searchAgents(narrowed, query, accessFilters.length > 0 ? accessFilters : undefined);

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        {/* Search bar */}
        <div className="max-w-xl mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-4 wrap-break-word">
            {query ? (
              <>
                Results for{' '}
                <span>&ldquo;{query}&rdquo;</span>
              </>
            ) : (
              'Browse Agents'
            )}
          </h1>
          <SearchBar defaultValue={query} autoFocus={!!query} />
        </div>

        {/* Official, category, and access method filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Suspense>
            <CatalogFilters
              categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
              vendorName={vendorName}
            />
            <span className="hidden sm:block w-[3px] h-8 bg-[var(--dir-ink)] mx-1" aria-hidden />
            <AccessMethodFilter />
          </Suspense>
        </div>

        {/* Count, as the yellow section bar the listings sit under */}
        <p className="dir-bar mb-2">
          {agents.length === 0
            ? 'No agents found'
            : `${agents.length}${officialOnly ? ' official' : ''} agent${agents.length !== 1 ? 's' : ''}${query ? ' matched' : ' listed'}`}
        </p>

        {/* Results */}
        {agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="py-16 border-b border-[var(--dir-rule)]!">
            <p className="text-lg font-bold mb-2">
              No agents found{query && <> matching <span>&ldquo;{query}&rdquo;</span></>}
            </p>
            <p className="text-[var(--dir-muted)]">
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
              {officialOnly && ` · official${vendorFilter ? `: ${vendorFilter}` : ''}`}
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
                  className="agent-row no-underline hover:underline"
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
