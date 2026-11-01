import { getAgentBySlug, getEveryAgent } from '@/lib/catalog';
import { Badge } from '@/components/ui/Badge';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { AccessMethodBadges } from '@/components/ui/AccessMethodBadges';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { AgentCard } from '@/components/AgentCard';
import { AgentIcon } from '@/components/AgentIcon';
import { JsonLd } from '@/components/JsonLd';
import { getRelatedAgents } from '@/lib/related';
import { absoluteIconUrl } from '@/lib/icons';
import { listingCard, listingCardImage } from '@/lib/share-cards';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { authTypeLabel, pluralize } from '@/lib/utils';
import Link from 'next/link';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export async function generateStaticParams() {
  const agents = await getEveryAgent();
  return agents.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);
  if (!agent) return { title: 'Agent Not Found' };

  const url = `${BASE_URL}/agents/${slug}`;
  const categoryNames = agent.categories.map((c) => c.name).join(', ');
  const ogTitle = `${agent.name} — ${categoryNames} AI Agent`;

  return {
    title: agent.name,
    description: agent.description,
    alternates: { canonical: url },
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
  if (!agent) notFound();

  const related = getRelatedAgents(agent, allAgents);

  // No `offers`: the catalog has no pricing data, and "no auth" does not mean
  // free (paid products such as Midjourney list authType "none").
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

  const fields: [string, string][] = [
    ['name', agent.name],
    ['provider', agent.providerName],
    ['url', agent.agentUrl],
    ['categories', agent.categories.map((c) => c.slug).join(' · ') || '—'],
    ['access', agent.accessMethods.join(' · ') || '—'],
    ['auth', agent.authType],
    ['streaming', agent.supportsStreaming ? 'true' : 'false'],
    ['push', agent.supportsPushNotifications ? 'true' : 'false'],
    ['verified', agent.verified ? 'true' : 'false'],
    ['official', agent.officialVendor ? `true · ${agent.officialVendor.name}` : 'false'],
    ['tags', agent.tags.join(', ') || '—'],
  ];

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <JsonLd schema={agentSchema} />
        <div className="max-w-3xl mx-auto">
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
              {(agent.verified || agent.official || agent.featured || agent.sponsorLabel || agent.tier === 'premium') && (
                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  {agent.verified && <VerifiedBadge size="md" />}
                  <OfficialBadge agent={agent} />
                  {agent.sponsorLabel && <Badge variant="sponsor">{agent.sponsorLabel}</Badge>}
                  {agent.featured && <Badge variant="amber">Featured</Badge>}
                  {agent.tier === 'premium' && <Badge variant="amber">Premium</Badge>}
                </div>
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

          {/* Facts: how you reach it, how it authenticates, what it does, as a
              ruled definition list (label, dotted leader, value). */}
          <dl className="mb-10 border-t-[3px] border-[var(--dir-ink)]!">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
              <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span className="dir-label shrink-0">Access</span>
                <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!" />
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
                <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!" />
              </dt>
              <dd className="font-bold">{authTypeLabel(agent.authType)}</dd>
            </div>
            {skillCount > 0 && (
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5">
                <dt className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <span className="dir-label shrink-0">{pluralize(skillCount, 'Skill')}</span>
                  <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!" />
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

          {/* Agent URL */}
          <a
            href={agent.agentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-5 text-lg font-extrabold tracking-[0.02em] text-[var(--dir-on-yellow)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
          >
            Visit Agent <ExternalLink aria-hidden="true" className="w-4 h-4" />
          </a>

          {/* Related Agents */}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="dir-bar mb-1">Related Agents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                {related.map((r) => (
                  <AgentCard key={r.id} agent={r} />
                ))}
              </div>
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
          </div>

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

          {/* External link */}
          <div className="mt-8">
            <a
              href={agent.agentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="agent-accent text-xs hover:opacity-80 transition-opacity"
            >
              → {agent.agentUrl}
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
