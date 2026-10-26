'use client';

/**
 * WebMCP — the in-page half of "this directory is an agent".
 *
 * Registers the catalog's tools on `document.modelContext` (W3C WebMCP API,
 * polyfilled for browsers without native support) so an AI agent looking at
 * the page in a browser can call search_agents / get_agent / list_categories
 * directly, without scraping the DOM.
 *
 * Each tool calls the public REST API (/api/agents, /api/agents/{slug},
 * /api/categories). That runs the same filter and ranking code as the remote
 * MCP server at /api/mcp, so matches and their order are the same; result
 * objects use the REST field names (see /openapi.json), which differ from the
 * remote MCP's in a few places. Keep /.well-known/webmcp.json in step with the
 * declarations below.
 *
 * Every call is counted as a Vercel Analytics event (`webmcp_call`), fire and
 * forget: analytics can never fail or delay a tool.
 *
 * Progressive enhancement: if WebMCP is unavailable or fails to init, this is
 * a silent no-op and the page is unaffected.
 */

import { useEffect } from 'react';
import { track } from '@vercel/analytics';
import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import {
  ACCESS_METHOD_INPUTS,
  FEATURED_DEFINITION,
  MAX_LIMIT,
  OFFICIAL_DEFINITION,
} from '@/lib/public-api';

type ToolResult = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

type ToolInput = Record<string, unknown>;

interface WebMcpRegistrar {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      outputSchema?: Record<string, unknown>;
      annotations?: { readOnlyHint?: boolean };
      execute: (input: ToolInput) => Promise<ToolResult>;
    },
    options?: { signal?: AbortSignal }
  ): Promise<void>;
}

const LABELS = `${VERIFIED_DEFINITION} ${OFFICIAL_DEFINITION} ${FEATURED_DEFINITION}`;

// Every tool returns the same object as text (human/legacy fallback) and as
// structuredContent (matches the declared outputSchema).
const asResult = (o: Record<string, unknown>): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(o, null, 2) }],
  structuredContent: o,
});
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
  featured: { type: 'boolean', description: FEATURED_DEFINITION },
};

// GET /api/agents `agents[]` (lib/public-api.ts summarizeAgent).
const summaryProps = {
  name: { type: 'string' },
  slug: { type: 'string' },
  url: { type: 'string' },
  description: { type: 'string' },
  provider: { type: 'string' },
  categories: { type: 'array', items: { type: 'string' } },
  accessMethods: { type: 'array', items: { type: 'string' } },
  ...labelProps,
};

export function WebMcp() {
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const { initializeWebMCPPolyfill } = await import('@mcp-b/webmcp-polyfill');
        initializeWebMCPPolyfill();

        const mc = (document as unknown as { modelContext?: WebMcpRegistrar }).modelContext;
        if (!mc || cancelled) return;

        await mc.registerTool(
          {
            name: 'search_agents',
            description:
              'Search the curated Agent Switchboard directory of AI agents, MCP servers, and agentic tools. ' +
              'Filter by category slug, access methods, and/or official (first-party listings from major vendors). ' +
              LABELS,
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Free-text search over name, description, skills, categories, tags, and provider',
                },
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
                agents: { type: 'array', items: { type: 'object', properties: summaryProps } },
              },
            },
            annotations: { readOnlyHint: true },
            execute: tool('search_agents', async (input) => {
              const params = new URLSearchParams();
              const query = str(input.query);
              const category = str(input.category);
              const access = strings(input.access);
              const limit = num(input.limit);
              const offset = num(input.offset);
              if (query) params.set('q', query);
              if (category) params.set('category', category);
              // The API maps aliases and ignores unknown values, as the MCP does.
              if (access.length > 0) params.set('access', access.join(','));
              if (input.official === true) params.set('official', 'true');
              if (limit !== undefined) params.set('limit', String(limit));
              if (offset !== undefined) params.set('offset', String(offset));
              const { status, body } = await getJson(`/api/agents?${params}`);
              if (status !== 200 || !body) return asError(`search_agents failed (HTTP ${status}).`);
              return asResult(body);
            }),
          },
          { signal: controller.signal }
        );

        await mc.registerTool(
          {
            name: 'get_agent',
            description:
              'Full detail for one agent by slug: skills, auth, streaming/push support, tags, provider links. ' +
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
                tier: { type: 'string' },
                createdAt: { type: ['string', 'null'] },
                updatedAt: { type: ['string', 'null'] },
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
          { signal: controller.signal }
        );

        await mc.registerTool(
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
          { signal: controller.signal }
        );
      } catch {
        // WebMCP unavailable or failed to initialize — no-op.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return null;
}
