import Link from '@/components/Link';
import type { Metadata, ResolvingMetadata } from 'next';
import { VerifiedBadge, VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { ALL_BADGE_TIERS, badgeMeta, SITE_ORIGIN } from '@/lib/badges';
import { getAllCategories, getOrganicAgents } from '@/lib/catalog';
import { pageMetadata } from '@/lib/metadata';
import { OFFICIAL_DEFINITION } from '@/lib/public-api';
import { getStacks } from '@/lib/stacks';
import { computeDirectoryStats } from '@/lib/stats';
import { getTasks } from '@/lib/tasks';

// Pure build-time SSG: zero serverless invocations per request.
export const dynamic = 'force-static';

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const agents = await getOrganicAgents();
  const officialCount = agents.filter((a) => a.official).length;
  return pageMetadata(
    {
      title: 'Directory Stats',
      description: `Live build-time metrics for Agent Switchboard: ${agents.length} AI agents, MCP servers, CLIs and APIs (${officialCount} Official), auth types, copy-ready config coverage, category and task breakdowns.`,
      path: '/stats',
      robots: { index: true, follow: true },
    },
    parent
  );
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export default async function StatsPage() {
  const [agents, categories] = await Promise.all([getOrganicAgents(), getAllCategories()]);
  const tasks = getTasks();
  const stacks = getStacks();
  const stats = computeDirectoryStats(agents, categories, tasks, stacks);
  const cc = stats.configCoverage;

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl mx-auto">
          <div className="pb-6 mb-8 border-b-[3px] border-[var(--dir-ink)]!">
            <p className="dir-label text-[var(--dir-muted)] mb-2">
              Build-time directory snapshot{stats.latestUpdatedAt ? ` · data through ${stats.latestUpdatedAt}` : ''}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">
              Directory Stats
            </h1>
            <p className="text-lg text-[var(--dir-muted)] leading-snug">
              Live counts computed directly from the checked-in catalog on every deploy — no
              estimates, no database lag, and zero runtime compute.
            </p>
          </div>

          {/* Headline counters */}
          <section className="mb-12" aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="dir-bar mb-4">
              Catalog Overview
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4 border-t-[3px] border-l border-[var(--dir-ink)]!">
              <div className="border-r border-b border-[var(--dir-ink)]! p-4">
                <dt className="dir-label text-[var(--dir-muted)]">Listings</dt>
                <dd className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums">
                  {fmt(stats.total)}
                </dd>
                <p className="mt-1 text-xs text-[var(--dir-muted)]">
                  {fmt(stats.uniqueProviders)} providers
                </p>
              </div>
              <div className="border-r border-b border-[var(--dir-ink)]! p-4">
                <dt className="dir-label text-[var(--dir-muted)]">Official</dt>
                <dd className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums">
                  {fmt(stats.official)}
                </dd>
                <p className="mt-1 text-xs text-[var(--dir-muted)]">
                  {stats.officialPct}% · {fmt(stats.officialVendors)} vendors
                </p>
              </div>
              <div className="border-r border-b border-[var(--dir-ink)]! p-4">
                <dt className="dir-label text-[var(--dir-muted)]">Verified</dt>
                <dd className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums">
                  {fmt(stats.verified)}
                </dd>
                <p className="mt-1 text-xs text-[var(--dir-muted)]">
                  {stats.verifiedPct}% checked
                </p>
              </div>
              <div className="border-r border-b border-[var(--dir-ink)]! p-4">
                <dt className="dir-label text-[var(--dir-muted)]">Structure</dt>
                <dd className="mt-1 text-3xl sm:text-4xl font-extrabold tabular-nums">
                  {stats.tasksCount}
                </dd>
                <p className="mt-1 text-xs text-[var(--dir-muted)]">
                  tasks · {stats.categoriesCount} categories · {stats.stacksCount} stacks
                </p>
              </div>
            </dl>
            <p className="mt-3 text-sm text-[var(--dir-muted)]">
              {fmt(stats.totalSkills)} discrete skills indexed across {fmt(stats.total)} published
              listings.
            </p>
          </section>

          {/* Access methods & Auth breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-12">
            <section aria-labelledby="access-heading">
              <h2 id="access-heading" className="dir-bar mb-2">
                Access Methods
              </h2>
              <p className="text-sm text-[var(--dir-muted)] mb-3">
                Listings can offer more than one access method (e.g., both MCP and REST API).
              </p>
              <dl>
                {stats.accessMethods.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-baseline gap-2 border-b border-[var(--dir-rule)]! py-2"
                  >
                    <dt className="font-bold shrink-0">{row.label}</dt>
                    <span aria-hidden="true" className="dir-row-leader" />
                    <dd className="tabular-nums font-bold shrink-0">
                      {fmt(row.count)}{' '}
                      <span className="font-normal text-sm text-[var(--dir-muted)]">
                        ({row.pct}%)
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section aria-labelledby="auth-heading">
              <h2 id="auth-heading" className="dir-bar mb-2">
                Authentication
              </h2>
              <p className="text-sm text-[var(--dir-muted)] mb-3">
                How listed products authenticate callers (Agent Switchboard itself requires none).
              </p>
              <dl>
                {stats.authTypes.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-baseline gap-2 border-b border-[var(--dir-rule)]! py-2"
                  >
                    <dt className="font-bold shrink-0">{row.label}</dt>
                    <span aria-hidden="true" className="dir-row-leader" />
                    <dd className="tabular-nums font-bold shrink-0">
                      {fmt(row.count)}{' '}
                      <span className="font-normal text-sm text-[var(--dir-muted)]">
                        ({row.pct}%)
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          {/* Copy-ready setup coverage */}
          <section className="mb-12" aria-labelledby="coverage-heading">
            <h2 id="coverage-heading" className="dir-bar mb-2">
              Copy-Ready Setup Coverage
            </h2>
            <p className="text-sm text-[var(--dir-muted)] mb-3">
              Verified endpoints, commands, and base URLs copied from each vendor&apos;s own docs
              (never guessed). Used by &ldquo;Use it now&rdquo;,{' '}
              <code className="mono text-xs font-bold">connect_bundle</code>, and{' '}
              <code className="mono text-xs font-bold">recommend</code>.
            </p>
            <dl className="border-t-[3px] border-[var(--dir-ink)]!">
              <div className="flex flex-wrap items-baseline gap-2 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="font-bold">Official MCP servers with copy-ready config</dt>
                <span aria-hidden="true" className="dir-row-leader" />
                <dd className="tabular-nums font-bold">
                  {fmt(cc.officialMcpWithConfig)} / {fmt(cc.officialMcpTotal)}{' '}
                  <span className="font-normal text-sm text-[var(--dir-muted)]">
                    ({cc.officialMcpWithConfigPct}%)
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-2 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="font-bold">All MCP servers with copy-ready config</dt>
                <span aria-hidden="true" className="dir-row-leader" />
                <dd className="tabular-nums font-bold">
                  {fmt(cc.mcpWithConfig)} / {fmt(cc.mcpTotal)}{' '}
                  <span className="font-normal text-sm text-[var(--dir-muted)]">
                    ({cc.mcpWithConfigPct}% · {fmt(cc.mcpHosted)} hosted · {fmt(cc.mcpLocalCommand)} local)
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-2 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="font-bold">CLI listings with verified install command</dt>
                <span aria-hidden="true" className="dir-row-leader" />
                <dd className="tabular-nums font-bold">
                  {fmt(cc.cliWithInstall)} / {fmt(cc.cliTotal)}{' '}
                  <span className="font-normal text-sm text-[var(--dir-muted)]">
                    ({cc.cliWithInstallPct}%)
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline gap-2 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="font-bold">API listings with documented base URL</dt>
                <span aria-hidden="true" className="dir-row-leader" />
                <dd className="tabular-nums font-bold">
                  {fmt(cc.apiWithBaseUrl)} / {fmt(cc.apiTotal)}{' '}
                  <span className="font-normal text-sm text-[var(--dir-muted)]">
                    ({cc.apiWithBaseUrlPct}%)
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Categories */}
          <section className="mb-12" aria-labelledby="categories-heading">
            <h2 id="categories-heading" className="dir-bar mb-2">
              Categories · <span className="dir-bar-count">{stats.categoriesCount}</span>
            </h2>
            <ul>
              {stats.categories.map((cat) => (
                <li key={cat.slug}>
                  <Link href={`/categories/${cat.slug}`} className="dir-row">
                    <span className="dir-row-name">{cat.name}</span>
                    <span aria-hidden="true" className="dir-row-leader" />
                    <span className="dir-row-meta tabular-nums">
                      {fmt(cat.count)}
                      {cat.official > 0 ? ` · ${fmt(cat.official)} official` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Top tasks */}
          <section className="mb-12" aria-labelledby="tasks-heading">
            <h2 id="tasks-heading" className="dir-bar mb-2">
              Top Tasks · <span className="dir-bar-count">top {stats.topTasks.length} of {stats.tasksCount}</span>
            </h2>
            <ul>
              {stats.topTasks.map((task) => (
                <li key={task.slug}>
                  <Link href={`/tasks/${task.slug}`} className="dir-row">
                    <span className="dir-row-name">{task.label}</span>
                    <span aria-hidden="true" className="dir-row-leader" />
                    <span className="dir-row-meta tabular-nums">
                      {fmt(task.count)}
                      {task.official > 0 ? ` · ${fmt(task.official)} official` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              <Link href="/tasks" className="inline-link">
                Browse all {stats.tasksCount} tasks →
              </Link>
            </p>
          </section>

          {/* Verification */}
          <section className="mb-12" id="verification" aria-labelledby="verification-heading">
            <h2 id="verification-heading" className="dir-bar mb-3">
              How Listings Are Verified
            </h2>
            <div className="space-y-3 text-[16px] leading-relaxed">
              <p>
                <VerifiedBadge />{' '}
                {VERIFIED_DEFINITION.replace(/^Verified:\s*/, '')}
              </p>
              <p>{OFFICIAL_DEFINITION}</p>
              <p className="text-[var(--dir-muted)]">
                Every entry lives in Git as a schema-validated JSON file (
                <code className="mono text-xs">content/agents/&lt;slug&gt;.json</code>), checked in
                CI before merge and swept weekly for dead links. Read the full criteria on{' '}
                <Link href="/about#verification" className="inline-link">
                  /about
                </Link>{' '}
                or inspect every addition and edit in the{' '}
                <Link href="/changelog" className="inline-link">
                  public changelog
                </Link>
                .
              </p>
            </div>
          </section>

          {/* Static vendor badges */}
          <section id="badges" aria-labelledby="badges-heading">
            <h2 id="badges-heading" className="dir-bar mb-3">
              Static Badges for Listed Maintainers
            </h2>
            <p className="text-[16px] leading-relaxed text-[var(--dir-muted)] mb-4">
              Maintainers of listed tools can embed a lightweight static SVG badge in their README
              or documentation. Each tier is a static CDN file with zero tracking and zero runtime
              compute — open any{' '}
              <Link href="/browse" className="inline-link">
                listing page
              </Link>{' '}
              and expand <strong>Embed badge</strong> to copy the exact Markdown or HTML for your
              slug.
            </p>
            <div className="border-t-[3px] border-[var(--dir-ink)]!">
              {ALL_BADGE_TIERS.map((tier) => {
                const meta = badgeMeta(tier);
                return (
                  <div
                    key={tier}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--dir-rule)]! py-3.5"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[17px]">{meta.label}</div>
                      <p className="text-sm text-[var(--dir-muted)]">{meta.description}</p>
                      <code className="mono text-xs text-[var(--dir-muted)] break-all">
                        {SITE_ORIGIN}
                        {meta.path}
                      </code>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meta.path}
                      alt={meta.alt}
                      width={meta.width}
                      height={meta.height}
                      className="block h-7 w-auto shrink-0 self-start sm:self-center"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-3xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">directory stats</div>
            <div className="agent-dim text-xs leading-relaxed">
              Build-time metrics computed from the live catalog
              {stats.latestUpdatedAt ? ` (latest listing date: ${stats.latestUpdatedAt})` : ''}.
            </div>
          </div>

          <div className="agent-section-title">overview</div>
          <div className="agent-row">
            <span className="agent-dim">published_listings</span>
            <span className="agent-accent">{stats.total}</span>
            <span className="agent-dim">{stats.uniqueProviders} providers</span>
          </div>
          <div className="agent-row">
            <span className="agent-dim">official</span>
            <span className="agent-accent">{stats.official}</span>
            <span className="agent-dim">
              {stats.officialPct}% · {stats.officialVendors} vendors
            </span>
          </div>
          <div className="agent-row">
            <span className="agent-dim">verified</span>
            <span className="agent-accent">{stats.verified}</span>
            <span className="agent-dim">{stats.verifiedPct}%</span>
          </div>
          <div className="agent-row">
            <span className="agent-dim">taxonomy</span>
            <span className="agent-accent">
              {stats.categoriesCount} categories · {stats.tasksCount} tasks · {stats.stacksCount} stacks
            </span>
            <span className="agent-dim">{stats.totalSkills} skills</span>
          </div>

          <div className="agent-section-title">access methods</div>
          {stats.accessMethods.map((row) => (
            <div key={row.key} className="agent-row">
              <span className="agent-dim">{row.key}</span>
              <span className="agent-accent">{row.count}</span>
              <span className="agent-dim">{row.pct}%</span>
            </div>
          ))}

          <div className="agent-section-title">auth types</div>
          {stats.authTypes.map((row) => (
            <div key={row.key} className="agent-row">
              <span className="agent-dim">{row.key}</span>
              <span className="agent-accent">{row.count}</span>
              <span className="agent-dim">{row.pct}%</span>
            </div>
          ))}

          <div className="agent-section-title">copy-ready config coverage</div>
          <div className="agent-row">
            <span className="agent-dim">official_mcp_config</span>
            <span className="agent-accent">
              {cc.officialMcpWithConfig}/{cc.officialMcpTotal}
            </span>
            <span className="agent-dim">{cc.officialMcpWithConfigPct}%</span>
          </div>
          <div className="agent-row">
            <span className="agent-dim">all_mcp_config</span>
            <span className="agent-accent">
              {cc.mcpWithConfig}/{cc.mcpTotal}
            </span>
            <span className="agent-dim">
              {cc.mcpWithConfigPct}% ({cc.mcpHosted} hosted, {cc.mcpLocalCommand} local)
            </span>
          </div>
          <div className="agent-row">
            <span className="agent-dim">cli_install</span>
            <span className="agent-accent">
              {cc.cliWithInstall}/{cc.cliTotal}
            </span>
            <span className="agent-dim">{cc.cliWithInstallPct}%</span>
          </div>
          <div className="agent-row">
            <span className="agent-dim">api_base_url</span>
            <span className="agent-accent">
              {cc.apiWithBaseUrl}/{cc.apiTotal}
            </span>
            <span className="agent-dim">{cc.apiWithBaseUrlPct}%</span>
          </div>

          <div className="agent-section-title">categories</div>
          {stats.categories.map((cat) => (
            <div key={cat.slug} className="agent-row">
              <span className="agent-accent">{cat.slug}</span>
              <span className="agent-dim">{cat.count}</span>
              <span className="agent-dim">{cat.official} official</span>
            </div>
          ))}

          <div className="agent-section-title">top tasks</div>
          {stats.topTasks.map((task) => (
            <div key={task.slug} className="agent-row">
              <span className="agent-accent">{task.slug}</span>
              <span className="agent-dim">{task.count}</span>
              <span className="agent-dim">{task.official} official</span>
            </div>
          ))}

          <div className="agent-section-title">static badges</div>
          {ALL_BADGE_TIERS.map((tier) => {
            const meta = badgeMeta(tier);
            return (
              <div key={tier} className="agent-row">
                <span className="agent-accent">{meta.path}</span>
                <span className="agent-dim">{meta.label}</span>
                <span className="agent-dim">
                  {meta.width}x{meta.height}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
