import { getAgentBySlug, getAllAgents } from '@/lib/contentful';
import { Badge } from '@/components/ui/Badge';
import { notFound } from 'next/navigation';
import { Verified, ExternalLink, Zap, Shield, Radio, Bell } from 'lucide-react';
import { authTypeLabel } from '@/lib/utils';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateStaticParams() {
  const { agents } = await getAllAgents({ limit: 100 });
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
  return {
    title: agent.name,
    description: agent.description,
  };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agent = await getAgentBySlug(slug);
  if (!agent) notFound();

  return (
    <div className="container-wide section">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          {agent.iconUrl ? (
            <img src={agent.iconUrl} alt="" className="w-14 h-14 rounded-xl bg-white/5" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center">
              <span className="mono text-2xl text-[var(--accent)] font-bold">{agent.name[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
              {agent.verified && <Verified className="w-5 h-5 text-[var(--accent)]" />}
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
          </div>
        </div>

        {/* Description */}
        <p className="text-[var(--text-secondary)] leading-relaxed mb-8">{agent.description}</p>

        {/* Meta cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="card p-3 text-center">
            <Zap className="w-4 h-4 mx-auto mb-1 text-[var(--accent)]" />
            <div className="mono text-lg font-bold">{agent.skills.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Skills</div>
          </div>
          <div className="card p-3 text-center">
            <Shield className="w-4 h-4 mx-auto mb-1 text-[var(--blue)]" />
            <div className="mono text-sm font-bold">{authTypeLabel(agent.authType)}</div>
            <div className="text-xs text-[var(--text-muted)]">Auth</div>
          </div>
          <div className="card p-3 text-center">
            <Radio className="w-4 h-4 mx-auto mb-1 text-[var(--amber)]" />
            <div className="mono text-sm font-bold">{agent.supportsStreaming ? 'Yes' : 'No'}</div>
            <div className="text-xs text-[var(--text-muted)]">Streaming</div>
          </div>
          <div className="card p-3 text-center">
            <Bell className="w-4 h-4 mx-auto mb-1 text-[var(--rose)]" />
            <div className="mono text-sm font-bold">{agent.supportsPushNotifications ? 'Yes' : 'No'}</div>
            <div className="text-xs text-[var(--text-muted)]">Push</div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
