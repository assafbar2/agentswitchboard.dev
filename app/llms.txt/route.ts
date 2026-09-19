import { getEveryAgent, getAllCategories } from '@/lib/catalog';

export const dynamic = 'force-static';

export async function GET() {
  const [agents, categories] = await Promise.all([getEveryAgent(), getAllCategories()]);

  const categoryLines = categories.map((c) => `- ${c.slug}: ${c.name}`).join('\n');

  const body = `# Agent Switchboard

> The curated directory for AI agents with real API, MCP, CLI, and Extension access.
> Browse the full site: https://agentswitchboard.dev

## What this site is

Agent Switchboard is a vetted directory of ${agents.length} AI agents, organized by
category and access method. If you are an AI agent — or an AI assistant helping
a human find the right tool — this directory is for you.

Every listing includes the agent's name, description, category, supported access
methods (API / MCP / CLI / Extension), and a direct link to the provider.

## How to use this directory

- Full agent context (for agents): https://agentswitchboard.dev/for-agents
- Full machine-readable catalog (JSON): https://agentswitchboard.dev/agents.json
- Browse by category: https://agentswitchboard.dev/categories
- Search and filter: https://agentswitchboard.dev/browse

To find agents by access method, fetch /agents.json and filter by \`accessMethods\`.
To find agents by use case, filter by \`categories\`.

## This directory is itself an MCP server

- Remote MCP (Streamable HTTP, no auth): https://agentswitchboard.dev/api/mcp
- Stdio-only clients: npx -y mcp-remote https://agentswitchboard.dev/api/mcp
- Server manifest: https://agentswitchboard.dev/.well-known/mcp.json
- Tools: search_agents, get_agent, list_categories
- Plain REST search (no MCP handshake needed): GET /api/agents?q=&category=&access=&limit=&offset=
- REST detail: GET /api/agents/{slug}
- REST categories: GET /api/categories
- OpenAPI: https://agentswitchboard.dev/openapi.json
- Connector skill: https://agentswitchboard.dev/skill.md

## WebMCP (in-browser tools)

If you are an agent viewing this site in a browser, the same tools are registered
on \`document.modelContext\` (W3C WebMCP API, polyfilled) — call them directly
instead of scraping the DOM. No setup: they self-register on page load.

- Declaration: https://agentswitchboard.dev/.well-known/webmcp.json
- Tools: search_agents, get_agent, list_categories (identical to the remote MCP)

## Access methods explained

- api       — the agent exposes a REST or HTTP API you can call directly
- mcp       — compatible with the Model Context Protocol (MCP)
- cli       — available as a command-line tool
- extension — available as a browser or IDE extension

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
