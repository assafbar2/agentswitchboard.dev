import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { getEveryAgent, getAllCategories } from '@/lib/catalog';
import { BASE_URL } from '@/lib/env';
import { FEATURED_DEFINITION, OFFICIAL_DEFINITION } from '@/lib/public-api';

/**
 * Markdown twin of the homepage.
 *
 * Reachable directly at /index.md, and served for `/` when a client asks for
 * text/markdown via Accept (see proxy.ts). Kept deliberately short: an
 * agent that wants the whole catalog should follow the links to /agents.json
 * or the MCP server rather than scrape prose.
 *
 * Prerendered at build time, like /llms.txt. Rendered per request it returned
 * HTTP 500 in production: it read the catalog three times at once (React
 * cache() does not dedupe inside a route handler), opening ~2,500 content files
 * concurrently, past the 1,024 file descriptors a serverless function gets
 * (EMFILE). The catalog only changes with a deploy, so a static body is exact.
 */
export const dynamic = 'force-static';

export async function GET() {
  // One catalog read, then categories — sequential, never several at once.
  const agents = await getEveryAgent();
  const categories = await getAllCategories();
  const agentCount = agents.length;
  const verifiedCount = agents.filter((a) => a.verified).length;
  const providerCount = new Set(agents.map((a) => a.providerName)).size;

  const body = `# Agent Switchboard

The curated directory for the agentic web: ${agentCount} AI agents (${verifiedCount} verified) from ${providerCount} providers, each tagged with how it is reached: \`api\`, \`mcp\`, \`cli\`, or \`browser-extension\`.

The \`verified\`, \`official\` and \`featured\` flags in search and detail results mean:

- ${VERIFIED_DEFINITION}
- ${OFFICIAL_DEFINITION}
- ${FEATURED_DEFINITION}

## What to use

- \`${BASE_URL}/api/mcp\` — MCP server (streamable HTTP). Tools: \`search_agents\`, \`get_agent\`, \`list_categories\`.
- \`GET ${BASE_URL}/api/agents?q=&category=&access=&official=&limit=&offset=\` — plain REST search, no auth. Detail: \`/api/agents/{slug}\`.
- [/openapi.json](${BASE_URL}/openapi.json) — OpenAPI 3.1 description of the HTTP surface.
- [/.well-known/mcp.json](${BASE_URL}/.well-known/mcp.json) — MCP server manifest.
- [/agents.json](${BASE_URL}/agents.json) — the entire catalog as one large JSON file, no auth. Use it for bulk or offline work; search for everything else.
- [/llms.txt](${BASE_URL}/llms.txt) — plain-language site guide.
- [/for-agents](${BASE_URL}/for-agents) — how to use all of the above.

## When to use this site

Reach for Agent Switchboard when you need to find out whether an agent already exists for a job, compare a few that do, or look up the access methods and homepage of one you have already chosen. It is a directory, not an execution platform: it will not run an agent for you.

## Categories

${categories.map((c) => `- ${c.name} (\`${c.slug}\`)`).join('\n')}

## Pages

- [Browse](${BASE_URL}/browse) · [Categories](${BASE_URL}/categories) · [Submit an agent](${BASE_URL}/submit)
- [About](${BASE_URL}/about) · [Contact](${BASE_URL}/contact) · [Privacy](${BASE_URL}/privacy) · [Terms of Use](${BASE_URL}/terms) · [Disclaimer](${BASE_URL}/disclaimer)

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
