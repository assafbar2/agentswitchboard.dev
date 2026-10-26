import { getAgentBySlug, getEveryAgent } from '@/lib/catalog';
import { Badge } from '@/components/ui/Badge';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { AccessMethodBadges } from '@/components/ui/AccessMethodBadges';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { AgentCard } from '@/components/AgentCard';
import { JsonLd } from '@/components/JsonLd';
import { getRelatedAgents } from '@/lib/related';
import { notFound } from 'next/navigation';
import { ExternalLink, Zap, Shield, Plug } from 'lucide-react';
import { authTypeLabel, pluralize } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
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
      images: [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: agent.description,
      images: [`${BASE_URL}/opengraph-image`],
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
      <div className="human-only container-wide section">
        <JsonLd schema={agentSchema} />
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            {agent.iconUrl ? (
              <Image src={agent.iconUrl} alt="" width={56} height={56} className="w-14 h-14 rounded-xl bg-white/5" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
                <span className="mono text-2xl text-[var(--accent)] font-bold">{agent.name[0]}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
                {agent.verified && <VerifiedBadge size="md" />}
                <OfficialBadge agent={agent} />
                {agent.featured && <Badge variant="amber">Featured</Badge>}
                {agent.tier === 'premium' && <Badge variant="amber">Premium</Badge>}
              </div>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                by{' '}
                <a href={agent.providerUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-secondary)] transition-colors">
                  {agent.providerName}
                </a>
                {agent.version && <span className="ml-2">v{agent.version}</span>}
              </p>
              {agent.officialVendor && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Official listing: built and published by {agent.officialVendor.name}.{' '}
                  <Link
                    href={`/browse?official=1&vendor=${agent.officialVendor.slug}`}
                    className="text-[var(--blue)] hover:underline"
                  >
                    More from {agent.officialVendor.name}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-[var(--text-secondary)] leading-relaxed mb-8">{agent.description}</p>

          {/* Meta cards: how you reach it, how it authenticates, what it does.
              Labels come first in the DOM (read as "Access: API, MCP") and
              sit under the value visually. */}
          <dl className={`grid grid-cols-2 gap-3 mb-8 ${skillCount > 0 ? 'sm:grid-cols-3' : ''}`}>
            <div className={`card p-3 flex flex-col items-center text-center ${skillCount > 0 ? 'col-span-2 sm:col-span-1' : ''}`}>
              <dt className="order-last mt-1 text-xs text-[var(--text-muted)]">Access</dt>
              <dd className="flex flex-col items-center [&>div]:justify-center">
                <Plug aria-hidden="true" className="w-4 h-4 mb-1 text-[var(--accent)]" />
                {agent.accessMethods.length > 0 ? (
                  <AccessMethodBadges methods={agent.accessMethods} size="md" />
                ) : (
                  <span className="mono text-sm font-bold">Not listed</span>
                )}
              </dd>
            </div>
            <div className="card p-3 flex flex-col items-center text-center">
              <dt className="order-last text-xs text-[var(--text-muted)]">Auth</dt>
              <dd className="flex flex-col items-center mono text-sm font-bold">
                <Shield aria-hidden="true" className="w-4 h-4 mb-1 text-[var(--blue)]" />
                {authTypeLabel(agent.authType)}
              </dd>
            </div>
            {skillCount > 0 && (
              <div className="card p-3 flex flex-col items-center text-center">
                <dt className="order-last text-xs text-[var(--text-muted)]">{pluralize(skillCount, 'Skill')}</dt>
                <dd className="flex flex-col items-center mono text-lg font-bold">
                  <Zap aria-hidden="true" className="w-4 h-4 mb-1 text-[var(--accent)]" />
                  {skillCount}
                </dd>
              </div>
            )}
          </dl>

          {/* Skills */}
          {agent.skills.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Skills</h2>
              <div className="space-y-3">
                {agent.skills.map((skill) => (
                  <div key={skill.id} className="card p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
                      <h3 className="mono text-sm font-semibold">{skill.name}</h3>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">{skill.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories & Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {agent.categories.map((cat) => (
              <Link key={cat.id} href={`/categories/${cat.slug}`}>
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Visit Agent <ExternalLink className="w-4 h-4" />
          </a>

          {/* Related Agents */}
          {related.length > 0 && (
            <div className="mt-16 pt-8 border-t border-[var(--border)]">
              <h2 className="text-lg font-semibold mb-4">Related Agents</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
