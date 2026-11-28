/**
 * Promoted order for the website's task answers: the homepage box, task
 * pages and /browse?task=. Among the listings that fit a task, those with a
 * Sponsored slot or an unexpired Featured placement come first, each labeled,
 * then the rest in organic order (lib/organic.ts). Results for AI assistants
 * (the MCP server, WebMCP and the REST API) and the Operator stay organic:
 * this is layered on top of the organic ranking, never inside it.
 *
 * Imports only types: /browse narrows in the browser too.
 */

import type { Agent } from './types';

export type Promotion = 'Sponsored' | 'Featured';

/** Today as YYYY-MM-DD (UTC), the form `featuredUntil` and `sponsoredUntil` take. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True when `agent` has an active Featured placement on `day` (YYYY-MM-DD, inclusive). */
export function isFeaturedLive(
  agent: Pick<Agent, 'featured' | 'featuredUntil'>,
  day: string = today()
): boolean {
  return agent.featured === true && (!agent.featuredUntil || agent.featuredUntil >= day);
}

/** True when `agent` has an active Sponsored placement on `day` (YYYY-MM-DD, inclusive). */
export function isSponsoredLive(
  agent: Pick<Agent, 'sponsored' | 'sponsoredUntil'>,
  day: string = today()
): boolean {
  return agent.sponsored === true && (!agent.sponsoredUntil || agent.sponsoredUntil >= day);
}

/** Why `agent` is placed first, or null: an active Sponsored slot, else an active Featured placement. */
export function promotion(agent: Agent, day: string = today()): Promotion | null {
  if (isSponsoredLive(agent, day)) return 'Sponsored';
  if (isFeaturedLive(agent, day)) return 'Featured';
  return null;
}

/** `ranked` with its promoted listings first; each group keeps its order in `ranked`. */
export function promotedFirst<T extends Agent>(ranked: readonly T[], day: string = today()): T[] {
  const placed = ranked.filter((a) => promotion(a, day));
  return placed.length === 0 ? [...ranked] : [...placed, ...ranked.filter((a) => !promotion(a, day))];
}

/** "AgentMail (Sponsored)", or the name alone. */
export function labeledName(agent: Agent, day: string = today()): string {
  const label = promotion(agent, day);
  return label ? `${agent.name} (${label})` : agent.name;
}

/** How the website's task answers are ordered, said beside them. */
export const PROMOTED_NOTE =
  'Featured and Sponsored listings that do the job come first, labeled; the rest are ranked by how well they fit.';
