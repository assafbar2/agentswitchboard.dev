import type { Agent, HomepageAgent } from './types';

export const HOMEPAGE_SLOTS = 6;

/**
 * Homepage slots. When `placements` (site.json `homepageFeatured`, an ordered
 * slug list) is set, those published agents fill the slots in that order and
 * the first is the Editor's Pick. Otherwise featured agents (unexpired
 * `featuredUntil`) fill them, newest first. Remaining slots go to the newest
 * additions. Sponsored listings never fill these slots: they have their own
 * (sponsoredAgents), so a paid placement is never shown as an editor's pick.
 */
export function pickHomepageAgents(
  catalog: Agent[],
  placements: string[] | undefined,
  now: string,
  slots = HOMEPAGE_SLOTS
): HomepageAgent[] {
  const agents = catalog.filter((a) => !a.sponsored);
  const live = (a: Agent) => !a.featuredUntil || a.featuredUntil >= now;
  const bySlug = new Map(agents.map((a) => [a.slug, a]));

  const chosen: Agent[] = placements?.length
    ? placements.map((s) => bySlug.get(s)).filter((a): a is Agent => !!a)
    : agents
        .filter((a) => a.featured && live(a))
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || a.name.localeCompare(b.name));

  const featured: HomepageAgent[] = chosen.slice(0, slots).map((agent, i) => ({
    agent,
    label: i === 0 ? ('editors-pick' as const) : ('featured' as const),
  }));

  const taken = new Set(featured.map((f) => f.agent.id));
  const newest: HomepageAgent[] = agents
    .filter((a) => !taken.has(a.id) && a.createdAt)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, Math.max(0, slots - featured.length))
    .map((agent) => ({ agent, label: 'new' as const }));

  return [...featured, ...newest];
}

/** The Sponsored slot on the homepage and the latest drop page: every sponsored listing, A→Z. */
export function sponsoredAgents(catalog: readonly Agent[]): Agent[] {
  return catalog.filter((a) => a.sponsored).sort((a, b) => a.name.localeCompare(b.name));
}
