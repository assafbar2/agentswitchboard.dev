/**
 * Tombstone helpers for retired (archived or removed) listings.
 *
 * Retired slugs render a static noindex tombstone page at /agents/<slug> with
 * the archive date, removal reason, and 2–3 organic live alternatives from the
 * same category or task — never a bare 404, and never boosted by paid placement.
 */

import { getAlternatives } from './related';
import { searchAgents, taskMatches } from './search';
import type { Task } from './tasks';
import type { Agent, Category } from './types';

export const TOMBSTONE_ALTERNATIVES_MAX = 3;

export interface RetiredListing {
  slug: string;
  name: string;
  description?: string;
  providerName?: string;
  /** YYYY-MM-DD when the listing was archived/removed, when known. */
  archivedAt: string | null;
  /** Why the listing was archived or removed, from content/changelog.json. */
  reason: string | null;
  /** Hydrated categories from the archived file, empty when the file was removed. */
  categories: Category[];
  /** Full archived listing when content/agents/<slug>.json is still kept. */
  archivedAgent?: Agent;
}

export const DEFAULT_ARCHIVE_REASON = 'This listing was archived and removed from the active directory.';

/** Format YYYY-MM-DD in UTC as "Nov 13, 2026". */
export function formatArchiveDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

/**
 * If the removal note names a live replacement/duplicate slug (e.g. "Duplicate of vercel-fx"),
 * surface that published listing first.
 */
function replacementFromReason(reason: string | null, bySlug: Map<string, Agent>, retiredSlug: string): Agent | null {
  if (!reason) return null;
  const tokens = reason.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? [];
  for (const token of tokens) {
    if (token !== retiredSlug && bySlug.has(token)) {
      return bySlug.get(token)!;
    }
  }
  return null;
}

function organicTieBreak(a: Agent, b: Agent): number {
  return (
    Number(b.official) - Number(a.official) ||
    Number(b.verified) - Number(a.verified) ||
    (b.skills?.length ?? 0) - (a.skills?.length ?? 0) ||
    a.name.localeCompare(b.name)
  );
}

/**
 * Pick up to `limit` (default 3) organic live alternatives for a retired listing
 * from the same category or task. Never reads `featured` or `sponsored`.
 */
export function tombstoneAlternatives(
  retired: RetiredListing,
  organicCatalog: Agent[],
  tasks: Task[],
  limit = TOMBSTONE_ALTERNATIVES_MAX
): Agent[] {
  const live = organicCatalog.filter((a) => a.status === 'published' && a.slug !== retired.slug);
  const bySlug = new Map(live.map((a) => [a.slug, a]));
  const picked: Agent[] = [];
  const seen = new Set<string>();

  const add = (agent: Agent | null | undefined) => {
    if (!agent || agent.slug === retired.slug || seen.has(agent.slug) || picked.length >= limit) return;
    if (!bySlug.has(agent.slug)) return;
    seen.add(agent.slug);
    picked.push(bySlug.get(agent.slug)!);
  };

  // 1. Named replacement in the changelog removal note (e.g. duplicate slug).
  add(replacementFromReason(retired.reason, bySlug, retired.slug));

  // 2. Strongest organic keyword + access + category alternatives from archived file.
  if (retired.archivedAgent && picked.length < limit) {
    for (const alt of getAlternatives(retired.archivedAgent, live, limit)) {
      add(alt.agent);
    }
  }

  // 3. Matching curated task fits in the same category.
  const catSlugs = new Set(retired.categories.map((c) => c.slug));
  if (catSlugs.size > 0 && picked.length < limit) {
    const haystack = [
      retired.name,
      retired.description ?? '',
      ...(retired.archivedAgent?.tags ?? []),
      ...(retired.archivedAgent?.skills.map((s) => s.name) ?? []),
    ]
      .join(' ')
      .toLowerCase();

    const scoredTasks = tasks
      .filter((t) => t.categories.some((c) => catSlugs.has(c)))
      .map((t) => ({
        task: t,
        hits: t.keywords.filter((kw) => haystack.includes(kw.toLowerCase())).length,
      }))
      .filter((entry) => entry.hits > 0)
      .sort((a, b) => b.hits - a.hits);

    for (const { task } of scoredTasks) {
      if (picked.length >= limit) break;
      for (const candidate of taskMatches(live, task)) {
        add(candidate);
        if (picked.length >= limit) break;
      }
    }
  }

  // 4. Organic top listings in the retired listing's primary (or secondary) category.
  if (retired.categories.length > 0 && picked.length < limit) {
    for (const category of retired.categories) {
      if (picked.length >= limit) break;
      const inCategory = live
        .filter((a) => a.categories.some((c) => c.slug === category.slug))
        .sort(organicTieBreak);
      for (const candidate of inCategory) {
        add(candidate);
        if (picked.length >= limit) break;
      }
    }
  }

  // 5. Fallback for deleted-file changelog entries with no category: organic search by name/slug.
  if (picked.length < limit && !retired.archivedAgent) {
    const query = retired.name.replace(/[-_]+/g, ' ').trim();
    if (query) {
      for (const candidate of searchAgents(live, query)) {
        add(candidate);
        if (picked.length >= limit) break;
      }
    }
  }

  return picked;
}
