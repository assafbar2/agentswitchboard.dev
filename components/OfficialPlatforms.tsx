import Link from 'next/link';
import type { OfficialGroup } from '@/lib/official';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import type { Agent } from '@/lib/types';

const VENDORS_SHOWN = 12;
const AGENTS_PER_VENDOR = 5;

/** One entry per slug, so a listing can never render as two chips. */
function uniqueBySlug(agents: Agent[]): Agent[] {
  return [...new Map(agents.map((a) => [a.slug, a])).values()];
}

/**
 * Chip text per slug: the listing's name, or its slug when another listing in
 * the same vendor group has the same name (e.g. two listings both called "fx"),
 * so the chips can be told apart.
 */
function chipLabels(agents: Agent[]): Map<string, string> {
  const nameKey = (a: Agent) => a.name.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const a of agents) counts.set(nameKey(a), (counts.get(nameKey(a)) ?? 0) + 1);
  return new Map(agents.map((a) => [a.slug, (counts.get(nameKey(a)) ?? 0) > 1 ? a.slug : a.name]));
}

/** Homepage section: first-party listings from major vendors, grouped by vendor. */
export function OfficialPlatforms({ groups: rawGroups }: { groups: OfficialGroup[] }) {
  if (rawGroups.length === 0) return null;
  const groups = rawGroups.map((g) => ({ ...g, agents: uniqueBySlug(g.agents) }));
  const total = groups.reduce((sum, g) => sum + g.agents.length, 0);
  const shown = groups.slice(0, VENDORS_SHOWN);
  const moreVendors = groups.length - shown.length;

  return (
    <section
      className="pb-14 text-[var(--dir-ink)] [font-family:var(--font-display)]"
      aria-labelledby="official-platforms"
    >
      <div className="container-wide">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4">
          <div>
            <h2
              id="official-platforms"
              className="text-[32px] font-extrabold leading-none tracking-[-0.015em] sm:text-[40px]"
            >
              Official platforms
            </h2>
            <p className="mt-2 text-[17px] text-[var(--dir-muted)]">
              First-party agents, MCP servers, and SDKs from {groups.length} major vendors
            </p>
          </div>
          <Link
            href="/browse?official=1"
            className="inline-flex min-h-11 items-center text-[17px] font-bold text-[var(--dir-ink)] underline underline-offset-4"
          >
            All {total} official <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </div>

        <div className="gap-x-10 md:columns-2 lg:columns-3">
          {shown.map(({ vendor, agents }) => {
            const extra = agents.length - AGENTS_PER_VENDOR;
            const labels = chipLabels(agents);
            const vendorHref = `/browse?official=1&vendor=${vendor.slug}`;
            return (
              <div key={vendor.slug} className="mb-5 break-inside-avoid">
                <div className="dir-bar flex items-baseline gap-1.5">
                  <h3 className="m-0 min-w-0 text-inherit">
                    <Link href={vendorHref} className="text-[var(--dir-on-yellow)] hover:underline">
                      {vendor.name}
                    </Link>
                  </h3>
                  <span className="font-semibold tracking-normal">
                    · {agents.length}
                    <span className="sr-only"> listing{agents.length !== 1 ? 's' : ''}</span>
                  </span>
                </div>
                {agents.slice(0, AGENTS_PER_VENDOR).map((agent) => (
                  <Link
                    key={agent.slug}
                    href={`/agents/${agent.slug}`}
                    title={`${agent.name} by ${agent.providerName}`}
                    className="dir-row"
                  >
                    <span className="dir-row-name">{labels.get(agent.slug)}</span>
                    <span className="dir-row-leader" aria-hidden="true" />
                    <span className="dir-row-meta">
                      {agent.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m).join(' · ') || '—'}
                    </span>
                  </Link>
                ))}
                {extra > 0 && (
                  <Link href={vendorHref} className="dir-row">
                    <span className="dir-row-name">+{extra} more</span>
                    <span className="dir-row-leader" aria-hidden="true" />
                    <span className="dir-row-meta" aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {moreVendors > 0 && (
          <Link
            href="/browse?official=1"
            className="mt-4 flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-1 border-[3px] border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-4 py-3 text-[var(--dir-on-yellow)] no-underline hover:underline focus-visible:outline-[var(--dir-ink)]"
          >
            <span className="text-[20px] font-extrabold leading-tight">Plus {moreVendors} more vendors.</span>
            <span className="text-[17px] font-bold leading-tight">
              Browse all official listings ({total} from {groups.length} vendors) <span aria-hidden="true">→</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
