import Link from 'next/link';
import Image from 'next/image';
import { Verified, ArrowRight, Zap, Star, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { AccessMethodBadges } from '@/components/ui/AccessMethodBadges';
import type { Agent, AgentLabel } from '@/lib/types';
import { truncate } from '@/lib/utils';

const LABEL_CONFIG = {
  'editors-pick': {
    badge: (
      <Badge variant="amber">
        <Star className="w-3 h-3" />
        Editor&apos;s Pick
      </Badge>
    ),
    topLine: 'bg-gradient-to-r from-transparent via-amber-400/50 to-transparent',
  },
  featured: {
    badge: (
      <Badge variant="blue">
        <Zap className="w-3 h-3" />
        Featured
      </Badge>
    ),
    topLine: 'bg-gradient-to-r from-transparent via-blue-400/50 to-transparent',
  },
  new: {
    badge: (
      <Badge variant="accent">
        <Sparkles className="w-3 h-3" />
        New
      </Badge>
    ),
    topLine: 'bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent',
  },
};

export function FeaturedAgentCard({
  agent,
  label,
  index = 0,
}: {
  agent: Agent;
  label?: AgentLabel;
  index?: number;
}) {
  const labelCfg = label ? LABEL_CONFIG[label] : null;

  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="card relative overflow-hidden p-6 group animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top accent line — amber for Editor's Pick, green for New */}
      <div
        className={`absolute top-0 inset-x-0 h-px ${
          labelCfg?.topLine ??
          'bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent'
        }`}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {agent.iconUrl ? (
          <Image
            src={agent.iconUrl}
            alt=""
            width={40}
            height={40}
            className="w-10 h-10 rounded-lg flex-shrink-0 bg-white/5"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-[var(--accent-subtle)] flex items-center justify-center">
            <span className="mono text-base text-[var(--accent)] font-bold">
              {agent.name[0]}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="mono text-base font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
              {agent.name}
            </h3>
            {agent.verified && (
              <Verified className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            by {agent.providerName}
          </p>
        </div>

        {/* Label or sponsor badge */}
        {labelCfg ? (
          labelCfg.badge
        ) : agent.sponsorLabel ? (
          <Badge variant="amber">{agent.sponsorLabel}</Badge>
        ) : null}
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
        {truncate(agent.description, 150)}
      </p>

      {/* Skills preview */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.skills.slice(0, 3).map((skill) => (
          <Badge key={skill.id} variant="accent">
            <Zap className="w-3 h-3" />
            {skill.name}
          </Badge>
        ))}
        {agent.skills.length > 3 && (
          <Badge variant="outline">+{agent.skills.length - 3} more</Badge>
        )}
      </div>

      {/* Access methods */}
      {agent.accessMethods.length > 0 && (
        <div className="mb-4">
          <AccessMethodBadges methods={agent.accessMethods} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {agent.categories.slice(0, 2).map((cat) => (
            <span key={cat.id} className="text-xs text-[var(--text-muted)]">
              {cat.name}
            </span>
          ))}
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
