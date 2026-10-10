import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';
import type { OfficialGroup } from '@/lib/official';

const VENDORS_SHOWN = 12;
const AGENTS_PER_VENDOR = 5;

/** Homepage section: first-party listings from major vendors, grouped by vendor. */
export function OfficialPlatforms({ groups }: { groups: OfficialGroup[] }) {
  if (groups.length === 0) return null;
  const total = groups.reduce((sum, g) => sum + g.agents.length, 0);
  const shown = groups.slice(0, VENDORS_SHOWN);
  const moreVendors = groups.length - shown.length;

  return (
    <section className="pb-14" aria-labelledby="official-platforms">
      <div className="container-wide">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 id="official-platforms" className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--blue)]" aria-hidden />
              Official platforms
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              First-party agents, MCP servers, and SDKs from {groups.length} major vendors
            </p>
          </div>
          <Link
            href="/browse?official=1"
            className="hidden sm:flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
          >
            All {total} official <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map(({ vendor, agents }) => {
            const extra = agents.length - AGENTS_PER_VENDOR;
            const vendorHref = `/browse?official=1&vendor=${vendor.slug}`;
            return (
              <div key={vendor.slug} className="card p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Link
                    href={vendorHref}
                    className="mono text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors truncate"
                  >
                    {vendor.name}
                  </Link>
                  <span className="mono text-xs text-[var(--text-muted)] flex-shrink-0">
                    {agents.length} listing{agents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agents.slice(0, AGENTS_PER_VENDOR).map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.slug}`}
                      className="px-2 py-0.5 text-xs mono rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--blue)]/40 hover:text-[var(--blue)] transition-colors"
                    >
                      {agent.name}
                    </Link>
                  ))}
                  {extra > 0 && (
                    <Link
                      href={vendorHref}
                      className="px-2 py-0.5 text-xs mono rounded-md text-[var(--blue)] hover:underline"
                    >
                      +{extra} more
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {moreVendors > 0 && (
          <p className="text-sm text-[var(--text-muted)] mt-4">
            Plus {moreVendors} more vendors.{' '}
            <Link href="/browse?official=1" className="text-[var(--accent)] hover:underline">
              Browse all official listings
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
