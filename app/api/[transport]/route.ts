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
          limit: z.number().int().min(1).max(50).default(10).optional(),
        },
      },
      async ({ query, category, access, limit }) => {
        let agents = await getEveryAgent();
        if (category) {
          agents = agents.filter((a) => a.categories.some((c) => c.slug === category));
        }
        const results = searchAgents(agents, query ?? '', access).slice(0, limit ?? 10);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { total: results.length, agents: results.map(agentSummary) },
                null,
                2
              ),
            },
          ],
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...agentSummary(agent),
                  agentUrl: agent.agentUrl,
                  providerUrl: agent.providerUrl,
                  skills: agent.skills,
                  tags: agent.tags,
                  supportsStreaming: agent.supportsStreaming,
                  supportsPushNotifications: agent.supportsPushNotifications,
                  addedAt: agent.createdAt,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );

    server.registerTool(
      'list_categories',
      {
        title: 'List Categories',
        description: 'All directory categories with live agent counts. Slugs are valid inputs for search_agents.',
        inputSchema: {},
      },
      async () => {
        const categories = await getAllCategories();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                categories.map((c) => ({
                  slug: c.slug,
                  name: c.name,
                  description: c.description,
                  agentCount: c.agentCount,
                })),
                null,
                2
              ),
            },
          ],
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

export { handler as GET, handler as POST };
