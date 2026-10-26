import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { AccessMethodBadges } from '@/components/ui/AccessMethodBadges';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import type { Agent, Category } from '@/lib/types';
import { authTypeLabel, pluralize, truncate } from '@/lib/utils';

/**
 * The fields an AgentCard renders. It is a Server Component, so only its
 * rendered markup reaches the RSC payload, never the agent object. On /browse
 * that markup is repeated for every listing, so keep it lean: no decorative
 * per-card icons (each inline SVG costs about 1 KB across HTML and payload).
 */
export type AgentCardData = Pick<
  Agent,
  | 'slug'
  | 'name'
  | 'providerName'
  | 'description'
  | 'iconUrl'
  | 'verified'
  | 'official'
  | 'officialVendor'
  | 'featured'
  | 'tier'
  | 'accessMethods'
  | 'authType'
> & {
  categories: Pick<Category, 'id' | 'name'>[];
  /** Only the count is shown. */
  skills: readonly unknown[];
};

export function AgentCard({ agent }: { agent: AgentCardData }) {
  const skillCount = agent.skills.length;
  const auth = agent.authType === 'none' ? 'No auth' : authTypeLabel(agent.authType);
  const meta = skillCount > 0 ? `${skillCount} ${pluralize(skillCount, 'skill')} · ${auth}` : auth;

  return (
    <Link href={`/agents/${agent.slug}`} className="card block p-5 group">
      {/* Name and provider get the full width, so names wrap instead of truncating */}
      <div className="flex items-start gap-2.5 mb-3">
        {agent.iconUrl ? (
          <Image
            src={agent.iconUrl}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-md shrink-0 bg-white/5"
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-md shrink-0 bg-[var(--accent-subtle)] flex items-center justify-center mono text-xs text-[var(--accent)] font-bold"
          >
            {agent.name[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="mono text-sm font-semibold leading-snug wrap-break-word text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
            {agent.name}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] wrap-break-word">{`by ${agent.providerName}`}</p>
        </div>
      </div>

      {/* Badges on their own row */}
      {(agent.verified || agent.official || agent.featured) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {agent.verified && <VerifiedBadge />}
          <OfficialBadge agent={agent} />
          {agent.featured && <Badge variant="amber">Featured</Badge>}
        </div>
      )}

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

      {/* Access methods */}
      {agent.accessMethods.length > 0 && (
        <div className="mb-3">
          <AccessMethodBadges methods={agent.accessMethods} />
        </div>
      )}

      {/* Bottom meta: the skill count only when there are skills */}
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
        <span>{meta}</span>
        <span aria-hidden="true" className="opacity-0 group-hover:opacity-60 transition-opacity">
          →
        </span>
      </div>
    </Link>
  );
}
