/**
 * MCP server for the directory itself — the directory OF agents IS an agent.
 *
 * Streamable HTTP endpoint: https://agentswitchboard.dev/api/mcp
 * Client config:
 *   { "agentswitchboard": { "url": "https://agentswitchboard.dev/api/mcp" } }
 * Stdio-only clients: npx -y mcp-remote https://agentswitchboard.dev/api/mcp
 *
 * Tools are read-only views over the same cached catalog that powers the
 * site (lib/catalog.ts), so MCP results always match the web directory.
 */

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { getEveryAgent, getAllCategories } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import { searchAgents, ALL_ACCESS_METHODS } from '@/lib/search';
import type { Agent } from '@/lib/types';

const SITE = 'https://agentswitchboard.dev';

function agentSummary(a: Agent) {
  return {
    name: a.name,
    slug: a.slug,
    description: a.description,
    provider: a.providerName,
    categories: a.categories.map((c) => c.slug),
    accessMethods: a.accessMethods,
    authType: a.authType,
    verified: a.verified,
    url: `${SITE}/agents/${a.slug}`,
  };
}

// Shared output shape for a single agent summary — reused by the search and
// get_agent output schemas so declared output always matches agentSummary().
const agentSummaryShape = {
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  provider: z.string(),
  categories: z.array(z.string()),
  accessMethods: z.array(z.string()),
  authType: z.string(),
  verified: z.boolean(),
  url: z.string(),
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'search_agents',
      {
        title: 'Search Agents',
        description:
          'Search the Agent Switchboard directory of vetted AI agents, MCP servers, and agentic tools. ' +
          'Returns relevance-ranked matches. Filter by category slug and/or access methods.',
        inputSchema: {
          query: z.string().describe('Free-text search (name, description, skills, tags)').optional(),
          category: z.string().describe('Category slug, e.g. "code-devtools", "voice-messaging"').optional(),
          access: z
            .array(z.enum(ALL_ACCESS_METHODS as [string, ...string[]]))
            .describe('Require ALL of these access methods (api, mcp, cli, browser-extension)')
            .optional(),
          limit: z.number().int().min(1).max(50).default(10).describe('Max results per page (1–50)').optional(),
          offset: z.number().int().min(0).default(0).describe('Number of results to skip, for pagination').optional(),
        },
        outputSchema: {
          total: z.number().int().describe('Total matches before paging'),
          offset: z.number().int(),
          limit: z.number().int(),
          agents: z.array(z.object(agentSummaryShape)),
        },
      },
      async ({ query, category, access, limit, offset }) => {
        let agents = await getEveryAgent();
        if (category) {
          agents = agents.filter((a) => a.categories.some((c) => c.slug === category));
        }
        const matches = searchAgents(agents, query ?? '', access);
        const start = offset ?? 0;
        const size = limit ?? 10;
        const page = matches.slice(start, start + size);
        const structured = {
          total: matches.length,
          offset: start,
          limit: size,
          agents: page.map(agentSummary),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }
    );

    server.registerTool(
      'get_agent',
      {
        title: 'Get Agent Details',
        description:
          'Full detail for one agent by slug: skills, auth, streaming/push support, tags, provider links.',
        inputSchema: {
          slug: z.string().describe('Agent slug, e.g. "playwright-mcp"'),
        },
        outputSchema: {
          ...agentSummaryShape,
          agentUrl: z.string(),
          providerUrl: z.string(),
          skills: z
            .array(z.object({ id: z.string(), name: z.string(), description: z.string() }).passthrough()),
          tags: z.array(z.string()),
          supportsStreaming: z.boolean(),
          supportsPushNotifications: z.boolean(),
          addedAt: z.string().optional(),
        },
      },
      async ({ slug }) => {
        const agents = await getEveryAgent();
        const agent = agents.find((a) => a.slug === slug);
        if (!agent) {
          return {
            content: [{ type: 'text', text: `No agent with slug "${slug}". Try search_agents first.` }],
            isError: true,
          };
        }
        const structured = {
          ...agentSummary(agent),
          agentUrl: agent.agentUrl,
          providerUrl: agent.providerUrl,
          skills: agent.skills,
          tags: agent.tags,
          supportsStreaming: agent.supportsStreaming,
          supportsPushNotifications: agent.supportsPushNotifications,
          addedAt: agent.createdAt,
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }
    );

    server.registerTool(
      'list_categories',
      {
        title: 'List Categories',
        description: 'All directory categories with live agent counts. Slugs are valid inputs for search_agents.',
        inputSchema: {},
        outputSchema: {
          categories: z.array(
            z.object({
              slug: z.string(),
              name: z.string(),
              description: z.string().optional(),
              agentCount: z.number().optional(),
            })
          ),
        },
      },
      async () => {
        const categories = await getAllCategories();
        const structured = {
          categories: categories.map((c) => ({
            slug: c.slug,
            name: c.name,
            description: c.description,
            agentCount: c.agentCount,
          })),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
        };
      }
    );
  },
  {
    serverInfo: { name: 'agentswitchboard', version: '1.0.0' },
  },
  {
    basePath: '/api',
    maxDuration: 60,
  }
);

// Wrap the handler to log consumers: UA + JSON-RPC method + tool called.
// Vercel log explorer: filter `asb_consumer` to see who uses the catalog.
async function loggedHandler(req: Request): Promise<Response> {
  let method: string | undefined;
  let tool: string | undefined;
  if (req.method === 'POST') {
    try {
      const body = await req.clone().json();
      method = body?.method;
      if (method === 'tools/call') tool = body?.params?.name;
    } catch {
      // non-JSON body — log without method detail
    }
  }
  logConsumer('/api/mcp', req, { method, tool });
  return handler(req);
}

export { loggedHandler as GET, loggedHandler as POST };
