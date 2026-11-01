import Link from 'next/link';
import { CategoryRail } from '@/components/CategoryRail';
import { Suspense } from 'react';
import { getAllCategories, getEveryAgent, loadOfficialVendors } from '@/lib/catalog';
import {
  breakdownLine,
  browseMatches,
  browseStateHref,
  parseFlag,
  parseSort,
  resultBreakdown,
  sortAgents,
  type BreakdownKey,
  type BrowseState,
} from '@/lib/search';
import { normalizeAccessMethods, normalizeAuthTypes } from '@/lib/public-api';
import { recover } from '@/lib/recovery';
import { AgentCard } from '@/components/AgentCard';
import { SearchBar } from '@/components/SearchBar';
import { AccessMethodFilter } from '@/components/AccessMethodFilter';
import { CatalogFilters } from '@/components/CatalogFilters';
import { NoResults, NoResultsText } from '@/components/NoResults';
import { SortSelect } from '@/components/SortSelect';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}, parent: ResolvingMetadata): Promise<Metadata> {
  const { q } = await searchParams;
  return pageMetadata(
    {
      title: q ? `"${q}" — Search Results` : 'Browse Agents',
      description:
        'Search and filter the full directory of AI agents, MCP servers and agent tools by category, access method (MCP, API, CLI or browser extension) and official vendor.',
      // Self-referencing canonical without query params — filtered/search
      // views canonicalize to the clean browse URL.
      path: '/browse',
    },
    parent
  );
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    access?: string;
    category?: string;
    official?: string;
    vendor?: string;
    verified?: string;
    auth?: string;
    sort?: string;
  }>;
}) {
  const { q, access, category, official, vendor, verified, auth, sort } = await searchParams;
  const query = q?.trim() ?? '';
  // Same parsing as /api/agents: aliases map to their method and unknown values
  // are dropped, so a stale or mistyped link never empties the directory.
  const accessFilters = normalizeAccessMethods(access?.split(',') ?? []);
  const authFilter = normalizeAuthTypes(auth?.split(',') ?? []);
  const categoryFilter = category?.trim() ?? '';
  const vendorFilter = vendor?.trim() ?? '';
  const officialOnly = parseFlag(official) || !!vendorFilter;
  const verifiedOnly = parseFlag(verified);
  const sortOrder = parseSort(sort);

  const [allAgents, categories, vendors] = await Promise.all([
    getEveryAgent(),
    getAllCategories(),
    loadOfficialVendors(),
  ]);
  const vendorName = vendors.find((v) => v.slug === vendorFilter)?.name;
  const state: BrowseState = {
    query,
    category: categoryFilter,
    official: parseFlag(official),
    vendor: vendorFilter,
    verified: verifiedOnly,
    auth: authFilter,
    access: accessFilters,
  };
  const agents = sortAgents(browseMatches(allAgents, state), sortOrder);
  const recovery = agents.length === 0 ? recover(allAgents, state, categories, sortOrder) : undefined;
  const applied = new Set<BreakdownKey>(accessFilters as BreakdownKey[]);
  if (officialOnly) applied.add('official');
  if (verifiedOnly) applied.add('verified');
  if (authFilter.length === 1 && authFilter[0] === 'none') applied.add('no-auth');
  const breakdown = resultBreakdown(agents, applied);

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      {/* .human-only sets display:block unlayered, so the flex row is its own element. */}
      <div className="human-only">
      <div className="lg:flex">
        <div className="container-wide section min-w-0 flex-1 font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
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

        {/* Count, as the yellow section bar the listings sit under. An h2, so the
            card h3s are not a skipped heading level under the h1. */}
        <h2 className="dir-bar mb-2">
          {agents.length === 0
            ? 'No agents found'
            : `${agents.length}${officialOnly ? ' official' : ''} agent${agents.length !== 1 ? 's' : ''}${query ? ' matched' : ' listed'}`}
        </h2>

        {/* What each filter chip would keep, and the result order */}
        {agents.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {agents.length > 1 && breakdown.length > 0 && (
              <p className="text-[15px] text-[var(--dir-muted)]">{breakdownLine(breakdown, agents.length)}</p>
            )}
            <div className="sm:ml-auto">
              <Suspense>
                <SortSelect hasQuery={!!query} />
              </Suspense>
            </div>
          </div>
        )}

        {/* Results */}
        {agents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
        {recovery && (
          // Keyed by the view, so a client-side move to another empty view counts it again.
          <NoResults
            key={browseStateHref(state, sortOrder)}
            state={state}
            recovery={recovery}
            sort={sortOrder}
            names={{ category: categories.find((c) => c.slug === categoryFilter)?.name, vendor: vendorName }}
          />
        )}
      </div>

        <CategoryRail categories={categories} activeSlug={categoryFilter} />
      </div>
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
              {verifiedOnly && ' · verified'}
              {authFilter.length > 0 && ` · auth: ${authFilter.join('|')}`}
              {accessFilters.length > 0 && ` · access: ${accessFilters.join('+')}`}
              {sortOrder !== 'relevance' && ` · sort: ${sortOrder}`}
            </div>
            {breakdown.length > 0 && (
              <div className="agent-dim text-xs">
                {breakdown.map(({ key, count }) => `${key}: ${count}`).join(' · ')}
              </div>
            )}
          </div>

          {agents.length > 0 && (
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
          )}
          {recovery && <NoResultsText state={state} recovery={recovery} sort={sortOrder} />}

        </div>
      </div>
    </>
  );
}
