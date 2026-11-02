import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';
import {
  getHomepageAgents,
  getAllCategories,
  getAgentCount,
  getUniqueProviderCount,
  getSiteSettings,
  getOfficialGroups,
  getEveryAgent,
} from '@/lib/catalog';
import { getReleases, highlightedReleases } from '@/lib/changelog';
import { dropAdditions, dropHighlights, getDropSchedule } from '@/lib/drops';
import { isNew, NEW_DAYS, newSince } from '@/lib/freshness';
import { sponsoredAgents } from '@/lib/homepage';
import { inlineMarkdownToText } from '@/lib/inline-markdown';
import { OPERATOR_EXAMPLES, operatorHref } from '@/lib/request-parts';
import { taskMatches } from '@/lib/search';
import { getStacks, stackEntries, stackOfTheWeek } from '@/lib/stacks';
import { getTasks } from '@/lib/tasks';
import { formatDay, formatNumber, joinList, pluralize } from '@/lib/utils';
import { IconCallout } from '@/components/IconCallout';
import { StackCallout } from '@/components/StackCallout';
import { TASK_CHIPS, TaskChips } from '@/components/TaskChips';
import { TaskSearch, type TaskChoice } from '@/components/TaskSearch';
import { OperatorBox, OperatorEvents } from '@/components/OperatorBox';
import { EndpointLink } from '@/components/EndpointLink';
import { Highlights } from '@/components/Highlights';
import { FeaturedAgentCard } from '@/components/FeaturedAgentCard';
import { SponsoredSlot } from '@/components/SponsoredSlot';
import { CategoryCard } from '@/components/CategoryCard';
import { OfficialPlatforms } from '@/components/OfficialPlatforms';
import { JsonLd } from '@/components/JsonLd';
import { CategoryRail } from '@/components/CategoryRail';
import { BotMark } from '@/components/BotMark';
import type { Metadata, ResolvingMetadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return {
    alternates: { canonical: BASE_URL },
    openGraph: {
      // `type` and `images` are repeated here on purpose: a page-level
      // openGraph block replaces the layout's rather than merging into it, so
      // leaving them out drops og:type and the share card from the homepage only.
      type: 'website',
      url: BASE_URL,
      images: (await parent).openGraph?.images ?? [],
    },
  };
}

export default async function HomePage() {
  const [homepageAgents, categories, agentCount, providerCount, settings, officialGroups, catalog] =
    await Promise.all([
      getHomepageAgents(),
      getAllCategories(),
      getAgentCount(),
      getUniqueProviderCount(),
      getSiteSettings(),
      getOfficialGroups(),
      getEveryAgent(),
    ]);
  const latestDrop = getDropSchedule().drops[0];
  const latestAdded = latestDrop ? dropAdditions(latestDrop, catalog).listed : [];
  const latestOfficial = latestAdded.filter((a) => a.official).length;
  const since = newSince();
  const newCount = catalog.filter((a) => isNew(a.createdAt, since)).length;
  const [latestRelease] = highlightedReleases(getReleases());
  const releaseIsNew = !!latestRelease && latestRelease.date >= since;
  const sponsored = sponsoredAgents(catalog);
  const weekStack = stackOfTheWeek(getStacks());
  const weekEntries = weekStack ? stackEntries(weekStack, catalog) : [];
  const tasks = getTasks();
  const taskChoices: TaskChoice[] = tasks.map((task) => ({
    slug: task.slug,
    label: task.label,
    keywords: task.keywords,
    count: taskMatches(catalog, task).length,
  }));

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
      logo: `${BASE_URL}/icon.svg`,
      description: 'The curated AI agent directory for developers building on the agentic web.',
      sameAs: [
        'https://github.com/assafbar2/agentswitchboard.dev',
        'https://www.barnir.co',
      ],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'barnir@agentmail.to',
          url: `${BASE_URL}/contact`,
          availableLanguage: ['English'],
        },
      ],
    },
  ];

  return (
    <>
      <JsonLd schema={homeSchema as Record<string, unknown>[]} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      {/* lg+ reserves the right edge for the thumb-index rail, so it never covers content. */}
      <div className="human-only relative text-[var(--dir-ink)] [font-family:var(--font-display)] lg:pr-[88px]">
        {/* ── Thumb-index rail (lg+): the agents' text-only tab first, then categories ── */}
        <CategoryRail categories={categories} className="absolute top-0 right-0" />

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="border-b border-[var(--dir-ink)]!">
          <div className="container-wide flex flex-col gap-8 pt-8 pb-7 sm:pt-10 lg:flex-row lg:items-end lg:gap-12">
            <div className="min-w-0 flex-1">
              <p className="dir-label mb-2.5 text-[15px] font-bold uppercase tracking-[0.12em]">
                {settings?.tagline || 'The directory for the agentic web'}
              </p>

              <h1 className="mb-3.5 text-[40px] font-extrabold leading-[0.95] tracking-[-0.025em] sm:text-[56px] xl:text-[72px]">
                Every AI Agent Worth Knowing, in One Place
              </h1>

              <p className="max-w-[46rem] text-[18px] leading-[1.45] text-[var(--dir-muted)] sm:text-[19px]">
                {settings?.heroSubtitle ||
                  'Browse, compare, and integrate verified AI agents with real API, MCP, and CLI access. The curated switchboard for the agentic web.'}
              </p>

              <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
                {[
                  { value: agentCount, label: 'Agents' },
                  { value: providerCount, label: 'Providers' },
                  { value: categories.length, label: 'Categories' },
                ].map(({ value, label }) => (
                  <div key={label} className="flex items-baseline gap-1.5">
                    <dt className="dir-label order-last font-semibold uppercase tracking-[0.1em] text-[var(--dir-muted)]">
                      {label}
                    </dt>
                    <dd className="text-[18px] font-extrabold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="w-full lg:w-[420px] lg:flex-none">
              <SearchBar label="Look it up" />
            </div>
          </div>
        </section>

        {/* ── I need an agent to…: the job in your own words, or a task ── */}
        <section aria-labelledby="i-need-an-agent-to" className="border-b border-[var(--dir-ink)]!">
          <div className="container-wide flex flex-col gap-3 py-6 lg:flex-row lg:gap-12">
            <div className="w-full lg:w-[420px] lg:flex-none">
              <TaskSearch tasks={taskChoices} headingId="i-need-an-agent-to" />
            </div>
            <div className="min-w-0 flex-1 lg:pt-[29px]">
              <TaskChips tasks={tasks} from="home" />
            </div>
          </div>
        </section>

        {/* ── Ask the switchboard: a whole job, a tool for each part ── */}
        <section aria-labelledby="ask-the-switchboard" className="border-b border-[var(--dir-ink)]!">
          <div className="container-wide flex flex-col gap-3 py-6 lg:flex-row lg:gap-12">
            <div className="w-full lg:w-[420px] lg:flex-none">
              <OperatorBox tasks={taskChoices} label="Ask the switchboard" headingId="ask-the-switchboard" from="home" />
            </div>
            <div className="min-w-0 flex-1 lg:pt-[29px]">
              <p className="text-[17px] font-bold leading-snug">
                The operator takes the whole job and puts each part through to a tool, with one config to connect them all.
              </p>
              <p className="mt-1 text-[15px] text-[var(--dir-muted)]">Assembled from the directory&apos;s task map — no AI guesses.</p>
              <OperatorEvents from="home">
                <ul className="mt-2">
                  {OPERATOR_EXAMPLES.slice(1).map((request, i) => (
                    <li key={request}>
                      <Link href={operatorHref(request)} data-example={i + 2} className="dir-row max-sm:items-end">
                        <span className="dir-row-name max-sm:whitespace-normal">&ldquo;{request}&rdquo;</span>
                        <span className="dir-row-leader" aria-hidden="true" />
                        <span className="dir-row-meta" aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </OperatorEvents>
            </div>
          </div>
        </section>

        {/* ── What's new, latest drop, stack of the week, MCP and Grok Bot callouts ── */}
        <section className="pt-5">
          <div className="container-wide">
            {latestRelease &&
              (releaseIsNew ? (
                <section aria-labelledby="whats-new" className="mb-5">
                  <h2 id="whats-new" className="dir-bar">
                    What&apos;s new{' '}
                    <span className="dir-bar-count">
                      · {latestRelease.version} {latestRelease.title} · {formatDay(latestRelease.date)}
                    </span>
                  </h2>
                  <Highlights release={latestRelease} from="home" />
                  <Link href="/whats-new" className="dir-row">
                    <span className="dir-row-name">Everything new on the site</span>
                    <span className="dir-row-leader" aria-hidden="true" />
                    <span className="dir-row-meta" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </section>
              ) : (
                <Link href="/whats-new" className="dir-row mb-2">
                  <span className="dir-row-name">What&apos;s new on the site</span>
                  <span className="dir-row-leader" aria-hidden="true" />
                  <span className="dir-row-meta">
                    {latestRelease.version} · {formatDay(latestRelease.date)}
                  </span>
                </Link>
              ))}
            {latestDrop && latestAdded.length > 0 && (
              <IconCallout
                href={`/drops/${latestDrop.date}`}
                agents={dropHighlights(latestAdded.filter((a) => a.iconUrl))}
                title={`Latest drop: +${formatNumber(latestDrop.added.length)} ${pluralize(latestDrop.added.length, 'agent')}`}
                detail={`${formatDay(latestDrop.date)} · ${latestOfficial > 0 ? `${latestOfficial} Official, ` : ''}including ${joinList(dropHighlights(latestAdded).map((a) => a.name))}`}
                cue="See the drop"
                className="mb-2"
              />
            )}
            {weekStack && <StackCallout stack={weekStack} entries={weekEntries} className="mb-2" />}
            <Link
              href="/for-agents#mcp"
              className="group flex flex-col gap-1 border border-[var(--dir-ink)]! px-4 py-3 text-[var(--dir-ink)] no-underline sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4"
            >
              <span className="mono text-[13px] font-bold">$ this directory is an MCP server</span>
              <span className="mono text-[13px] group-hover:underline">
                connect your agent → agentswitchboard.dev/api/mcp
              </span>
              <span className="mono text-[13px] text-[var(--dir-muted)] sm:ml-auto">
                search_agents · compare_agents · alternatives_to · connect_bundle
              </span>
            </Link>
            <Link
              href="/connect#grok-bot"
              className="group mt-2 flex items-center gap-3 border border-[var(--dir-ink)]! px-4 py-3 text-[var(--dir-ink)] no-underline"
            >
              <BotMark className="h-9 w-9 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4">
                <span className="text-[16px] font-extrabold group-hover:underline">Use it from Grok&nbsp;Bot&nbsp;/&nbsp;X</span>
                <span className="text-[15px] text-[var(--dir-muted)]">
                  Tag @bot under any post. The answer lands in your Grok Bot app.
                </span>
              </span>
              <span className="text-[15px] font-bold whitespace-nowrap" aria-hidden="true">
                Setup →
              </span>
            </Link>
          </div>
        </section>

        {/* ── Directory: Top Agents + categories, phone-book columns ── */}
        <section aria-label="Listings" className="pt-6 pb-14">
          <div className="container-wide gap-x-10 md:columns-2 lg:columns-3">
            {/* Unlike the categories, Top Agents never splits across columns. */}
            {homepageAgents.length > 0 && (
              <section aria-labelledby="top-agents" className="mb-6 break-inside-avoid">
                <div className="dir-bar flex items-baseline gap-1.5">
                  <h2 id="top-agents" className="m-0">Top Agents</h2>
                  <span className="font-semibold tracking-normal">· {homepageAgents.length}</span>
                </div>
                <p className="mt-1.5 text-[15px] text-[var(--dir-muted)]">
                  Editor&apos;s picks and the latest additions to the switchboard
                </p>
                {homepageAgents.map(({ agent, label }) => (
                  <FeaturedAgentCard key={agent.id} agent={agent} label={label} />
                ))}
                {newCount > 0 && (
                  <Link href="/new" className="dir-row">
                    <span className="dir-row-name">New listings</span>
                    <span className="dir-row-leader" aria-hidden="true" />
                    <span className="dir-row-meta">
                      +{formatNumber(newCount)} in {NEW_DAYS} days
                    </span>
                  </Link>
                )}
                <Link href="/browse" className="dir-row">
                  <span className="dir-row-name">View all</span>
                  <span className="dir-row-leader" aria-hidden="true" />
                  <span className="dir-row-meta" aria-hidden="true">→</span>
                </Link>
              </section>
            )}

            <SponsoredSlot agents={sponsored} className="mb-6" />

            <section aria-labelledby="browse-categories" className="mb-6">
              <div className="break-inside-avoid">
                <div className="dir-bar flex items-baseline gap-1.5">
                  <h2 id="browse-categories" className="m-0">Browse by Category</h2>
                  <span className="font-semibold tracking-normal">· {categories.length}</span>
                </div>
                <p className="mt-1.5 mb-1 text-[15px] text-[var(--dir-muted)]">
                  Find agents by what they do
                </p>
                {categories[0] && <CategoryCard category={categories[0]} compact />}
              </div>
              {categories.slice(1).map((cat) => (
                <CategoryCard key={cat.id} category={cat} compact />
              ))}
              <Link href="/categories" className="dir-row break-inside-avoid">
                <span className="dir-row-name">All categories</span>
                <span className="dir-row-leader" aria-hidden="true" />
                <span className="dir-row-meta" aria-hidden="true">→</span>
              </Link>
            </section>
          </div>
        </section>

        {/* ── Official platforms ───────────────────────────────────── */}
        <OfficialPlatforms groups={officialGroups} />

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="pb-16">
          <div className="container-wide">
            <div className="border-[3px] border-[var(--dir-ink)]! p-6 sm:p-10">
              <h2 className="mb-3 text-[28px] font-extrabold leading-tight tracking-[-0.015em] sm:text-[36px]">
                List your agent on the switchboard
              </h2>
              <p className="mb-6 max-w-[40rem] text-[18px] leading-[1.45] text-[var(--dir-muted)]">
                The catalog is open source — add your agent with a pull request
                or the listing form. Verified entries get discovered by
                developers and agents across the agentic web.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--dir-yellow)] px-6 text-[17px] font-extrabold text-[var(--dir-on-yellow)] no-underline hover:underline"
                >
                  List Your Agent <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/advertise"
                  className="inline-flex min-h-11 items-center justify-center border-2 border-[var(--dir-ink)]! px-6 text-[17px] font-bold text-[var(--dir-ink)] no-underline hover:underline"
                >
                  Advertise with us
                </Link>
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

          {latestRelease && (
            <div className="mb-8">
              <div className="agent-section-title">
                what&apos;s new · {latestRelease.version} {latestRelease.title} · {latestRelease.date}
              </div>
              {releaseIsNew &&
                latestRelease.highlights.map((h, i) => (
                  <Link key={i} href={h.tryIt} className="agent-row agent-row-stack no-underline hover:underline">
                    <span className="agent-accent">{h.tryIt}</span>
                    <span className="agent-dim">{inlineMarkdownToText(h.text)}</span>
                    <span className="agent-dim" />
                  </Link>
                ))}
              <Link href="/whats-new" className="agent-row no-underline hover:underline">
                <span className="agent-accent">/whats-new</span>
                <span className="agent-dim">every release&apos;s highlights, each with the page to try it</span>
                <span className="agent-dim">rss: /feed.xml · atom: /atom.xml</span>
              </Link>
            </div>
          )}

          {latestDrop && (
            <div className="mb-8">
              <div className="agent-section-title">latest drop</div>
              <Link href={`/drops/${latestDrop.date}`} className="agent-row no-underline hover:underline">
                <span className="agent-accent">/drops/{latestDrop.date}</span>
                <span className="agent-dim">
                  +{latestDrop.added.length} added · {latestDrop.updated.length} updated
                </span>
                <span className="agent-dim">{latestOfficial} official</span>
              </Link>
            </div>
          )}

          {weekStack && (
            <div className="mb-8">
              <div className="agent-section-title">stack of the week</div>
              <Link href={`/stacks/${weekStack.slug}`} className="agent-row no-underline hover:underline">
                <span className="agent-accent">/stacks/{weekStack.slug}</span>
                <span className="agent-dim">{weekEntries.length} tools · week {weekStack.week}</span>
                <span className="agent-dim">{weekEntries.map((e) => e.agent.slug).join('+')}</span>
              </Link>
            </div>
          )}

          {taskChoices.length > 0 && (
            <div className="mb-8">
              <div className="agent-section-title">i need an agent to…</div>
              {taskChoices.slice(0, TASK_CHIPS).map((task) => (
                <Link key={task.slug} href={`/browse?task=${task.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">/browse?task={task.slug}</span>
                  <span className="agent-dim">{task.count} fit</span>
                  <span className="agent-dim">{task.label}</span>
                </Link>
              ))}
              <Link href="/tasks" className="agent-row no-underline hover:underline">
                <span className="agent-accent">/tasks</span>
                <span className="agent-dim">all {taskChoices.length} tasks</span>
                <span className="agent-dim">best fits, with why</span>
              </Link>
            </div>
          )}

          <div className="mb-8">
            <div className="agent-section-title">ask the switchboard</div>
            {OPERATOR_EXAMPLES.map((request) => (
              <Link key={request} href={operatorHref(request)} className="agent-row agent-row-stack no-underline hover:underline">
                <span className="agent-accent">{operatorHref(request)}</span>
                <span className="agent-dim">{request}</span>
                <span className="agent-dim" />
              </Link>
            ))}
            <Link href="/operator" className="agent-row no-underline hover:underline">
              <span className="agent-accent">/operator</span>
              <span className="agent-dim">a whole job in plain words, a tool for each part · from the task map, no AI guesses</span>
              <span className="agent-dim">?q=&lt;request&gt;</span>
            </Link>
          </div>

          {/* Featured agents */}
          {homepageAgents.length > 0 && (
            <div className="mb-8">
              <div className="agent-section-title">featured</div>
              {homepageAgents.map(({ agent, label }) => (
                <Link key={agent.id} href={`/agents/${agent.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">
                    {agent.slug}
                    {label === 'editors-pick' && <span className="agent-dim"> (editor&apos;s pick)</span>}
                  </span>
                  <span className="agent-dim">{agent.categories[0]?.slug ?? '—'}</span>
                  <span className="agent-dim">{agent.accessMethods.join('+') || '—'}</span>
                </Link>
              ))}
            </div>
          )}

          {sponsored.length > 0 && (
            <div className="mb-8" data-sponsored-slot="">
              <div className="agent-section-title">sponsored · paid placements, never change search results</div>
              {sponsored.map((agent) => (
                <Link key={agent.id} href={`/agents/${agent.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">
                    {agent.slug} <span className="agent-dim">(sponsored)</span>
                  </span>
                  <span className="agent-dim">{agent.categories[0]?.slug ?? '—'}</span>
                  <span className="agent-dim">{agent.accessMethods.join('+') || '—'}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Official platforms */}
          {officialGroups.length > 0 && (
            <div className="mb-8">
              <div className="agent-section-title">official</div>
              {officialGroups.slice(0, 12).map(({ vendor, agents }) => (
                <Link
                  key={vendor.slug}
                  href={`/browse?official=1&vendor=${vendor.slug}`}
                  className="agent-row no-underline hover:underline"
                >
                  <span className="agent-accent">{vendor.slug}</span>
                  <span className="agent-dim">{vendor.name}</span>
                  <span className="agent-dim">{agents.length} listing{agents.length !== 1 ? 's' : ''}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Categories */}
          <div className="mb-8">
            <div className="agent-section-title">categories</div>
            {categories.map((cat) => (
              <Link key={cat.id} href={`/categories/${cat.slug}`} className="agent-row no-underline hover:underline">
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
              <EndpointLink href="/agents.json" className="agent-accent hover:opacity-80">/agents.json</EndpointLink>
              <span className="agent-dim">machine-readable full index</span>
              <span className="agent-dim">GET · no auth</span>
            </div>
            <div className="agent-row">
              <span className="agent-accent">/api/mcp</span>
              <span className="agent-dim">MCP server · search_agents, get_agent, list_categories, compare_agents, alternatives_to, connect_bundle</span>
              <span className="agent-dim">streamable-http · no auth</span>
            </div>
            <div className="agent-row">
              <Link href="/browse" className="agent-accent hover:opacity-80">/browse</Link>
              <span className="agent-dim">filterable directory</span>
              <span className="agent-dim">?q= ?task= ?category= ?access= ?official=1</span>
            </div>
            <div className="agent-row">
              <Link href="/new" className="agent-accent hover:opacity-80">/new</Link>
              <span className="agent-dim">every listing added in the last {NEW_DAYS} days, by drop</span>
              <span className="agent-dim">{newCount} since {since}</span>
            </div>
            <div className="agent-row">
              <EndpointLink href="/feed.xml" className="agent-accent hover:opacity-80">/feed.xml</EndpointLink>
              <span className="agent-dim">site releases and weekly drops, newest first</span>
              <span className="agent-dim">rss 2.0 · atom: /atom.xml</span>
            </div>
            <div className="agent-row">
              <Link href="/tasks" className="agent-accent hover:opacity-80">/tasks</Link>
              <span className="agent-dim">start from the job: the tools that do it, best fit first</span>
              <span className="agent-dim">json: GET /api/tasks</span>
            </div>
            <div className="agent-row">
              <Link href="/stacks" className="agent-accent hover:opacity-80">/stacks</Link>
              <span className="agent-dim">tools that work together, one job per stack</span>
              <span className="agent-dim">json: GET /api/stacks</span>
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
