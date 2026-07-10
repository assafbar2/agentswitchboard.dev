import type { Agent } from './types';

/** Canonical access method labels for display */
export const ACCESS_METHOD_LABELS: Record<string, string> = {
  api: 'API',
  mcp: 'MCP',
  cli: 'CLI',
  'browser-extension': 'Extension',
};

export const ALL_ACCESS_METHODS = Object.keys(ACCESS_METHOD_LABELS);

/**
 * Score an agent against a search query.
 * Higher = more relevant.
 *
 * Priority:
 *  100 — exact name match
 *   80 — name contains query
 *   60 — description contains query
 *   40 — skill name/description contains query
 *   20 — category name contains query
 *   15 — access method match (e.g. "mcp", "cli")
 *   10 — tags contain query
 *    5 — provider name contains query
 */
export function scoreAgent(agent: Agent, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;

  let score = 0;
  const name = agent.name.toLowerCase();
  const description = agent.description.toLowerCase();

  // Name
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 90;
  else if (name.includes(q)) score += 80;

  // Description
  if (description.includes(q)) score += 60;

  // Skills — name and description (guard against string-form skills)
  for (const skill of agent.skills) {
    if (skill?.name?.toLowerCase().includes(q)) score += 40;
    if (skill?.description?.toLowerCase().includes(q)) score += 20;
  }

  // Categories
  for (const cat of agent.categories) {
    if (cat.name.toLowerCase().includes(q)) score += 20;
    if (cat.slug.includes(q)) score += 10;
  }

  // Access methods (search "mcp" finds all MCP agents, etc.)
  for (const method of agent.accessMethods) {
    if (method.toLowerCase().includes(q) || q.includes(method.toLowerCase())) {
      score += 15;
    }
  }

  // Tags
  for (const tag of agent.tags) {
    if (tag.toLowerCase().includes(q)) score += 10;
  }

  // Provider
  if (agent.providerName.toLowerCase().includes(q)) score += 5;

  return score;
}

export function searchAgents(
  agents: Agent[],
  query: string,
  filterAccessMethods?: string[]
): Agent[] {
  let results = agents;

  // Filter by access methods first
  if (filterAccessMethods && filterAccessMethods.length > 0) {
    results = results.filter((agent) =>
      filterAccessMethods.every((method) =>
        (agent.accessMethods as string[]).includes(method)
      )
    );
  }

  // Then apply text search
  const q = query.trim();
  if (!q) return results;

  return results
    .map((agent) => ({ agent, score: scoreAgent(agent, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ agent }) => agent);
}
