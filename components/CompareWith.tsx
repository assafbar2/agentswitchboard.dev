import Link from '@/components/Link';
import { compareTitle, type CuratedComparison } from '@/lib/compare';
import { COMPARE_MAX, compareHref } from '@/lib/compare-link';
import { smallIconPath } from '@/lib/icons';
import type { Agent } from '@/lib/types';
import { joinList } from '@/lib/utils';

/**
 * The listing page's Compare block: the listing beside its top alternatives,
 * the curated comparisons it is in, and the tray toggle. With nothing to link
 * to it holds only the toggle, so it stays hidden until the tray's script runs,
 * as the toggle does.
 */
export function CompareWith({
  agent,
  top,
  comparisons,
}: {
  agent: Agent;
  /** Its strongest alternatives, at most COMPARE_MAX - 1. */
  top: Agent[];
  /** Curated comparisons that include it. */
  comparisons: CuratedComparison[];
}) {
  const links = top.length > 0 || comparisons.length > 0;
  return (
    <section aria-labelledby="compare" className={links ? 'mb-10' : 'cmp-needs-js mb-10'}>
      <h2 id="compare" className="dir-bar">
        Compare
      </h2>
      {links && (
        <ul>
          {top.length > 0 && (
            <li>
              <Link href={compareHref([agent.slug, ...top.map((a) => a.slug)])} className="dir-row">
                <span className="dir-row-name">With {joinList(top.map((a) => a.name))}</span>
                <span className="dir-row-leader" aria-hidden="true" />
                <span className="dir-row-meta" aria-hidden="true">
                  Side by side →
                </span>
              </Link>
            </li>
          )}
          {comparisons.map((c) => (
            <li key={c.slug}>
              <Link href={`/compare/${c.slug}`} className="dir-row">
                <span className="dir-row-name">{compareTitle(c.agents)}</span>
                <span className="dir-row-leader" aria-hidden="true" />
                <span className="dir-row-meta" aria-hidden="true">
                  Comparison →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="cmp-needs-js mt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            data-cmp={agent.slug}
            data-cmp-name={agent.name}
            data-cmp-icon={agent.iconUrl ? smallIconPath(agent.iconUrl) : undefined}
            data-cmp-from="listing"
            aria-label={`Compare ${agent.name}`}
            className="cmp-toggle cmp-toggle-lg"
          >
            Compare
          </button>
          <p className="text-[15px] text-[var(--dir-muted)]">
            Press Compare to add it to the tray at the bottom of the window, then pick up to {COMPARE_MAX - 1} others anywhere on
            the site.
          </p>
        </div>
      </div>
    </section>
  );
}
