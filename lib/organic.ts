/**
 * Organic results for assistants. The site lists featured listings first, and
 * featured is a commercial placement. Anthropic's Software Directory Policy
 * (4.C) and OpenAI's plugin guidelines (Advertising) reject connectors whose
 * tool results carry sponsored content or paid placements, so the MCP server,
 * WebMCP, and REST calls that ask for `order=organic` rank by the request
 * alone and leave the placement fields out.
 *
 * Imports only types: WebMCP runs this in the browser.
 */

import type { Agent } from './types';

/** Fields that mark a commercial placement. Never in an organic result. */
export const PLACEMENT_FIELDS = ['featured', 'featuredUntil', 'sponsored', 'sponsorLabel', 'tier'] as const;

const organicCache = new WeakMap<readonly Agent[], Agent[]>();

/**
 * The catalog A→Z, ignoring featured. Cached per catalog array, so code that
 * indexes a catalog by identity (lib/related.ts) builds its index once.
 */
export function organicOrder(agents: readonly Agent[]): Agent[] {
  const cached = organicCache.get(agents);
  if (cached) return cached;
  const sorted = [...agents].sort((a, b) => a.name.localeCompare(b.name));
  organicCache.set(agents, sorted);
  return sorted;
}

const PLACEMENT = new Set<string>(PLACEMENT_FIELDS);

/** A copy of a JSON body without any placement field, at any depth. */
export function withoutPlacement<T>(body: T): T {
  return JSON.parse(JSON.stringify(body, (key, value) => (PLACEMENT.has(key) ? undefined : value)));
}

/** `order=organic` on a REST search or alternatives call: rank as organicOrder does. */
export function wantsOrganic(searchParams: URLSearchParams): boolean {
  return (searchParams.get('order') ?? '').trim().toLowerCase() === 'organic';
}
