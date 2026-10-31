/**
 * MCP server for the directory itself — the directory OF agents IS an agent.
 *
 * Streamable HTTP endpoint: https://agentswitchboard.dev/api/mcp
 * Client config:
 *   { "agentswitchboard": { "url": "https://agentswitchboard.dev/api/mcp" } }
 * Stdio-only clients: npx -y mcp-remote https://agentswitchboard.dev/api/mcp
 *
 * The read tools are views over the same cached catalog that powers the
 * site (lib/catalog.ts), so MCP results always match the web directory.
 * submit_listing is the one write: it files a public GitHub issue through
 * the same path as the /submit form (lib/mcp-submit.ts).
 */

import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { getEveryAgent, getAllCategories } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import {
  SUBMIT_LISTING_DESCRIPTION,
  submitListing,
  submitListingInput,
  submitListingOutput,
} from '@/lib/mcp-submit';
import {
  ACCESS_METHOD_INPUTS,
  FEATURED_DEFINITION,
  OFFICIAL_DEFINITION,
  normalizeAccessMethods,
} from '@/lib/public-api';
import { clientIp, fixedWindowLimiter } from '@/lib/rate-limit';
import { filterAgents, searchAgents } from '@/lib/search';
import type { Agent } from '@/lib/types';

/**
 * Per-IP request budget. Assistant platforms call from shared server IPs, so
 * this is sized for many of their users at once, not for one person.
 */
const REQUESTS_PER_MINUTE = 300;
const MAX_BODY_BYTES = 64 * 1024;
const requestLimiter = fixedWindowLimiter({ limit: REQUESTS_PER_MINUTE, windowMs: 60_000 });

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const INSTRUCTIONS =
  'Agent Switchboard is a curated directory of AI agents, MCP servers, and agentic tools. ' +
  'Use search_agents to find tools for a job (filter by category, access method, or official), ' +
  'get_agent for one listing, and list_categories for valid category slugs. ' +
  'Link users to each result\'s url. submit_listing only files a public suggestion for human review; ' +
  'call it only when the user asks to list a product and has confirmed the details.';

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
    official: a.official,
    officialVendor: a.officialVendor?.name ?? null,
    featured: a.featured === true,
    url: `${SITE}/agents/${a.slug}`,
  };
}

// The three flags, defined once (lib/public-api.ts, components/VerifiedBadge.tsx)
// and repeated in the tool descriptions so a model reads them before it calls.
const LABELS = `${VERIFIED_DEFINITION} ${OFFICIAL_DEFINITION} ${FEATURED_DEFINITION}`;

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
  verified: z.boolean().describe(VERIFIED_DEFINITION),
  official: z.boolean().describe(OFFICIAL_DEFINITION),
  officialVendor: z.string().nullable(),
  featured: z.boolean().describe(FEATURED_DEFINITION),
  url: z.string(),
};

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'search_agents',
      {
        title: 'Search Agents',
        description:
          'Search the curated Agent Switchboard directory of AI agents, MCP servers, and agentic tools. ' +
          'Filter by category slug, access methods, and/or official (first-party listings from major vendors). ' +
          LABELS,
        annotations: READ_ONLY,
        inputSchema: {
          query: z
            .string()
            .describe('Free-text search over name, description, skills, categories, tags, and provider')
            .optional(),
          category: z.string().describe('Category slug, e.g. "code-devtools", "voice-messaging"').optional(),
          access: z
            .array(z.enum(ACCESS_METHOD_INPUTS as [string, ...string[]]))
            .describe(
              'Require ALL of these access methods: api, mcp, cli, browser-extension ("extension" is accepted as an alias of browser-extension)'
            )
            .optional(),
          official: z
            .boolean()
            .describe('Only first-party listings from major vendors (e.g. Notion\'s own Notion MCP)')
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
      async ({ query, category, access, official, limit, offset }) => {
        const agents = filterAgents(await getEveryAgent(), { category, official });
        const matches = searchAgents(
          agents,
          query ?? '',
          access ? normalizeAccessMethods(access) : undefined
        );
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
          'Full detail for one agent by slug: skills, auth, streaming/push support, tags, provider links. ' +
          LABELS,
        annotations: READ_ONLY,
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
        annotations: READ_ONLY,
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

    server.registerTool(
      'submit_listing',
      {
        title: 'Submit a Listing',
        description: SUBMIT_LISTING_DESCRIPTION,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
        inputSchema: submitListingInput,
        outputSchema: submitListingOutput,
      },
      async (input, extra) => submitListing(input, extra.requestInfo?.headers ?? {})
    );
  },
  {
    serverInfo: { name: 'agentswitchboard', version: '1.2.0' },
    instructions: INSTRUCTIONS,
  },
  {
    basePath: '/api',
    maxDuration: 60,
  }
);

// Wrap the handler to log consumers: UA + JSON-RPC method + tool called.
// Vercel log explorer: filter `asb_consumer` to see who uses the catalog.
async function loggedHandler(req: Request): Promise<Response> {
  const limited = requestLimiter.take(clientIp(req.headers));
  if (!limited.ok) {
    logConsumer('/api/mcp', req, { method: 'rate_limited' });
    return jsonRpcError(429, -32000, 'Rate limit exceeded. Slow down and retry.', {
      'Retry-After': String(limited.retryAfterSeconds),
    });
  }

  let method: string | undefined;
  let tool: string | undefined;
  if (req.method === 'POST') {
    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return jsonRpcError(413, -32600, `Request body over ${MAX_BODY_BYTES} bytes.`);
    }
    const text = await req.clone().text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return jsonRpcError(413, -32600, `Request body over ${MAX_BODY_BYTES} bytes.`);
    }
    try {
      const body = JSON.parse(text);
      method = body?.method;
      if (method === 'tools/call') tool = body?.params?.name;
    } catch {
      // non-JSON body — log without method detail
    }
  }
  logConsumer('/api/mcp', req, { method, tool });
  return handler(req);
}

function jsonRpcError(
  status: number,
  code: number,
  message: string,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export { loggedHandler as GET, loggedHandler as POST };
