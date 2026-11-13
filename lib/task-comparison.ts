/**
 * The comparison table atop each task page: the first COMPARISON_SIZE best
 * fits, in taskMatches order (organic: nothing featured or sponsored moves a
 * row), with a few facts each listing already carries.
 */

import type { Agent } from './types';

export const COMPARISON_SIZE = 6;
export const BUNDLE_SIZE = 3;

const SKILL_MAX = 48;

/** What a row is best for: the skill named in its why-it-fits line, else its first tag or category. */
export function bestFor(why: string | null, agent: Agent): string {
  const skill = why?.split(':')[0]?.trim();
  if (skill && skill.length <= SKILL_MAX) return skill;
  return agent.tags[0] ?? agent.categories[0]?.name ?? '';
}

/** Completes "Pick it if …" from the listing's own access facts. */
export function pickIf(agent: Agent): string {
  if (agent.official && agent.mcpEndpoint) return "you want the vendor's own hosted server";
  if (agent.official) return "you want the vendor's own tool";
  if (agent.authType === 'none') return 'you want to try it with no sign-up';
  if (agent.mcpEndpoint) return 'you want a hosted MCP, nothing to install';
  if (agent.accessMethods.includes('cli')) return 'you work from a terminal';
  return 'you are building on its API';
}

/**
 * The day the table was last true to: the newest change to any listing in it.
 * It moves only when one of them does, not on every deploy.
 */
export function comparedAsOf(agents: Agent[]): string | null {
  const days = agents.map((a) => (a.updatedAt ?? a.createdAt)?.slice(0, 10)).filter((d): d is string => !!d);
  return days.length ? days.reduce((a, b) => (b > a ? b : a)) : null;
}
