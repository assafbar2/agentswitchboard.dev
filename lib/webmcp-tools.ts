/**
 * The WebMCP tools that components/WebMcp.tsx registers on `document.modelContext`:
 * search_agents, get_agent, list_categories, compare_agents, alternatives_to and
 * connect_bundle.
 *
 * Each tool calls the public REST API (/api/agents, /api/agents/{slug},
 * /api/categories, /api/compare, /api/agents/{slug}/alternatives,
 * /api/bundle). That runs the same code as the remote MCP server at /api/mcp,
 * so answers and their order are the same; search and listing objects use the
 * REST field names (see /openapi.json), which differ from the remote MCP's in
 * a few places. Results are organic, as on the remote MCP (lib/organic.ts):
 * search and alternatives ask for `order=organic`, and every result leaves out
 * the placement fields (featured, sponsored, sponsorLabel, tier). Keep
 * /.well-known/webmcp.json in step with the declarations below.
 *
 * Every call is counted as a Vercel Analytics event (`webmcp_call`), fire and
 * forget: analytics can never fail or delay a tool.
 */

import { track } from '@vercel/analytics';
import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { COMPARE_QUERY_KEYS, compareQuery } from '@/lib/compare-link';
import {
  ACCESS_METHOD_INPUTS,
  ALTERNATIVES_TO_DESCRIPTION,
  AUTH_INPUT,
  BUNDLE_SLUGS_INPUT,
  COMPARE_AGENTS_DESCRIPTION,
  COMPARE_SLUGS_INPUT,
  CONNECT_BUNDLE_DESCRIPTION,
  MAX_LIMIT,
  OFFICIAL_DEFINITION,
  SINCE_INPUT,
  TASK_INPUT,
  VERIFIED_INPUT,
  unknownTaskMessage,
} from '@/lib/public-api';
import { withoutPlacement } from '@/lib/organic';
import { MAX_ALTERNATIVES } from '@/lib/related';
import { AUTH_TYPES, SORT_ORDERS, invalidSinceMessage } from '@/lib/search';
import { REQUESTED_MAX } from '@/lib/shared-stack';

export type ToolResult = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type ToolInput = Record<string, unknown>;

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: ToolInput) => Promise<ToolResult>;
}

const LABELS = `${VERIFIED_DEFINITION} ${OFFICIAL_DEFINITION}`;

const SORT_INPUT =
  'Result order. relevance (default): best match first with search text; without it, best fit first for a task, else A→Z. newest: most recently added first. skills: most skills first. name: A→Z';

// Every tool returns the same object as text (human/legacy fallback) and as
// structuredContent (matches the declared outputSchema).
const asResult = (body: Record<string, unknown>): ToolResult => {
  const o = withoutPlacement(body);
  return { content: [{ type: 'text', text: JSON.stringify(o) }], structuredContent: o };
};
// Errors match the remote MCP: a text message with isError, no structured body.
const asError = (text: string): ToolResult => ({
  content: [{ type: 'text', text }],
  isError: true,
});
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : undefined;
// `access` is an array, as on the remote MCP; a lone string is tolerated.
const strings = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string')
    : typeof v === 'string' && v
      ? [v]
      : [];

/** Same-origin GET against the public REST API. */
async function getJson(path: string): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: res.status, body };
}

/** GET a decision endpoint: its answer as the result, and a request it refuses as the remote MCP's tool error. */
async function decide(name: string, path: string): Promise<ToolResult> {
  const { status, body } = await getJson(path);
  if (status === 200 && body) return asResult(body);
  const message = status === 400 || status === 404 ? body?.message : undefined;
  return asError(typeof message === 'string' ? message : `${name} failed (HTTP ${status}).`);
}

function countCall(tool: string): void {
  try {
    track('webmcp_call', { tool });
  } catch {
    // Analytics must never break or block a tool call.
  }
}

/** Counts the call, then runs the tool; a failed request becomes an error result. */
function tool(name: string, run: (input: ToolInput) => Promise<ToolResult>) {
  return async (input: ToolInput): Promise<ToolResult> => {
    countCall(name);
    try {
      return await run(input ?? {});
    } catch {
      return asError(`${name} failed: the Agent Switchboard API could not be reached.`);
    }
  };
}

const labelProps = {
  verified: { type: 'boolean', description: VERIFIED_DEFINITION },
  official: { type: 'boolean', description: OFFICIAL_DEFINITION },
};

// GET /api/agents `agents[]` (lib/public-api.ts summarizeAgent).
const summaryProps = {
  name: { type: 'string' },
  slug: { type: 'string' },
  url: { type: 'string' },
  iconUrl: {
    type: ['string', 'null'],
    description: "Absolute URL of the listing's 128px PNG icon, served by Agent Switchboard; null when it has none",
  },
  description: { type: 'string' },
  provider: { type: 'string' },
  categories: { type: 'array', items: { type: 'string' } },
  accessMethods: { type: 'array', items: { type: 'string' } },
  ...labelProps,
};

const stringList = { type: 'array', items: { type: 'string' } };

// A listing in compare_agents, alternatives_to and connect_bundle (lib/public-api.ts decisionAgent).
const decisionProps = { ...summaryProps, authType: { type: 'string' } };

const leftOut = { ...stringList, description: 'Named listings that were left out, and why' };

export const WEBMCP_TOOLS: WebMcpTool[] = [
  {
    name: 'search_agents',
    description:
      'Search the curated Agent Switchboard directory of AI agents, MCP servers, and agentic tools. ' +
      'Filter by task, category slug, access methods, official (first-party listings from major vendors), verified, and/or auth type; ' +
      'sort by relevance, newest, most skills, or name. ' +
      LABELS,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search over name, description, skills, categories, tags, and provider',
        },
        task: { type: 'string', description: TASK_INPUT },
        category: { type: 'string', description: 'Category slug, e.g. "code-devtools", "voice-messaging"' },
        access: {
          type: 'array',
          items: { type: 'string', enum: ACCESS_METHOD_INPUTS },
          description:
            'Require ALL of these access methods: api, mcp, cli, browser-extension ("extension" is accepted as an alias of browser-extension)',
        },
        official: {
          type: 'boolean',
          description: "Only first-party listings from major vendors (e.g. Notion's own Notion MCP)",
        },
        verified: { type: 'boolean', description: VERIFIED_INPUT },
        auth: { type: 'array', items: { type: 'string', enum: AUTH_TYPES }, description: AUTH_INPUT },
        since: { type: 'string', description: SINCE_INPUT },
        sort: { type: 'string', enum: SORT_ORDERS, description: SORT_INPUT },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_LIMIT,
          default: 10,
          description: 'Max results per page (1–50)',
        },
        offset: {
          type: 'integer',
          minimum: 0,
          default: 0,
          description: 'Number of results to skip, for pagination',
        },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['total', 'offset', 'limit', 'agents'],
      properties: {
        total: { type: 'integer', description: 'Total matches before paging' },
        offset: { type: 'integer' },
        limit: { type: 'integer' },
        since: { type: 'string', description: 'With since: the first day kept (YYYY-MM-DD, UTC)' },
        agents: { type: 'array', items: { type: 'object', properties: summaryProps } },
      },
    },
    annotations: { readOnlyHint: true },
    execute: tool('search_agents', async (input) => {
      const params = new URLSearchParams({ order: 'organic' });
      const query = str(input.query);
      const task = str(input.task).toLowerCase();
      const category = str(input.category);
      const access = strings(input.access);
      const limit = num(input.limit);
      const offset = num(input.offset);
      if (query) params.set('q', query);
      if (task) params.set('task', task);
      if (category) params.set('category', category);
      // The API maps aliases and ignores unknown values, as the MCP does.
      if (access.length > 0) params.set('access', access.join(','));
      if (input.official === true) params.set('official', 'true');
      if (input.verified === true) params.set('verified', 'true');
      const auth = strings(input.auth);
      if (auth.length > 0) params.set('auth', auth.join(','));
      // A number of days may come as a number, as the remote MCP accepts.
      const since = typeof input.since === 'number' ? String(input.since) : str(input.since);
      if (since) params.set('since', since);
      const sort = str(input.sort);
      if (sort) params.set('sort', sort);
      if (limit !== undefined) params.set('limit', String(limit));
      if (offset !== undefined) params.set('offset', String(offset));
      const { status, body } = await getJson(`/api/agents?${params}`);
      if (status === 400 && body?.error === 'unknown_task') return asError(unknownTaskMessage(task));
      if (status === 400 && body?.error === 'invalid_since') return asError(invalidSinceMessage(since));
      if (status !== 200 || !body) return asError(`search_agents failed (HTTP ${status}).`);
      return asResult(body);
    }),
  },
  {
    name: 'get_agent',
    description:
      'Full detail for one agent by slug: skills, auth, streaming/push support, tags, provider links, ' +
      'and useItNow: how to start using it (MCP client config, install command, API base URL, setup links). ' +
      LABELS,
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Agent slug, e.g. "playwright-mcp"' } },
      required: ['slug'],
    },
    // GET /api/agents/{slug} (lib/public-api.ts detailAgent).
    outputSchema: {
      type: 'object',
      properties: {
        ...summaryProps,
        officialVendor: { type: ['string', 'null'] },
        homepage: { type: ['string', 'null'] },
        providerUrl: { type: ['string', 'null'] },
        authType: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        supportsStreaming: { type: 'boolean' },
        supportsPushNotifications: { type: 'boolean' },
        createdAt: { type: ['string', 'null'] },
        updatedAt: { type: ['string', 'null'] },
        mcpEndpoint: { type: ['string', 'null'] },
        mcpCommand: { type: ['string', 'null'] },
        install: { type: ['object', 'null'], properties: { type: { type: 'string' }, command: { type: 'string' } } },
        quickstartUrl: { type: ['string', 'null'] },
        apiBaseUrl: { type: ['string', 'null'] },
        useItNow: {
          type: 'object',
          description: 'How to start using it, per access method (mcp, cli, api, extension; null when it lacks one), after its tryThisFirst prompts.',
          properties: {
            tryThisFirst: { type: ['object', 'null'] },
            mcp: { type: ['object', 'null'] },
            cli: { type: ['object', 'null'] },
            api: { type: ['object', 'null'] },
            extension: { type: ['object', 'null'] },
          },
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: tool('get_agent', async (input) => {
      const slug = str(input.slug);
      const notFound = asError(`No agent with slug "${slug}". Try search_agents first.`);
      if (!slug) return notFound;
      const { status, body } = await getJson(`/api/agents/${encodeURIComponent(slug)}`);
      if (status === 404) return notFound;
      if (status !== 200 || !body) return asError(`get_agent failed (HTTP ${status}).`);
      return asResult(body);
    }),
  },
  {
    name: 'list_categories',
    description: 'All directory categories with live agent counts. Slugs are valid inputs for search_agents.',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: {
      type: 'object',
      required: ['categories'],
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            required: ['slug', 'name', 'agentCount'],
            properties: {
              slug: { type: 'string' },
              name: { type: 'string' },
              description: { type: ['string', 'null'] },
              agentCount: { type: 'integer' },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: tool('list_categories', async () => {
      const { status, body } = await getJson('/api/categories');
      if (status !== 200 || !body) return asError(`list_categories failed (HTTP ${status}).`);
      return asResult(body);
    }),
  },
  {
    name: 'compare_agents',
    description: COMPARE_AGENTS_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        slugs: { ...stringList, minItems: 1, maxItems: COMPARE_QUERY_KEYS.length, description: COMPARE_SLUGS_INPUT },
      },
      required: ['slugs'],
    },
    // GET /api/compare (lib/decide.ts compareDecision).
    outputSchema: {
      type: 'object',
      required: ['title', 'url', 'intro', 'agents', 'rows', 'notes'],
      properties: {
        title: { type: 'string' },
        url: { type: 'string', description: 'The comparison on the site' },
        intro: {
          type: ['string', 'null'],
          description: "A curated comparison's editorial line; null for any other mix",
        },
        agents: {
          type: 'array',
          items: { type: 'object', properties: { ...decisionProps, setsApart: stringList } },
        },
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              same: { type: 'boolean', description: 'Every listing has the same value' },
              values: {
                type: 'object',
                description:
                  "Each listing's value, by slug: a line of text, a list, or { code, note } for a command or address from its docs",
              },
            },
          },
        },
        notes: leftOut,
      },
    },
    annotations: { readOnlyHint: true },
    execute: tool('compare_agents', async (input) =>
      decide('compare_agents', `/api/compare?${compareQuery(strings(input.slugs), COMPARE_QUERY_KEYS.length)}`)
    ),
  },
  {
    name: 'alternatives_to',
    description: ALTERNATIVES_TO_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Agent slug, e.g. "deepgram"' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_ALTERNATIVES,
          description: `Most alternatives to return (1–${MAX_ALTERNATIVES}, default ${MAX_ALTERNATIVES})`,
        },
      },
      required: ['slug'],
    },
    // GET /api/agents/{slug}/alternatives (lib/decide.ts alternativesDecision).
    outputSchema: {
      type: 'object',
      required: ['agent', 'total', 'url', 'compareUrl', 'basis', 'alternatives'],
      properties: {
        agent: { type: 'object', properties: decisionProps },
        total: { type: 'integer', description: `How many alternatives it has, up to ${MAX_ALTERNATIVES}` },
        url: { type: ['string', 'null'], description: 'Its alternatives page; null when it has too few for one' },
        compareUrl: {
          type: ['string', 'null'],
          description: 'The listing side by side with its top two alternatives',
        },
        basis: { type: 'string', description: 'What every alternative has in common with the listing' },
        alternatives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ...decisionProps,
              sharedAccess: { ...stringList, description: 'Access methods both offer' },
              inCommon: { ...stringList, description: 'Skills and tags both have, rarest first' },
              why: { type: 'string' },
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: tool('alternatives_to', async (input) => {
      const slug = str(input.slug).toLowerCase();
      if (!slug) return asError('alternatives_to needs the slug of a listing, e.g. "deepgram".');
      const limit = num(input.limit);
      const query = `?order=organic${limit !== undefined ? `&limit=${limit}` : ''}`;
      return decide('alternatives_to', `/api/agents/${encodeURIComponent(slug)}/alternatives${query}`);
    }),
  },
  {
    name: 'connect_bundle',
    description: CONNECT_BUNDLE_DESCRIPTION,
    inputSchema: {
      type: 'object',
      properties: {
        slugs: { ...stringList, minItems: 1, maxItems: REQUESTED_MAX, description: BUNDLE_SLUGS_INPUT },
      },
      required: ['slugs'],
    },
    // GET /api/bundle (lib/decide.ts bundleDecision).
    outputSchema: {
      type: 'object',
      required: ['summary', 'stackUrl', 'config', 'claudeCode', 'setupPrompt', 'items', 'notes'],
      properties: {
        summary: {
          type: 'string',
          description: 'How many are in the config, to set up from a guide, and without an MCP server',
        },
        stackUrl: { type: 'string', description: 'These listings as a shared stack on the site' },
        config: {
          type: ['object', 'null'],
          description:
            'The MCP client config to paste, {"mcpServers": {<slug>: {url} or {command, args}}}; null when no listing has an address or command to copy',
        },
        claudeCode: { ...stringList, description: 'A claude mcp add command for each server in the config' },
        setupPrompt: {
          type: ['string', 'null'],
          description: 'For a coding agent: set up each MCP server that has only a setup guide',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ...decisionProps,
              how: {
                type: 'string',
                enum: ['config', 'guide', 'other'],
                description:
                  'config: in the config; guide: an MCP server to set up from its guide; other: no MCP server',
              },
              server: { type: ['object', 'null'], description: 'Its entry in the config, under its slug' },
              docsUrl: { type: 'string', description: 'Its setup instructions' },
              note: { type: 'string', description: 'How it connects' },
            },
          },
        },
        notes: leftOut,
      },
    },
    annotations: { readOnlyHint: true },
    execute: tool('connect_bundle', async (input) => {
      const items = strings(input.slugs).map(encodeURIComponent).join(',');
      return decide('connect_bundle', `/api/bundle?items=${items}`);
    }),
  },
];
