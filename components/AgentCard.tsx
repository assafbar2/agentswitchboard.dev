import Link from 'next/link';
import { AgentIcon } from '@/components/AgentIcon';
import { Badge } from '@/components/ui/Badge';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import type { Agent, Category } from '@/lib/types';
import { authTypeLabel, pluralize, truncate } from '@/lib/utils';

/**
 * The fields an AgentCard renders. It is a Server Component, so only its
 * rendered markup reaches the RSC payload, never the agent object. On /browse
 * that markup is repeated for every listing, so keep it lean: the listing's
 * own icon is a single <img>, and there are no decorative inline SVGs (each
 * costs about 1 KB across HTML and payload).
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
  | 'sponsorLabel'
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
  const access = agent.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m).join(' · ');
  const categories = agent.categories.slice(0, 2).map((c) => c.name).join(', ');
  const hasLabels = agent.verified || agent.official || agent.featured || agent.sponsorLabel || agent.tier === 'premium';

  // A directory entry: icon, bold name, dotted leader, access methods
  // right-aligned, the one-line description beneath, then provider and the
  // small labels.
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group block min-w-0 border-b border-[var(--dir-rule)]! px-0.5 py-3 font-[family-name:var(--font-display)] text-[var(--dir-ink)] no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
    >
      <div className="flex min-w-0 items-baseline gap-1.5">
        <AgentIcon name={agent.name} iconUrl={agent.iconUrl} className="mr-0.5 self-start" />
        <h3 className="min-w-0 wrap-break-word text-[17px] font-bold leading-snug group-hover:underline">
          {agent.name}
        </h3>
        <span
          aria-hidden="true"
          className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
        />
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tracking-[0.06em]">
          {access || '—'}
        </span>
      </div>

      <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug text-[var(--dir-muted)] sm:line-clamp-1">
        {truncate(agent.description, 120)}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-[var(--dir-muted)]">
        {hasLabels && (
          <span className="flex flex-wrap items-center gap-1">
            {agent.verified && <VerifiedBadge />}
            <OfficialBadge agent={agent} />
            {agent.sponsorLabel && <Badge variant="sponsor">{agent.sponsorLabel}</Badge>}
            {agent.featured && <Badge variant="amber">Featured</Badge>}
            {agent.tier === 'premium' && <Badge variant="amber">Premium</Badge>}
          </span>
        )}
        <span className="min-w-0 wrap-break-word">
          {`by ${agent.providerName}`}
          {categories && ` · ${categories}`}
          {` · ${meta}`}
        </span>
      </div>
    </Link>
  );
}
