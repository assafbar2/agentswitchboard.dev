import Link from 'next/link';
import { ExternalLink, Shield, Zap, Verified } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Agent } from '@/lib/types';
import { authTypeLabel, truncate } from '@/lib/utils';

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agents/${agent.slug}`} className="card block p-5 group">
      {/* Top row: name + badges */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {agent.iconUrl ? (
            <img
              src={agent.iconUrl}
              alt=""
              className="w-8 h-8 rounded-md flex-shrink-0 bg-white/5"
            />
          ) : (
            <div className="w-8 h-8 rounded-md flex-shrink-0 bg-[var(--accent-subtle)] flex items-center justify-center">
              <span className="mono text-xs text-[var(--accent)] font-bold">
                {agent.name[0]}
              </span>
            </div>
          )}
          <h3 className="mono text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
            {agent.name}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {agent.verified && (
            <Verified className="w-4 h-4 text-[var(--accent)]" />
          )}
          {agent.featured && (
            <Badge variant="amber">Featured</Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
        {truncate(agent.description, 120)}
      </p>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.categories.slice(0, 2).map((cat) => (
          <Badge key={cat.id} variant="default">
            {cat.name}
          </Badge>
        ))}
        {agent.tier === 'premium' && (
          <Badge variant="amber">Premium</Badge>
        )}
      </div>

      {/* Bottom meta */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {agent.skills.length} skill{agent.skills.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {authTypeLabel(agent.authType)}
          </span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
      </div>
    </Link>
  );
}
