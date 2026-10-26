import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { getEveryAgent, getAllCategories } from '@/lib/catalog';
import { FEATURED_DEFINITION, OFFICIAL_DEFINITION } from '@/lib/public-api';

export const dynamic = 'force-static';

export async function GET() {
  // Sequential on purpose: each call reads the whole catalog from disk.
  const agents = await getEveryAgent();
  const categories = await getAllCategories();
  const verifiedCount = agents.filter((a) => a.verified).length;

  const categoryLines = categories.map((c) => `- ${c.slug}: ${c.name}`).join('\n');

  const body = `# Agent Switchboard

> The curated directory for AI agents with real API, MCP, CLI, and browser-extension access.
> Browse the full site: https://agentswitchboard.dev

## What this site is

Agent Switchboard is a curated directory of ${agents.length} AI agents (${verifiedCount} of
them verified), organized by category and access method. If you are an AI agent — or
an AI assistant helping a human find the right tool — this directory is for you.

Every listing includes the agent's name, description, category, supported access
methods (api / mcp / cli / browser-extension), and a direct link to the provider.

The \`verified\`, \`official\` and \`featured\` flags in search and detail results mean:

- ${VERIFIED_DEFINITION}
- ${OFFICIAL_DEFINITION}
- ${FEATURED_DEFINITION}

## How to use this directory

- Full agent context (for agents): https://agentswitchboard.dev/for-agents
- Full machine-readable catalog (JSON): https://agentswitchboard.dev/agents.json
- Browse by category: https://agentswitchboard.dev/categories
- Search and filter: https://agentswitchboard.dev/browse

To find agents by access method or use case, search: the \`search_agents\` MCP tool, or
GET /api/agents?access=mcp&category=<slug> (add \`official=true\` for first-party listings
from major vendors, e.g. Notion's own Notion MCP). /agents.json is the whole catalog in
one large file; use it for bulk or offline work, filtering on \`accessMethods\`,
\`categories\` and \`official\`.

## This directory is itself an MCP server

- Remote MCP (Streamable HTTP, no auth): https://agentswitchboard.dev/api/mcp
- Stdio-only clients: npx -y mcp-remote https://agentswitchboard.dev/api/mcp
- Server manifest: https://agentswitchboard.dev/.well-known/mcp.json
- Tools: search_agents, get_agent, list_categories
- Plain REST search (no MCP handshake needed): GET /api/agents?q=&category=&access=&official=&limit=&offset=
- REST detail: GET /api/agents/{slug}
- REST categories: GET /api/categories
- OpenAPI: https://agentswitchboard.dev/openapi.json
- Connector skill: https://agentswitchboard.dev/skill.md

## WebMCP (in-browser tools)

If you are an agent viewing this site in a browser, the same tools are registered
on \`document.modelContext\` (W3C WebMCP API, polyfilled) — call them directly
instead of scraping the DOM. No setup: they self-register on page load.

- Declaration: https://agentswitchboard.dev/.well-known/webmcp.json
- Tools: search_agents, get_agent, list_categories. They call the REST API above, so
  matches and their order are the same as the remote MCP's; result objects use the
  REST field names (see the OpenAPI document).

## Access methods explained

- api               — the agent exposes a REST or HTTP API you can call directly
- mcp               — compatible with the Model Context Protocol (MCP)
- cli               — available as a command-line tool
- browser-extension — available as a browser or IDE extension
                      (search filters also accept \`extension\` as an alias)

## Categories (${categories.length} total)

${categoryLines}

## Legal

- Privacy: https://agentswitchboard.dev/privacy
- Terms of Use: https://agentswitchboard.dev/terms

## Maintained by

Barnir — barnir@agentmail.to
Generated: ${new Date().toISOString().slice(0, 10)}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
