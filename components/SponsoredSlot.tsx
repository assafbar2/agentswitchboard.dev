import Link from 'next/link';
import { FeaturedAgentCard } from '@/components/FeaturedAgentCard';
import type { Agent } from '@/lib/types';

/**
 * The paid slot, on the homepage and the latest drop page. Boxed in ink with
 * an ink header, never the yellow bar of the editorial sections, so it can't
 * be mistaken for an organic pick.
 */
export function SponsoredSlot({ agents, className = '' }: { agents: Agent[]; className?: string }) {
  if (agents.length === 0) return null;
  return (
    <section
      aria-labelledby="sponsored-slot"
      data-sponsored-slot=""
      className={`break-inside-avoid border-2 border-[var(--dir-ink)]! ${className}`}
    >
      <h2
        id="sponsored-slot"
        className="m-0 bg-[var(--dir-ink)] px-2 py-1 text-[16px] font-extrabold uppercase tracking-[0.08em] text-[var(--dir-paper)] [font-family:var(--font-display)]"
      >
        Sponsored <span className="font-semibold tracking-normal">· {agents.length}</span>
      </h2>
      <div className="px-2.5 pb-2">
        <p className="mt-1.5 text-[15px] leading-snug text-[var(--dir-muted)]">
          Paid placements, each reviewed first. They never change search results.{' '}
          <Link
            href="/about#sponsored"
            className="font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
          >
            What Sponsored means
          </Link>
        </p>
        {agents.map((agent) => (
          <FeaturedAgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
