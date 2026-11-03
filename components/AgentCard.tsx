import Link from '@/components/Link';
import { AgentIcon } from '@/components/AgentIcon';
import { Badge } from '@/components/ui/Badge';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { SponsoredBadge } from '@/components/SponsoredBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { isNew } from '@/lib/freshness';
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
  | 'sponsored'
  | 'tier'
  | 'accessMethods'
  | 'authType'
  | 'createdAt'
> & {
  categories: Pick<Category, 'id' | 'name'>[];
  /** Only the count is shown. */
  skills: readonly unknown[];
};

/**
 * `why` adds a closing line saying why the listing is shown here. A listing
 * added in the last 30 days (lib/freshness.ts) is tagged New, unless the list
 * already says when it was added (`markNew={false}`). The Compare and My stack
 * toggles sit beside the link, since a button can't go inside one;
 * components/CompareTray.tsx and components/MyStackClient.tsx show them and
 * read the name and icon from the card.
 */
export function AgentCard({ agent, why, markNew = true }: { agent: AgentCardData; why?: string; markNew?: boolean }) {
  const skillCount = agent.skills.length;
  const auth = agent.authType === 'none' ? 'No auth' : authTypeLabel(agent.authType);
  const meta = skillCount > 0 ? `${skillCount} ${pluralize(skillCount, 'skill')} · ${auth}` : auth;
  const access = agent.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m).join(' · ');
  const categories = agent.categories.slice(0, 2).map((c) => c.name).join(', ');
  const fresh = markNew && isNew(agent.createdAt);
  const hasLabels =
    agent.sponsored ||
    agent.verified ||
    agent.official ||
    agent.featured ||
    agent.tier === 'premium' ||
    fresh;

  // A directory entry: icon, bold name, dotted leader, access methods
  // right-aligned, the one-line description beneath, then provider and the
  // small labels. Its classes are in globals.css (.dir-card).
  return (
    <div className="cmp-card relative min-w-0">
      <Link href={`/agents/${agent.slug}`} className="dir-card">
        <div className="dir-card-head">
          <AgentIcon name={agent.name} iconUrl={agent.iconUrl} />
          <h3 className="dir-card-name">{agent.name}</h3>
          <span aria-hidden="true" className="dir-row-leader" />
          <span className="dir-card-access">{access || '—'}</span>
        </div>

        <p className="dir-card-desc">{truncate(agent.description, 120)}</p>

        <div className="dir-card-meta">
          {hasLabels && (
            <span className="dir-card-tags">
              {agent.sponsored && <SponsoredBadge />}
              {agent.verified && <VerifiedBadge />}
              <OfficialBadge agent={agent} />
              {agent.featured && <Badge variant="amber">Featured</Badge>}
              {agent.tier === 'premium' && <Badge variant="amber">Premium</Badge>}
              {fresh && <span className="new-tag">New</span>}
            </span>
          )}
          <span className="dir-card-by">
            {`by ${agent.providerName}`}
            {categories && ` · ${categories}`}
            {` · ${meta}`}
          </span>
        </div>

        {why && (
          <p className="dir-card-why">
            <span className="dir-label text-[13px]">Why</span> {why}
          </p>
        )}
      </Link>
      <button type="button" data-cmp={agent.slug} aria-label={`Compare ${agent.name}`} className="cmp-toggle">
        Compare
      </button>
      <button type="button" data-stk={agent.slug} aria-label={`Add ${agent.name} to My stack`} className="stk-toggle" />
    </div>
  );
}
