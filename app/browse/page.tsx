import Link from '@/components/Link';
import { CategoryRail } from '@/components/CategoryRail';
import { Suspense } from 'react';
import { getAllCategories, getEveryAgent, loadOfficialVendors } from '@/lib/catalog';
import {
  breakdownLine,
  browseMatches,
  browseStateHref,
  pageSlice,
  parseFlag,
  parsePage,
  parseSort,
  resultBreakdown,
  sortAgents,
  type BreakdownKey,
  type BrowseState,
  clampQuery,
} from '@/lib/search';
import { normalizeAccessMethods, normalizeAuthTypes } from '@/lib/public-api';
import { recover } from '@/lib/recovery';
import { AgentCard } from '@/components/AgentCard';
import { SearchBar } from '@/components/SearchBar';
import { AccessMethodFilter } from '@/components/AccessMethodFilter';
import { CatalogFilters } from '@/components/CatalogFilters';
import { NoResults, NoResultsText } from '@/components/NoResults';
import { SortSelect } from '@/components/SortSelect';
import { TaskBanner } from '@/components/TaskBanner';
import { TaskChips } from '@/components/TaskChips';
import { TaskEvents } from '@/components/TaskEvents';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { getTask, getTasks, taskExplanation, taskTitle } from '@/lib/tasks';

/** Query values as Next passes them: a repeated key (?q=a&q=b) arrives as an array. */
type RawParams = Record<string, string | string[] | undefined>;

/** One value per key, the first when a key repeats (as URLSearchParams.get does). */
function firstValues(raw: RawParams): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}

/** A ?task= slug, any case; an unknown one is no task, so a stale link still lists everything. */
const taskOf = (raw: string | undefined) => (raw ? getTask(raw.trim().toLowerCase()) : null);

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}, parent: ResolvingMetadata): Promise<Metadata> {
  const { q: rawQ, task: taskParam } = firstValues(await searchParams);
  const q = clampQuery(rawQ);
  const task = taskOf(taskParam);
  return pageMetadata(
    {
      title: q ? `"${q}" — Search Results` : task ? taskTitle(task) : 'Browse Agents',
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
  searchParams: Promise<RawParams>;
}) {
  const { q, task: taskParam, access, category, official, vendor, verified, auth, sort, page } = firstValues(await searchParams);
  const query = clampQuery(q);
  const task = taskOf(taskParam);
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
    task: task ?? undefined,
    category: categoryFilter,
    official: parseFlag(official),
    vendor: vendorFilter,
    verified: verifiedOnly,
    auth: authFilter,
    access: accessFilters,
  };
  const agents = sortAgents(browseMatches(allAgents, state), sortOrder);
  const shown = pageSlice(agents, parsePage(page));
  const pageHref = (n: number) => browseStateHref(state, sortOrder, n);
  const recovery = agents.length === 0 ? recover(allAgents, state, categories, sortOrder) : undefined;
  const applied = new Set<BreakdownKey>(accessFilters as BreakdownKey[]);
  if (officialOnly) applied.add('official');
  if (verifiedOnly) applied.add('verified');
  if (authFilter.length === 1 && authFilter[0] === 'none') applied.add('no-auth');
  const breakdown = resultBreakdown(agents, applied);
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const counted = query ? ' matched' : task ? ` ${agents.length === 1 ? 'fits' : 'fit'} this task` : ' listed';
  const withoutTask = browseStateHref({ ...state, task: undefined }, sortOrder);
  const unfiltered =
    !query && !task && !categoryFilter && !officialOnly && !verifiedOnly && authFilter.length === 0 && accessFilters.length === 0;
  const results = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10">
      {shown.items.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
  const range = `${shown.start + 1}–${shown.start + shown.items.length} of ${agents.length}`;
  const pager = shown.pages > 1 && (
    <nav
      aria-label="Result pages"
      className="mt-8 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold"
    >
      {shown.page > 1 ? (
        <Link href={pageHref(shown.page - 1)} rel="prev" className="text-[var(--dir-ink)] no-underline hover:underline">
          <span aria-hidden="true">← </span>Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="order-first w-full text-[var(--dir-muted)] font-normal sm:order-none sm:w-auto">
        Page {shown.page} of {shown.pages} · {range}
      </span>
      {shown.page < shown.pages ? (
        <Link href={pageHref(shown.page + 1)} rel="next" className="text-[var(--dir-ink)] no-underline hover:underline">
          Next<span aria-hidden="true"> →</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );

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

        {unfiltered && (
          <section aria-labelledby="browse-by-task" className="mb-6">
            <h2 id="browse-by-task" className="dir-label mb-2 text-[14px] font-bold uppercase tracking-[0.1em]">
              I need an agent to…
            </h2>
            <TaskChips
              tasks={getTasks()}
              from="browse"
              href={(t) => browseStateHref({ ...state, task: t }, sortOrder)}
              oneRowOnPhones
            />
          </section>
        )}

        {task && (
          <TaskBanner
            task={task}
            explanation={taskExplanation(task, categoryName)}
            removeHref={withoutTask}
          />
        )}

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
            : `${agents.length}${officialOnly ? ' official' : ''} agent${agents.length !== 1 ? 's' : ''}${counted}`}
        </h2>

        {/* What each filter chip would keep, and the result order */}
        {agents.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {agents.length > 1 && breakdown.length > 0 && (
              <p className="text-[15px] text-[var(--dir-muted)]">{breakdownLine(breakdown, agents.length)}</p>
            )}
            <div className="sm:ml-auto">
              <Suspense>
                <SortSelect hasQuery={!!query || !!task} />
              </Suspense>
            </div>
          </div>
        )}

        {/* Results */}
        {agents.length > 0 &&
          (task ? (
            <TaskEvents task={task.slug} from="browse">
              {results}
            </TaskEvents>
          ) : (
            results
          ))}
        {pager}
        {recovery && (
          // Keyed by the view, so a client-side move to another empty view counts it again.
          <NoResults
            key={browseStateHref(state, sortOrder)}
            state={state}
            recovery={recovery}
            sort={sortOrder}
            names={{ task: task?.label, category: categories.find((c) => c.slug === categoryFilter)?.name, vendor: vendorName }}
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
              {agents.length} agent{agents.length !== 1 ? 's' : ''}{query ? ' matched' : task ? ` ${agents.length === 1 ? 'fits' : 'fit'} the task` : ' indexed'}
              {task && ` · task: ${task.slug}`}
              {categoryFilter && ` · category: ${categoryFilter}`}
              {officialOnly && ` · official${vendorFilter ? `: ${vendorFilter}` : ''}`}
              {verifiedOnly && ' · verified'}
              {authFilter.length > 0 && ` · auth: ${authFilter.join('|')}`}
              {accessFilters.length > 0 && ` · access: ${accessFilters.join('+')}`}
              {sortOrder !== 'relevance' && ` · sort: ${sortOrder}`}
            </div>
            {shown.pages > 1 && (
              <div className="agent-dim text-xs">
                page {shown.page}/{shown.pages} · showing {range}
                {shown.page > 1 && (
                  <>
                    {' · prev: '}
                    <Link href={pageHref(shown.page - 1)} rel="prev">{pageHref(shown.page - 1)}</Link>
                  </>
                )}
                {shown.page < shown.pages && (
                  <>
                    {' · next: '}
                    <Link href={pageHref(shown.page + 1)} rel="next">{pageHref(shown.page + 1)}</Link>
                  </>
                )}
              </div>
            )}
            {breakdown.length > 0 && (
              <div className="agent-dim text-xs">
                {breakdown.map(({ key, count }) => `${key}: ${count}`).join(' · ')}
              </div>
            )}
            {task && (
              <div className="agent-dim text-xs mt-1">
                {taskTitle(task)}: {task.blurb} {taskExplanation(task, categoryName)} Best fits with why:{' '}
                <Link href={`/tasks/${task.slug}`}>/tasks/{task.slug}</Link> · without the task:{' '}
                <Link href={withoutTask}>{withoutTask}</Link>
              </div>
            )}
          </div>

          {agents.length > 0 && (
            <div>
              <div className="agent-section-title">results</div>
              {shown.items.map((agent) => (
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
