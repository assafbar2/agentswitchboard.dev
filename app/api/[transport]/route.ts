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
import { getEveryAgent, getAllCategories, getRetiredListings } from '@/lib/catalog';
import { COMPARE_QUERY_KEYS } from '@/lib/compare-link';
import { alternativesDecision, bundleDecision, compareDecision, type Decision } from '@/lib/decide';
import { absoluteIconUrl } from '@/lib/icons';
import { logConsumer } from '@/lib/log';
import {
  SUBMIT_LISTING_DESCRIPTION,
  submitListing,
  submitListingInput,
  submitListingOutput,
} from '@/lib/mcp-submit';
import {
  ACCESS_METHOD_INPUTS,
  ALTERNATIVES_TO_DESCRIPTION,
  AUTH_INPUT,
  BUNDLE_SLUGS_INPUT,
  COMPARE_AGENTS_DESCRIPTION,
  COMPARE_SLUGS_INPUT,
  CONNECT_BUNDLE_DESCRIPTION,
  FEATURED_DEFINITION,
  OFFICIAL_DEFINITION,
  SINCE_INPUT,
  SORT_INPUT,
  TASK_INPUT,
  VERIFIED_INPUT,
  normalizeAccessMethods,
  unknownTaskMessage,
  howToUseFields,
} from '@/lib/public-api';
import { clientIp, fixedWindowLimiter, isAssistantPlatformIp } from '@/lib/rate-limit';
import { MAX_ALTERNATIVES } from '@/lib/related';
import {
  AUTH_TYPES,
  SORT_ORDERS,
  filterAgents,
  invalidSinceMessage,
  parseSince,
  searchAgents,
  sortAgents,
  taskMatches,
} from '@/lib/search';
import { REQUESTED_MAX, requestedStackSlugs } from '@/lib/shared-stack';
import { getTask, getTasks } from '@/lib/tasks';
import type { Agent } from '@/lib/types';
import { howToUseJson } from '@/lib/use-it-now';

/**
 * Per-IP request budget. Assistant platforms call from shared server IPs, so
 * this is sized for many of their users at once, not for one person.
 */
const REQUESTS_PER_MINUTE = 300;
/** Per IP in a platform's published egress range (lib/rate-limit.ts), shared by all of its users. */
const PLATFORM_REQUESTS_PER_MINUTE = 3000;
const MAX_BODY_BYTES = 64 * 1024;
const requestLimiter = fixedWindowLimiter({ limit: REQUESTS_PER_MINUTE, windowMs: 60_000 });
const platformLimiter = fixedWindowLimiter({ limit: PLATFORM_REQUESTS_PER_MINUTE, windowMs: 60_000 });

// Directory reviewers (Claude, ChatGPT) read the hints and the title from annotations, so every tool sets all of them.
function readOnly(title: string) {
  return { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
}

// Browser-based MCP clients call cross-origin. No cookies or credentials are involved, so any origin may.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};

const INSTRUCTIONS =
  'Agent Switchboard is a curated directory of AI agents, MCP servers, and agentic tools. ' +
  'Use search_agents to find tools for a job (pick a task such as "query-a-database", or filter by category, access method, official, verified, or auth type; ' +
  'since keeps what was added lately; sort by newest or most skills), get_agent for one listing, and list_categories for valid category slugs. ' +
  'To help a user choose: compare_agents puts 2 or 3 listings side by side, alternatives_to finds listings that could stand in for one, ' +
  'and connect_bundle turns up to 10 listings into one MCP client config to paste, with how to connect the rest. ' +
  'Each result\'s url is its listing page on the site. submit_listing only files a public suggestion for human review; ' +
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
    iconUrl: absoluteIconUrl(a.iconUrl, SITE),
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
  iconUrl: z
    .string()
    .nullable()
    .describe("Absolute URL of the listing's 128px PNG icon, served by Agent Switchboard; null when it has none"),
};

// A listing in compare_agents, alternatives_to and connect_bundle (lib/public-api.ts
// decisionAgent): the REST search-result fields and its auth type, the same as
// GET /api/compare, /api/agents/{slug}/alternatives and /api/bundle return.
const decisionAgentShape = {
  name: z.string(),
  slug: z.string(),
  url: z.string(),
  iconUrl: agentSummaryShape.iconUrl,
  description: z.string(),
  provider: z.string(),
  categories: z.array(z.string()),
  accessMethods: z.array(z.string()),
  verified: agentSummaryShape.verified,
  official: agentSummaryShape.official,
  featured: agentSummaryShape.featured,
  authType: z.string(),
};

const compareValueShape = z.union([
  z.string(),
  z.array(z.string()),
  z.object({ code: z.string(), note: z.string().optional() }).describe('A command or address from the listing\'s docs, with what it is'),
]);

const mcpServerShape = z.union([z.object({ url: z.string() }), z.object({ command: z.string(), args: z.array(z.string()) })]);

/** A decision tool's answer as a tool result; a refusal is a tool error with its message. */
function decisionResult<T extends Record<string, unknown>>(decision: Decision<T>) {
  if (!decision.ok) return { content: [{ type: 'text' as const, text: decision.message }], isError: true };
  return { content: [{ type: 'text' as const, text: JSON.stringify(decision.body) }], structuredContent: decision.body };
}

// lib/use-it-now.ts howToUseJson(): the listing page's Use it now panel as data.
const useItNowShape = z
  .object({
    tryThisFirst: z
      .object({ lead: z.string(), prompts: z.array(z.object({ skill: z.string(), text: z.string() })) })
      .nullable(),
    mcp: z
      .object({
        endpoint: z.string().nullable(),
        command: z.string().nullable(),
        clientConfig: z.object({ mcpServers: z.record(z.string(), z.unknown()) }).nullable(),
        cursorInstallUrl: z.string().nullable(),
        claudeConnectorUrl: z.string().nullable(),
        claudeCodeCommand: z.string().nullable(),
        setupPrompt: z.string(),
        docsUrl: z.string(),
      })
      .nullable(),
    cli: z
      .object({ install: z.object({ type: z.string(), command: z.string() }).nullable(), docsUrl: z.string() })
      .nullable(),
    api: z.object({ baseUrl: z.string().nullable(), auth: z.string(), docsUrl: z.string() }).nullable(),
    extension: z.object({ url: z.string() }).nullable(),
  })
  .describe(
    'How to start using it, per access method: client config and install links for MCP, the install command for a CLI, base URL and auth for an API. ' +
      'Commands and addresses come from the vendor\'s own docs; when there are none, docsUrl is where its instructions are.'
  );

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'search_agents',
      {
        title: 'Search Agents',
        description:
          'Search the curated Agent Switchboard directory of AI agents, MCP servers, and agentic tools. ' +
          'Filter by task, category slug, access methods, official (first-party listings from major vendors), verified, and/or auth type; ' +
          'sort by relevance, newest, most skills, or name. ' +
          LABELS,
        annotations: readOnly('Search Agents'),
        inputSchema: {
          query: z
            .string()
            .describe('Free-text search over name, description, skills, categories, tags, and provider')
            .optional(),
          task: z.string().describe(TASK_INPUT).optional(),
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
          verified: z.boolean().describe(VERIFIED_INPUT).optional(),
          auth: z.array(z.enum(AUTH_TYPES)).describe(AUTH_INPUT).optional(),
          // A number of days is accepted as a number too: the schema says string, models don't always listen.
          since: z
            .preprocess((value) => (typeof value === 'number' ? String(value) : value), z.string())
            .describe(SINCE_INPUT)
            .optional(),
          sort: z.enum(SORT_ORDERS).describe(SORT_INPUT).optional(),
          limit: z.number().int().min(1).max(50).default(10).describe('Max results per page (1–50)').optional(),
          offset: z.number().int().min(0).default(0).describe('Number of results to skip, for pagination').optional(),
        },
        outputSchema: {
          total: z.number().int().describe('Total matches before paging'),
          offset: z.number().int(),
          limit: z.number().int(),
          since: z.string().optional().describe('With since: the first day kept (YYYY-MM-DD, UTC)'),
          agents: z.array(z.object(agentSummaryShape)),
        },
      },
      async ({ query, task, category, access, official, verified, auth, since, sort, limit, offset }) => {
        const slug = task?.trim().toLowerCase();
        const picked = slug ? getTask(slug) : null;
        if (slug && !picked) {
          const slugs = getTasks().map((t) => t.slug).join(', ');
          return {
            content: [{ type: 'text', text: `${unknownTaskMessage(slug)} The task slugs: ${slugs}.` }],
            isError: true,
          };
        }
        const sinceText = since?.trim() ?? '';
        const firstDay = sinceText ? parseSince(sinceText) : null;
        if (sinceText && !firstDay) {
          return { content: [{ type: 'text', text: invalidSinceMessage(sinceText) }], isError: true };
        }
        const catalog = await getEveryAgent();
        const agents = filterAgents(picked ? taskMatches(catalog, picked) : catalog, {
          category,
          official,
          verified,
          auth,
          since: firstDay ?? undefined,
        });
        const matches = sortAgents(
          searchAgents(agents, query ?? '', access ? normalizeAccessMethods(access) : undefined),
          sort ?? 'relevance'
        );
        const start = offset ?? 0;
        const size = limit ?? 10;
        const page = matches.slice(start, start + size);
        const structured = {
          total: matches.length,
          offset: start,
          limit: size,
          ...(firstDay && { since: firstDay }),
          agents: page.map(agentSummary),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(structured) }],
          structuredContent: structured,
        };
      }
    );

    server.registerTool(
      'get_agent',
      {
        title: 'Get Agent Details',
        description:
          'Full detail for one agent by slug: skills, auth, streaming/push support, tags, provider links, ' +
          'and useItNow: how to start using it (MCP client config, install command, API base URL, setup links). ' +
          LABELS,
        annotations: readOnly('Get Agent Details'),
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
          mcpEndpoint: z.string().nullable().describe("The vendor's hosted MCP server address"),
          mcpCommand: z.string().nullable().describe('The command that runs its MCP server locally'),
          install: z.object({ type: z.string(), command: z.string() }).nullable().describe('The command that installs its CLI'),
          quickstartUrl: z.string().nullable().describe("The vendor's setup or getting-started page"),
          apiBaseUrl: z.string().nullable().describe("Base URL of the vendor's public API"),
          useItNow: useItNowShape,
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
          ...howToUseFields(agent),
          useItNow: howToUseJson(agent),
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(structured) }],
          structuredContent: structured,
        };
      }
    );

    server.registerTool(
      'list_categories',
      {
        title: 'List Categories',
        description: 'All directory categories with live agent counts. Slugs are valid inputs for search_agents.',
        annotations: readOnly('List Categories'),
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
          content: [{ type: 'text', text: JSON.stringify(structured) }],
          structuredContent: structured,
        };
      }
    );

    server.registerTool(
      'compare_agents',
      {
        title: 'Compare Agents',
        description: COMPARE_AGENTS_DESCRIPTION,
        annotations: readOnly('Compare Agents'),
        inputSchema: {
          slugs: z.array(z.string()).min(1).max(COMPARE_QUERY_KEYS.length).describe(COMPARE_SLUGS_INPUT),
        },
        outputSchema: {
          title: z.string(),
          url: z.string().describe('The comparison on the site'),
          intro: z.string().nullable().describe("A curated comparison's editorial line; null for any other mix"),
          agents: z.array(z.object({ ...decisionAgentShape, setsApart: z.array(z.string()) })),
          rows: z.array(
            z.object({
              key: z.string(),
              label: z.string(),
              same: z.boolean().describe('Every listing has the same value'),
              values: z.record(z.string(), compareValueShape).describe("Each listing's value, by slug"),
            })
          ),
          notes: z.array(z.string()).describe('Named listings that were left out, and why'),
        },
      },
      async ({ slugs }) => {
        const [catalog, retired] = await Promise.all([getEveryAgent(), getRetiredListings()]);
        return decisionResult(compareDecision(slugs, catalog, retired));
      }
    );

    server.registerTool(
      'alternatives_to',
      {
        title: 'Alternatives To',
        description: ALTERNATIVES_TO_DESCRIPTION,
        annotations: readOnly('Alternatives To'),
        inputSchema: {
          slug: z.string().describe('Agent slug, e.g. "deepgram"'),
          limit: z
            .number()
            .int()
            .min(1)
            .max(MAX_ALTERNATIVES)
            .describe(`Most alternatives to return (1–${MAX_ALTERNATIVES}, default ${MAX_ALTERNATIVES})`)
            .optional(),
        },
        outputSchema: {
          agent: z.object(decisionAgentShape),
          total: z.number().int().describe(`How many alternatives it has, up to ${MAX_ALTERNATIVES}`),
          url: z.string().nullable().describe('Its alternatives page; null when it has too few for one'),
          compareUrl: z.string().nullable().describe('The listing side by side with its top two alternatives'),
          basis: z.string().describe('What every alternative has in common with the listing'),
          alternatives: z.array(
            z.object({
              ...decisionAgentShape,
              sharedAccess: z.array(z.string()).describe('Access methods both offer'),
              inCommon: z.array(z.string()).describe('Skills and tags both have, rarest first'),
              why: z.string(),
            })
          ),
        },
      },
      async ({ slug, limit }) => {
        const [catalog, retired] = await Promise.all([getEveryAgent(), getRetiredListings()]);
        return decisionResult(alternativesDecision(slug, catalog, retired, limit ?? MAX_ALTERNATIVES));
      }
    );

    server.registerTool(
      'connect_bundle',
      {
        title: 'Connect Bundle',
        description: CONNECT_BUNDLE_DESCRIPTION,
        annotations: readOnly('Connect Bundle'),
        inputSchema: {
          slugs: z.array(z.string()).min(1).max(REQUESTED_MAX).describe(BUNDLE_SLUGS_INPUT),
        },
        outputSchema: {
          summary: z.string().describe('How many are in the config, to set up from a guide, and without an MCP server'),
          stackUrl: z.string().describe('These listings as a shared stack on the site'),
          config: z
            .object({ mcpServers: z.record(z.string(), mcpServerShape) })
            .nullable()
            .describe('The MCP client config to paste; null when no listing has an address or command to copy'),
          claudeCode: z.array(z.string()).describe('A claude mcp add command for each server in the config'),
          setupPrompt: z
            .string()
            .nullable()
            .describe('For a coding agent: set up each MCP server that has only a setup guide'),
          items: z.array(
            z.object({
              ...decisionAgentShape,
              how: z
                .enum(['config', 'guide', 'other'])
                .describe('config: in the config; guide: an MCP server to set up from its guide; other: no MCP server'),
              server: mcpServerShape.nullable().describe('Its entry in the config, under its slug'),
              docsUrl: z.string().describe('Its setup instructions'),
              note: z.string().describe('How it connects'),
            })
          ),
          notes: z.array(z.string()).describe('Named listings that were left out, and why'),
        },
      },
      async ({ slugs }) => {
        const [catalog, retired] = await Promise.all([getEveryAgent(), getRetiredListings()]);
        return decisionResult(bundleDecision(requestedStackSlugs(slugs), catalog, retired));
      }
    );

    server.registerTool(
      'submit_listing',
      {
        title: 'Submit a Listing',
        description: SUBMIT_LISTING_DESCRIPTION,
        // It posts a public GitHub issue the user cannot take back, so clients should confirm before each call.
        annotations: { title: 'Submit a Listing', readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
        inputSchema: submitListingInput,
        outputSchema: submitListingOutput,
      },
      async (input, extra) => submitListing(input, extra.requestInfo?.headers ?? {})
    );
  },
  {
    serverInfo: { name: 'agentswitchboard', version: '1.8.0' },
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
  return withCors(await limitedHandler(req));
}

async function limitedHandler(req: Request): Promise<Response> {
  const ip = clientIp(req.headers);
  const limited = (isAssistantPlatformIp(ip) ? platformLimiter : requestLimiter).take(ip);
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

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [name, value] of Object.entries(CORS)) headers.set(name, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export { loggedHandler as GET, loggedHandler as POST, loggedHandler as DELETE, preflight as OPTIONS };
