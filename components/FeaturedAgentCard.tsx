import Link from 'next/link';
import { OfficialBadge } from '@/components/ui/OfficialBadge';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import type { Agent, AgentLabel } from '@/lib/types';
import { truncate } from '@/lib/utils';

const LABEL_TEXT: Record<AgentLabel, string> = {
  'editors-pick': "Editor's Pick",
  featured: 'Featured',
  new: 'New',
};

/** Letters only, so "⭐ Editor's Pick" and "Editor's Pick" count as the same tag. */
const tagKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

const TAG =
  'inline-flex items-center px-1.5 py-px text-[12px] font-bold uppercase tracking-[0.08em] leading-[1.4]';

/**
 * A homepage "Top Agents" listing in the directory look: name, dotted leader,
 * access methods, then the provider, tags, description and skills underneath.
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
  // The sponsor label always shows (it is the disclosure), unless it just
  // repeats the placement label.
  const sponsorText =
    agent.sponsorLabel && (!labelText || tagKey(agent.sponsorLabel) !== tagKey(labelText))
      ? agent.sponsorLabel
      : undefined;
  const access = agent.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m).join(' · ');

  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group block break-inside-avoid border-b border-[var(--dir-rule)]! py-3 text-[var(--dir-ink)] no-underline [font-family:var(--font-display)]"
    >
      <span className="flex items-baseline gap-1.5">
        <span className="dir-row-name min-w-0 text-[19px] group-hover:underline">{agent.name}</span>
        <span className="dir-row-leader" aria-hidden="true" />
        {access && <span className="dir-row-meta">{access}</span>}
      </span>

      <span className="mt-0.5 block text-[15px] text-[var(--dir-muted)]">
        by {agent.providerName}
        {agent.categories.length > 0 && (
          <> · {agent.categories.slice(0, 2).map((c) => c.name).join(', ')}</>
        )}
      </span>

      {(labelText || sponsorText || agent.verified || agent.official) && (
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
        </span>
      )}

      <span className="mt-1.5 block text-[16px] leading-snug text-[var(--dir-ink)]">
        {truncate(agent.description, 150)}
      </span>

      {agent.skills.length > 0 && (
        <span className="mt-1 block text-[14px] text-[var(--dir-muted)]">
          <span className="font-bold uppercase tracking-[0.08em]">Skills</span>{' '}
          {agent.skills.slice(0, 3).map((s) => s.name).join(' · ')}
          {agent.skills.length > 3 && ` · +${agent.skills.length - 3} more`}
        </span>
      )}
    </Link>
  );
}
