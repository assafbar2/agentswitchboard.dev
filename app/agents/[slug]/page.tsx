import {
  getAgentBySlug,
  getAllRetiredListings,
  getEveryAgent,
  getOrganicAgents,
  getRetiredListingBySlug,
} from '@/lib/catalog';
import { Badge } from '@/components/ui/Badge';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { AccessMethodBadges } from '@/components/ui/AccessMethodBadges';
import { SponsoredBadge } from '@/components/SponsoredBadge';
import { VerifiedNote } from '@/components/VerifiedNote';
import { lastChecked } from '@/lib/verified';
import { AgentCard } from '@/components/AgentCard';
import { AgentIcon } from '@/components/AgentIcon';
import { JsonLd } from '@/components/JsonLd';
import { CompareWith } from '@/components/CompareWith';
import { MyStackToggle } from '@/components/MyStackToggle';
import { hasUseItNow, UseItNow } from '@/components/UseItNow';
import { comparisonsWith, curatedComparisons } from '@/lib/compare';
import { COMPARE_MAX, compareHref } from '@/lib/compare-link';
import { limitations } from '@/lib/decide';
import { listingFeedbackUrl } from '@/lib/feedback';
import { alternativesPage, getRelatedAgents } from '@/lib/related';
import { getTasks } from '@/lib/tasks';
import {
  DEFAULT_ARCHIVE_REASON,
  formatArchiveDate,
  tombstoneAlternatives,
  type RetiredListing,
} from '@/lib/tombstones';
import {
  DEPLOYMENT_LABELS,
  isNotableLifecycle,
  LIFECYCLE_DEFAULT_NOTES,
  LIFECYCLE_LABELS,
  PRICING_LABELS,
} from '@/lib/truth-fields';
import { tryThis } from '@/lib/try-this';
import { howToUse, howToUseRows } from '@/lib/use-it-now';
import { absoluteIconUrl } from '@/lib/icons';
import { listingCard, listingCardImage } from '@/lib/share-cards';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { authTypeLabel, pluralize } from '@/lib/utils';
import Link from '@/components/Link';
import type { Metadata } from 'next';
import type { Agent } from '@/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

// The catalog changes only with a deploy: an unknown slug is the static 404,
// not a render per request.
export const dynamicParams = false;

export async function generateStaticParams() {
  const [agents, retired] = await Promise.all([getEveryAgent(), getAllRetiredListings()]);
  const seen = new Set<string>();
  const params: { slug: string }[] = [];
  for (const a of agents) {
    seen.add(a.slug);
    params.push({ slug: a.slug });
  }
  for (const r of retired) {
    if (!seen.has(r.slug)) params.push({ slug: r.slug });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);
  if (agent) {
    const url = `${BASE_URL}/agents/${slug}`;
    const categoryNames = agent.categories.map((c) => c.name).join(', ');
    const ogTitle = `${agent.name} — ${categoryNames} AI Agent`;

    return {
      title: agent.name,
      description: agent.description,
      alternates: { canonical: url, types: { 'text/markdown': `/agents/${slug}.md` } },
      openGraph: {
        title: ogTitle,
        description: agent.description,
        url,
        type: 'website',
        siteName: 'Agent Switchboard',
        // twitter:image copies it.
        images: [listingCardImage(slug, listingCard(agent))],
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description: agent.description,
      },
    };
  }

  const retired = await getRetiredListingBySlug(slug);
  if (retired) {
    const reason = retired.reason ?? DEFAULT_ARCHIVE_REASON;
    return {
      title: `${retired.name} — Archived Listing`,
      description: `${retired.name} is no longer listed on Agent Switchboard. ${reason}`,
      robots: { index: false, follow: true },
      alternates: { canonical: `${BASE_URL}/agents/${slug}` },
    };
  }

  return { title: 'Agent Not Found' };
}

function RetiredAgentView({ retired, alternatives }: { retired: RetiredListing; alternatives: Agent[] }) {
  const reason = retired.reason ?? DEFAULT_ARCHIVE_REASON;
  const primaryCategory = retired.categories[0];

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 pb-5 border-b-[3px] border-[var(--dir-ink)]!">
            <p className="dir-label mb-2 text-[var(--dir-muted)]">Archived listing</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] wrap-break-word">
              {retired.name}
            </h1>
            {retired.providerName && (
              <p className="text-lg font-semibold text-[var(--dir-muted)] mt-2">by {retired.providerName}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <Badge variant="rose">Archived</Badge>
              {retired.archivedAt && (
                <span className="text-sm font-semibold text-[var(--dir-muted)]">
                  Removed{' '}
                  <time dateTime={retired.archivedAt}>{formatArchiveDate(retired.archivedAt)}</time>
                </span>
              )}
            </div>
          </div>

          <section
            aria-labelledby="tombstone-reason"
            className="border-[3px] border-[var(--dir-ink)]! p-5 sm:p-6 mb-10"
          >
            <h2 id="tombstone-reason" className="dir-label mb-2">
              Why this listing was removed
            </h2>
            <p className="text-lg leading-relaxed">{reason}</p>
            {retired.description && (
              <p className="text-[15px] leading-relaxed text-[var(--dir-muted)] mt-3">
                Previously listed as: {retired.description}
              </p>
            )}
            <p className="text-sm text-[var(--dir-muted)] mt-4">
              See the{' '}
              <Link href="/changelog" className="inline-link">
                directory changelog
              </Link>{' '}
              for removal history, or{' '}
              <Link href="/request" className="inline-link">
                request a missing tool
              </Link>{' '}
              if you need an alternative we don&rsquo;t list yet.
            </p>
          </section>

          {alternatives.length > 0 && (
            <section aria-labelledby="tombstone-alternatives" className="mb-10">
              <h2 id="tombstone-alternatives" className="dir-bar mb-1">
                Active alternatives
              </h2>
              <p className="text-[15px] text-[var(--dir-muted)] mt-2 mb-2">
                Organic live listings in the directory that cover similar work.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                {alternatives.map((alt) => (
                  <AgentCard key={alt.id} agent={alt} />
                ))}
              </div>
              {primaryCategory && (
                <Link href={`/categories/${primaryCategory.slug}`} className="dir-row mt-2">
                  <span className="dir-row-name">Browse all {primaryCategory.name} listings</span>
                  <span className="dir-row-leader" aria-hidden="true" />
                  <span className="dir-row-meta" aria-hidden="true">→</span>
                </Link>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-4 border-t-[3px] border-[var(--dir-ink)]! pt-5 text-[16px] font-bold">
            <Link href="/browse" className="inline-link">
              Browse active directory
            </Link>
            <Link href="/tasks" className="inline-link">
              Browse by task
            </Link>
          </div>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-3xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">{retired.slug} (archived)</div>
            <div className="agent-dim text-xs leading-relaxed mt-1">{reason}</div>
          </div>
          <div className="agent-section-title">status</div>
          <div className="agent-row">
            <span className="agent-dim">status</span>
            <span className="agent-accent">archived</span>
            <span />
          </div>
          {retired.archivedAt && (
            <div className="agent-row">
              <span className="agent-dim">archived_at</span>
              <span className="agent-accent">{retired.archivedAt}</span>
              <span />
            </div>
          )}
          <div className="agent-row">
            <span className="agent-dim">reason</span>
            <span className="agent-accent">{reason}</span>
            <span />
          </div>
          {alternatives.length > 0 && (
            <>
              <div className="agent-section-title">active alternatives</div>
              {alternatives.map((alt) => (
                <Link key={alt.id} href={`/agents/${alt.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">{alt.slug}</span>
                  <span className="agent-dim">{alt.name}</span>
                  <span className="agent-dim">{alt.accessMethods.join('+') || '—'}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [agent, allAgents] = await Promise.all([
    getAgentBySlug(slug),
    getEveryAgent(),
  ]);

  if (!agent) {
    const retired = await getRetiredListingBySlug(slug);
    if (!retired) notFound();
    const organicCatalog = await getOrganicAgents();
    const alternatives = tombstoneAlternatives(retired, organicCatalog, getTasks());
    return <RetiredAgentView retired={retired} alternatives={alternatives} />;
  }

  const related = getRelatedAgents(agent, allAgents);
  const alternatives = alternativesPage(agent, allAgents);
  const tryFirst = tryThis(agent);
  const use = howToUse(agent);
  const useRows = howToUseRows(use);
  const agentLimitations = limitations(agent);
  const compareTop = related.slice(0, COMPARE_MAX - 1);
  const compareTopHref = compareHref([agent.slug, ...compareTop.map((a) => a.slug)]);
  const comparisons = comparisonsWith(agent.slug, curatedComparisons(allAgents));
  const feedbackUrl = listingFeedbackUrl(agent);

  // No `offers`: structured pricing labels describe the model without a
  // currency price, and "no auth" does not mean free.
  const agentSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: agent.name,
    description: agent.description,
    url: agent.agentUrl,
    ...(agent.iconUrl && { image: absoluteIconUrl(agent.iconUrl, BASE_URL) }),
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Cloud',
    provider: {
      '@type': 'Organization',
      name: agent.providerName,
      url: agent.providerUrl,
    },
  };

  const skillCount = agent.skills.length;
  const notableLifecycle = isNotableLifecycle(agent.lifecycle) ? agent.lifecycle : null;
  const lifecycleMessage = notableLifecycle
    ? agent.lifecycleNote ?? LIFECYCLE_DEFAULT_NOTES[notableLifecycle]
    : null;

  const fields: [string, string][] = [
    ['name', agent.name],
    ['provider', agent.providerName],
    ['url', agent.agentUrl],
    ['categories', agent.categories.map((c) => c.slug).join(' · ') || '—'],
    ['access', agent.accessMethods.join(' · ') || '—'],
    ['auth', agent.authType],
    ...(agent.pricing
      ? [['pricing', `${PRICING_LABELS[agent.pricing]}${agent.pricingUrl ? ` (${agent.pricingUrl})` : ''}`] as [string, string]]
      : agent.pricingUrl
        ? [['pricing', agent.pricingUrl] as [string, string]]
        : []),
    ...(agent.openSource !== undefined ? [['open_source', agent.openSource ? 'true' : 'false'] as [string, string]] : []),
    ...(agent.license ? [['license', agent.license] as [string, string]] : []),
    ...(agent.deployment && agent.deployment.length > 0
      ? [['hosting', agent.deployment.map((d) => DEPLOYMENT_LABELS[d]).join(' · ')] as [string, string]]
      : []),
    ...(agent.lifecycle
      ? [['lifecycle', `${agent.lifecycle}${agent.lifecycleNote ? ` · ${agent.lifecycleNote}` : ''}`] as [string, string]]
      : []),
    ['streaming', agent.supportsStreaming ? 'true' : 'false'],
    ['push', agent.supportsPushNotifications ? 'true' : 'false'],
    ['verified', agent.verified ? 'true' : 'false'],
    ['official', agent.officialVendor ? `true · ${agent.officialVendor.name}` : 'false'],
    ['sponsored', agent.sponsored ? 'true · paid placement: first, labeled, in the website’s task answers; never changes search or API ranking' : 'false'],
    ['tags', agent.tags.join(', ') || '—'],
  ];

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <JsonLd schema={agentSchema} />
        <div className="max-w-3xl mx-auto">
          {/* Top notice banner for acquired / deprecated / beta lifecycle states */}
          {notableLifecycle && lifecycleMessage && (
            <aside
              aria-label={`${LIFECYCLE_LABELS[notableLifecycle]} notice`}
              className={`mb-6 border-[3px] p-4 ${
                notableLifecycle === 'deprecated'
                  ? 'border-[var(--rose)]!'
                  : 'border-[var(--dir-ink)]!'
              }`}
            >
              <div className="flex items-start gap-2.5 flex-wrap">
                <Badge variant={notableLifecycle === 'deprecated' ? 'rose' : 'amber'}>
                  {LIFECYCLE_LABELS[notableLifecycle]}
                </Badge>
                <p className="text-[15px] leading-snug font-semibold flex-1 min-w-[200px]">
                  {lifecycleMessage}
                </p>
              </div>
            </aside>
          )}

          {/* Header: a directory entry. Name, provider, then the small labels,
              closed off by the heavy ink rule. */}
          <div className="flex items-start gap-4 mb-6 pb-5 border-b-[3px] border-[var(--dir-ink)]!">
            <AgentIcon name={agent.name} iconUrl={agent.iconUrl} size={56} lazy={false} />
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] wrap-break-word">
                {agent.name}
              </h1>
              <p className="text-lg font-semibold text-[var(--dir-muted)] mt-2">
                by{' '}
                <a
                  href={agent.providerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
                >
                  {agent.providerName}
                </a>
                {agent.version && <span className="ml-2">v{agent.version}</span>}
              </p>
              {(agent.sponsored ||
                agent.verified ||
                agent.official ||
                agent.featured ||
                agent.tier === 'premium') && (
                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  {agent.sponsored && <SponsoredBadge />}
                  {agent.verified && <VerifiedNote size="md" checked={lastChecked(agent)} />}
                  <OfficialBadge agent={agent} />
                  {agent.featured && <Badge variant="amber">Featured</Badge>}
                  {agent.tier === 'premium' && <Badge variant="amber">Premium</Badge>}
                </div>
              )}
              {agent.sponsored && (
                <p className="text-sm text-[var(--dir-muted)] mt-2">
                  Sponsored: a paid placement. On this website it comes first, labeled, among the tools for
                  each task it does; it never changes where it ranks in search or alternatives.{' '}
                  <Link
                    href="/about#sponsored"
                    className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
                  >
                    What Sponsored means
                  </Link>
                </p>
              )}
              {agent.officialVendor && (
                <p className="text-sm text-[var(--dir-muted)] mt-2">
                  Official listing: built and published by {agent.officialVendor.name}.{' '}
                  <Link
                    href={`/browse?official=1&vendor=${agent.officialVendor.slug}`}
                    className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
                  >
                    More from {agent.officialVendor.name}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-lg leading-relaxed mb-8">{agent.description}</p>

          {hasUseItNow(tryFirst, use) ? (
            <UseItNow agent={agent} tryThis={tryFirst} use={use} />
          ) : (
            <MyStackToggle agent={agent} className="mb-10" />
          )}

          {/* Limitations right under Use it now */}
          {agentLimitations.length > 0 && (
            <section aria-labelledby="limitations" className="mb-10">
              <h2 id="limitations" className="dir-bar mb-2">
                Limitations
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-[16px] leading-snug text-[var(--dir-muted)] marker:text-[var(--dir-ink)]">
                {agentLimitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <CompareWith agent={agent} top={compareTop} comparisons={comparisons} />

          {/* Facts: how you reach it, how it authenticates, pricing, hosting,
              open source / license, skills, as a ruled definition list. */}
          <dl className="mb-10 border-t-[3px] border-[var(--dir-ink)]!">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
              <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span className="dir-label shrink-0">Access</span>
                <span aria-hidden="true" className="dir-row-leader" />
              </dt>
              <dd className="flex justify-end">
                {agent.accessMethods.length > 0 ? (
                  <AccessMethodBadges methods={agent.accessMethods} size="md" />
                ) : (
                  <span className="font-bold">Not listed</span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
              <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span className="dir-label shrink-0">Auth</span>
                <span aria-hidden="true" className="dir-row-leader" />
              </dt>
              <dd className="font-bold">{authTypeLabel(agent.authType)}</dd>
            </div>
            {(agent.pricing || agent.pricingUrl) && (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="dir-label shrink-0">Pricing</span>
                  <span aria-hidden="true" className="dir-row-leader" />
                </dt>
                <dd className="font-bold">
                  {agent.pricingUrl ? (
                    <a
                      href={agent.pricingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
                    >
                      {agent.pricing ? PRICING_LABELS[agent.pricing] : 'See pricing'}
                      <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    PRICING_LABELS[agent.pricing!]
                  )}
                </dd>
              </div>
            )}
            {agent.openSource !== undefined && (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="dir-label shrink-0">Open source</span>
                  <span aria-hidden="true" className="dir-row-leader" />
                </dt>
                <dd className="font-bold">{agent.openSource ? 'Yes' : 'No'}</dd>
              </div>
            )}
            {agent.license && (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="dir-label shrink-0">License</span>
                  <span aria-hidden="true" className="dir-row-leader" />
                </dt>
                <dd className="font-bold">{agent.license}</dd>
              </div>
            )}
            {agent.deployment && agent.deployment.length > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="dir-label shrink-0">Hosting</span>
                  <span aria-hidden="true" className="dir-row-leader" />
                </dt>
                <dd className="font-bold">
                  {agent.deployment.map((d) => DEPLOYMENT_LABELS[d]).join(' · ')}
                </dd>
              </div>
            )}
            {skillCount > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="dir-label shrink-0">{pluralize(skillCount, 'Skill')}</span>
                  <span aria-hidden="true" className="dir-row-leader" />
                </dt>
                <dd className="font-bold">{skillCount}</dd>
              </div>
            )}
          </dl>

          {/* Skills */}
          {agent.skills.length > 0 && (
            <div className="mb-10">
              <h2 className="dir-bar mb-1">Skills</h2>
              <ul>
                {agent.skills.map((skill) => (
                  <li key={skill.id} className="border-b border-[var(--dir-rule)]! py-3">
                    <h3 className="text-[17px] font-bold leading-snug">{skill.name}</h3>
                    <p className="text-[var(--dir-muted)] mt-0.5">{skill.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Categories & Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {agent.categories.map((cat) => (
              <Link key={cat.id} href={`/categories/${cat.slug}`} className="no-underline hover:underline">
                <Badge variant="default">{cat.name}</Badge>
              </Link>
            ))}
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>

          {/* Agent URL + understated correction / update link */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <a
              href={agent.agentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-5 text-lg font-extrabold tracking-[0.02em] text-[var(--dir-on-yellow)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
            >
              Visit Agent <ExternalLink aria-hidden="true" className="w-4 h-4" />
            </a>
            <a
              href={feedbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[var(--dir-muted)] underline decoration-1 underline-offset-2 hover:text-[var(--dir-ink)] hover:decoration-2"
            >
              Report an error or suggest an update
            </a>
          </div>

          {/* Related Agents */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="dir-bar mb-1">Related Agents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                {related.map((r) => (
                  <AgentCard key={r.id} agent={r} />
                ))}
              </div>
              {alternatives && (
                <Link href={`/agents/${agent.slug}/alternatives`} className="dir-row mt-2">
                  <span className="dir-row-name">See {alternatives.length} alternatives</span>
                  <span className="dir-row-leader" aria-hidden="true" />
                  <span className="dir-row-meta" aria-hidden="true">→</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-3xl">

          {/* Header */}
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">{agent.slug}</div>
            <div className="agent-dim text-xs leading-relaxed mt-1">{agent.description}</div>
            <div className="agent-dim text-xs mt-1">Markdown: /agents/{agent.slug}.md</div>
          </div>

          {tryFirst && (
            <>
              <div className="agent-section-title">try this first</div>
              <div className="agent-dim text-xs">{tryFirst.lead}</div>
              {tryFirst.prompts.map((prompt) => (
                <div key={prompt.skillId} className="agent-row">
                  <span className="agent-accent">{prompt.text}</span>
                  <span className="agent-dim">{prompt.skillId}</span>
                  <span />
                </div>
              ))}
            </>
          )}

          {useRows.length > 0 && (
            <>
              <div className="agent-section-title">use it now</div>
              {useRows.map(([key, value]) => (
                <div key={key} className="agent-row">
                  <span className="agent-accent break-all">
                    {/^https?:\/\//.test(value) ? (
                      <a href={value} rel="noopener noreferrer" className="hover:opacity-80">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </span>
                  <span className="agent-dim">{key}</span>
                  <span />
                </div>
              ))}
            </>
          )}

          {agentLimitations.length > 0 && (
            <>
              <div className="agent-section-title">limitations</div>
              {agentLimitations.map((item) => (
                <div key={item} className="agent-row">
                  <span className="agent-accent">{item}</span>
                  <span />
                  <span />
                </div>
              ))}
            </>
          )}

          {/* Fields */}
          <div className="agent-section-title">fields</div>
          {fields.map(([key, value]) => (
            <div key={key} className="agent-row">
              <span className="agent-dim">{key}</span>
              <span className="agent-accent">{value}</span>
              <span />
            </div>
          ))}

          {/* Skills */}
          {agent.skills.length > 0 && (
            <>
              <div className="agent-section-title">skills</div>
              {agent.skills.map((skill) => (
                <div key={skill.id} className="agent-row">
                  <span className="agent-accent">{skill.id}</span>
                  <span className="agent-dim">{skill.name}</span>
                  <span className="agent-dim" style={{ fontSize: '0.75rem' }}>
                    {skill.description.length > 55
                      ? skill.description.slice(0, 55) + '…'
                      : skill.description}
                  </span>
                </div>
              ))}
            </>
          )}

          {alternatives && (
            <>
              <div className="agent-section-title">alternatives</div>
              <Link href={`/agents/${agent.slug}/alternatives`} className="agent-row no-underline hover:underline">
                <span className="agent-accent">/agents/{agent.slug}/alternatives</span>
                <span className="agent-dim">{alternatives.length} listed</span>
                <span className="agent-dim">{alternatives.slice(0, 3).map((a) => a.agent.slug).join(', ')}</span>
              </Link>
            </>
          )}

          {(compareTop.length > 0 || comparisons.length > 0) && (
            <>
              <div className="agent-section-title">compare</div>
              {compareTop.length > 0 && (
                <Link href={compareTopHref} className="agent-row no-underline hover:underline">
                  <span className="agent-accent break-all">{compareTopHref}</span>
                  <span className="agent-dim">with {compareTop.map((a) => a.slug).join(', ')}</span>
                  <span />
                </Link>
              )}
              {comparisons.map((c) => (
                <Link key={c.slug} href={`/compare/${c.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent break-all">/compare/{c.slug}</span>
                  <span className="agent-dim">curated comparison</span>
                  <span />
                </Link>
              ))}
            </>
          )}

          {/* External link */}
          <div className="mt-8 flex flex-wrap gap-6">
            <a
              href={agent.agentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="agent-accent text-xs hover:opacity-80 transition-opacity"
            >
              → {agent.agentUrl}
            </a>
            <a
              href={feedbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="agent-dim text-xs hover:opacity-80 transition-opacity"
            >
              report error / suggest update
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
