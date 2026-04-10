import type { Agent } from './types';

/**
 * Cross-category affinity map.
 * When viewing an agent in category X, agents from these categories
 * are considered contextually related (beyond same-category matches).
 */
const CATEGORY_AFFINITY: Record<string, string[]> = {
  'customer-support':  ['voice-messaging', 'sales-marketing', 'scheduling'],
  'voice-messaging':   ['customer-support', 'content-media', 'language'],
  'content-media':     ['voice-messaging', 'research', 'language'],
  'language':          ['content-media', 'research', 'customer-support'],
  'research':          ['data-analytics', 'vector-databases', 'browser-computer'],
  'data-analytics':    ['research', 'infrastructure', 'vector-databases'],
  'vector-databases':  ['memory-state', 'research', 'data-analytics'],
  'memory-state':      ['vector-databases', 'infrastructure', 'research'],
  'browser-computer':  ['research', 'code-devtools', 'infrastructure'],
  'code-devtools':     ['browser-computer', 'infrastructure', 'security'],
  'infrastructure':    ['code-devtools', 'security', 'data-analytics'],
  'security':          ['infrastructure', 'code-devtools', 'browser-computer'],
  'sales-marketing':   ['customer-support', 'content-media', 'commerce-payments'],
  'legal':             ['research', 'language', 'security'],
  'finance':           ['data-analytics', 'security', 'commerce-payments'],
  'scheduling':        ['customer-support', 'infrastructure', 'sales-marketing'],
  'commerce-payments': ['finance', 'sales-marketing', 'customer-support'],
};

/**
 * Score and return 2–4 related agents for a given agent.
 * Scoring:
 *   +4 per shared category (same-category agents rank first)
 *   +2 per cross-category affinity hit
 *   +1 per shared tag
 */
export function getRelatedAgents(current: Agent, all: Agent[]): Agent[] {
  const currentCatSlugs = current.categories.map((c) => c.slug);
  const currentTags = new Set(current.tags);

  // Collect all affinity categories for this agent
  const affinityCats = new Set<string>();
  for (const slug of currentCatSlugs) {
    for (const af of CATEGORY_AFFINITY[slug] ?? []) {
      affinityCats.add(af);
    }
  }

  const scored = all
    .filter((a) => a.id !== current.id)
    .map((a) => {
      let score = 0;
      const aCatSlugs = a.categories.map((c) => c.slug);

      for (const catSlug of currentCatSlugs) {
        if (aCatSlugs.includes(catSlug)) score += 4;
      }
      for (const af of affinityCats) {
        if (aCatSlugs.includes(af)) score += 2;
      }
      for (const tag of a.tags) {
        if (currentTags.has(tag)) score += 1;
      }

      return { agent: a, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Return top 4, but at least show 2 same-category agents if possible
  return scored.slice(0, 4).map((s) => s.agent);
}
