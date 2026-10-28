import Link from 'next/link';
import { SearchBar } from '@/components/SearchBar';
import {
  getHomepageAgents,
  getAllCategories,
  getAgentCount,
  getUniqueProviderCount,
  getSiteSettings,
  getOfficialGroups,
} from '@/lib/catalog';
import { FeaturedAgentCard } from '@/components/FeaturedAgentCard';
import { CategoryCard } from '@/components/CategoryCard';
import { OfficialPlatforms } from '@/components/OfficialPlatforms';
import { JsonLd } from '@/components/JsonLd';
import { AgentViewButton } from '@/components/ViewModeToggle';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export const metadata: Metadata = {
  alternates: { canonical: BASE_URL },
  openGraph: {
    // `type` is repeated here on purpose: a page-level openGraph block replaces
    // the layout's rather than merging into it, so leaving it out drops og:type
    // from the homepage only.
    type: 'website',
    url: BASE_URL,
  },
};

/** Thumb-tab abbreviations for first words too long for the 88px rail. */
const RAIL_SHORT: Record<string, string> = {
  infrastructure: 'Infra',
  // Each stays a prefix of the full name, so the visible text is part of the accessible name.
  communication: 'Comm.',
  orchestration: 'Orch.',
};

/**
 * Short thumb-tab text: the first word of the category name ("Data & Analytics"
 * -> "Data"), abbreviated when it would not fit the rail. The tab's accessible
 * name is still the full category name.
 */
function railLabel(name: string): string {
  const word = name.split(/\s*&\s*|\s+/)[0] || name;
  return RAIL_SHORT[word.toLowerCase()] ?? (word.length > 12 ? `${word.slice(0, 5)}.` : word);
}

export default async function HomePage() {
  const [homepageAgents, categories, agentCount, providerCount, settings, officialGroups] =
    await Promise.all([
      getHomepageAgents(),
      getAllCategories(),
      getAgentCount(),
      getUniqueProviderCount(),
      getSiteSettings(),
      getOfficialGroups(),
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

        {/* ── MCP callout ──────────────────────────────────────────── */}
        <section className="pt-5">
          <div className="container-wide">
            <Link
              href="/for-agents#mcp"
              className="group flex flex-col gap-1 border border-[var(--dir-ink)]! px-4 py-3 text-[var(--dir-ink)] no-underline sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4"
            >
              <span className="mono text-[13px] font-bold">$ this directory is an MCP server</span>
              <span className="mono text-[13px] group-hover:underline">
                connect your agent → agentswitchboard.dev/api/mcp
              </span>
              <span className="mono text-[13px] text-[var(--dir-muted)] sm:ml-auto">
                search_agents · get_agent · list_categories
              </span>
            </Link>
          </div>
        </section>

        {/* ── Directory: Top Agents + categories, phone-book columns ── */}
        <section aria-label="Listings" className="pt-6 pb-14">
          <div className="container-wide gap-x-10 md:columns-2 lg:columns-3">
            {homepageAgents.length > 0 && (
              <section aria-labelledby="top-agents" className="mb-6">
                {/* Bar, blurb and first listing stay together so a column never ends on a bare header. */}
                <div className="break-inside-avoid">
                  <div className="dir-bar flex items-baseline gap-1.5">
                    <h2 id="top-agents" className="m-0">Top Agents</h2>
                    <span className="font-semibold tracking-normal">· {homepageAgents.length}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] text-[var(--dir-muted)]">
                    Editor&apos;s picks and the latest additions to the switchboard
                  </p>
                  <FeaturedAgentCard agent={homepageAgents[0].agent} label={homepageAgents[0].label} />
                </div>
                {homepageAgents.slice(1).map(({ agent, label }) => (
                  <FeaturedAgentCard key={agent.id} agent={agent} label={label} />
                ))}
                <Link href="/browse" className="dir-row break-inside-avoid">
                  <span className="dir-row-name">View all</span>
                  <span className="dir-row-leader" aria-hidden="true" />
                  <span className="dir-row-meta" aria-hidden="true">→</span>
                </Link>
              </section>
            )}

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

        {/* ── Thumb-index rail (lg+): the agents' text-only tab first, then categories ── */}
        <div className="absolute top-0 right-0 hidden w-[88px] flex-col lg:flex">
          <AgentViewButton variant="tab" className="w-full" />
          <nav aria-label="Categories">
            <ul className="m-0 list-none p-0">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    aria-label={cat.name}
                    title={cat.name}
                    className="flex min-h-[56px] items-center justify-center border-b border-l-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-1 text-center text-[12px] font-extrabold uppercase leading-[1.05] tracking-[0.02em] text-[var(--dir-ink)] no-underline hyphens-auto [overflow-wrap:anywhere] hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:bg-[var(--dir-yellow)] focus-visible:text-[var(--dir-on-yellow)]"
                  >
                    {railLabel(cat.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
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

          {/* Official platforms */}
          {officialGroups.length > 0 && (
            <div className="mb-8">
              <div className="agent-section-title">official</div>
              {officialGroups.slice(0, 12).map(({ vendor, agents }) => (
                <Link
                  key={vendor.slug}
                  href={`/browse?official=1&vendor=${vendor.slug}`}
                  className="agent-row hover:opacity-80 transition-opacity no-underline"
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
              <span className="agent-dim">?q= ?category= ?access= ?official=1</span>
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
