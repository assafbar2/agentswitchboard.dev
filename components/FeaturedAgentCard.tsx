import Link from 'next/link';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import type { Agent, AgentLabel } from '@/lib/types';

const LABEL_TEXT: Record<AgentLabel, string> = {
  'editors-pick': "Editor's Pick",
  featured: 'Featured',
  new: 'New',
};

const TAG =
  'inline-flex items-center px-1.5 py-px text-[12px] font-bold uppercase tracking-[0.08em] leading-[1.4]';

/**
 * A homepage "Top Agents" listing in the directory look: name, dotted leader,
 * access methods, then one muted line with its tags and provider.
 */
export function FeaturedAgentCard({
  agent,
  label,
}: {
  agent: Agent;
  label?: AgentLabel;
  /** Kept for callers that still pass a position; the directory look has no stagger. */
  index?: number;
}) {
  const labelText = label ? LABEL_TEXT[label] : undefined;
  // A paid listing always discloses it, next to whatever placement label it has.
  const sponsorText = agent.sponsorLabel;
  const access = agent.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m).join(' · ');

  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group block break-inside-avoid border-b border-[var(--dir-rule)]! py-2 text-[var(--dir-ink)] no-underline [font-family:var(--font-display)]"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="dir-row-name min-w-0 text-[19px] group-hover:underline">{agent.name}</span>
        <span className="dir-row-leader" aria-hidden="true" />
        {access && <span className="dir-row-meta">{access}</span>}
      </span>

      {/* One muted line under the row: tags, then the provider. */}
      <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] text-[var(--dir-muted)]">
        {labelText && (
          <span className={`${TAG} border border-[var(--dir-ink)]! text-[var(--dir-ink)]`}>
            {labelText}
          </span>
        )}
        {sponsorText && (
          <span className={`${TAG} bg-[var(--dir-ink)] text-[var(--dir-paper)]`}>
            {sponsorText}
          </span>
        )}
        {agent.verified && <VerifiedBadge />}
        <OfficialBadge agent={agent} />
        <span>by {agent.providerName}</span>
      </span>
    </Link>
  );
}
