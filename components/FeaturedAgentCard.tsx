import Link from 'next/link';
import { Verified, ArrowRight, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { AccessMethodBadges } from '@/components/ui/AccessMethodBadges';
import type { Agent } from '@/lib/types';
import { truncate } from '@/lib/utils';

export function FeaturedAgentCard({
  agent,
  index = 0,
}: {
  agent: Agent;
  index?: number;
}) {
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="card relative overflow-hidden p-6 group animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Accent glow top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {agent.iconUrl ? (
          <img
            src={agent.iconUrl}
            alt=""
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
        {agent.sponsorLabel && (
          <Badge variant="amber">{agent.sponsorLabel}</Badge>
        )}
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
            <span
              key={cat.id}
              className="text-xs text-[var(--text-muted)]"
            >
              {cat.name}
            </span>
          ))}
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
