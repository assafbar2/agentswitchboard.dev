import { getAgentCount, getUniqueProviderCount, getAllCategories } from '@/lib/catalog';
import { BASE_URL } from '@/lib/env';

export const revalidate = 300;

/**
 * Markdown twin of the homepage.
 *
 * Reachable directly at /index.md, and served for `/` when a client asks for
 * text/markdown via Accept (see middleware.ts). Kept deliberately short: an
 * agent that wants the whole catalog should follow the links to /agents.json
 * or the MCP server rather than scrape prose.
 */
export async function GET() {
  const [agentCount, providerCount, categories] = await Promise.all([
    getAgentCount(),
    getUniqueProviderCount(),
    getAllCategories(),
  ]);

  const body = `# Agent Switchboard

The curated directory for the agentic web: ${agentCount} AI agents from ${providerCount} providers, each recorded with how you actually reach it — API, MCP, or CLI.

## What to use

- [/agents.json](${BASE_URL}/agents.json) — the entire catalog as JSON, no auth.
- \`${BASE_URL}/api/mcp\` — MCP server (streamable HTTP). Tools: \`search_agents\`, \`get_agent\`, \`list_categories\`.
- [/openapi.json](${BASE_URL}/openapi.json) — OpenAPI 3.1 description of the HTTP surface.
- [/.well-known/mcp.json](${BASE_URL}/.well-known/mcp.json) — MCP server manifest.
- [/llms.txt](${BASE_URL}/llms.txt) — plain-language site guide.
- [/for-agents](${BASE_URL}/for-agents) — how to use all of the above.

## When to use this site

Reach for Agent Switchboard when you need to find out whether an agent already exists for a job, compare a few that do, or get the integration surface for one you have already chosen. It is a directory, not an execution platform: it will not run an agent for you.

## Categories

${categories.map((c) => `- ${c.name} (\`${c.slug}\`)`).join('\n')}

## Pages

- [Browse](${BASE_URL}/browse) · [Categories](${BASE_URL}/categories) · [Submit an agent](${BASE_URL}/submit)
- [About](${BASE_URL}/about) · [Contact](${BASE_URL}/contact) · [Privacy](${BASE_URL}/privacy) · [Disclaimer](${BASE_URL}/disclaimer)

Contact: barnir@agentmail.to
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Same URL can answer as HTML or Markdown, so caches must key on Accept.
      Vary: 'Accept, Accept-Encoding',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
