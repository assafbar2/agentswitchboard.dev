'use client';

/**
 * WebMCP — the in-page half of "this directory is an agent".
 *
 * Registers the catalog's tools on `document.modelContext` (W3C WebMCP API,
 * polyfilled for browsers without native support) so an AI agent looking at
 * the page in a browser can call search_agents / get_agent / list_categories
 * directly, without scraping the DOM. This mirrors the server MCP at
 * /api/mcp; both read the same catalog, so results always match the site.
 *
 * Progressive enhancement: if WebMCP is unavailable or fails to init, this is
 * a silent no-op and the page is unaffected.
 */

import { useEffect } from 'react';

interface CatalogAgent {
  name: string;
  slug: string;
  url: string;
  homepage: string | null;
  provider: string | null;
  description: string;
  categories: string[];
  accessMethods: string[];
  tags: string[];
  verified: boolean;
  tier: string;
}

type ToolResult = { content: { type: 'text'; text: string }[] };

interface WebMcpRegistrar {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema?: Record<string, unknown>;
      annotations?: { readOnlyHint?: boolean };
      execute: (input: Record<string, unknown>) => Promise<ToolResult>;
    },
    options?: { signal?: AbortSignal }
  ): Promise<void>;
}

const asText = (o: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(o, null, 2) }],
});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);

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

        // Lazy, cached catalog load — only fetched when a tool is first called.
        let catalog: CatalogAgent[] | null = null;
        const load = async (): Promise<CatalogAgent[]> => {
          if (!catalog) {
            const res = await fetch('/agents.json');
            catalog = (await res.json()).agents as CatalogAgent[];
          }
          return catalog;
        };

        await mc.registerTool(
          {
            name: 'search_agents',
            description:
              "Search Agent Switchboard's directory of vetted AI agents, MCP servers, and agentic tools. Filter by free-text query, category slug, and/or access method (api, mcp, cli, browser-extension).",
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Free-text search over name, description, tags' },
                category: { type: 'string', description: 'Category slug, e.g. "autonomous-agents"' },
                access: { type: 'string', description: 'api | mcp | cli | browser-extension' },
                limit: { type: 'number', description: 'Max results (default 10)' },
              },
            },
            annotations: { readOnlyHint: true },
            async execute(input) {
              const all = await load();
              const q = str(input.query).toLowerCase();
              const category = str(input.category);
              const access = str(input.access);
              let res = all;
              if (category) res = res.filter((a) => a.categories.includes(category));
              if (access) res = res.filter((a) => a.accessMethods.includes(access));
              if (q)
                res = res.filter((a) =>
                  `${a.name} ${a.description} ${a.tags.join(' ')}`.toLowerCase().includes(q)
                );
              const trimmed = res.slice(0, num(input.limit) ?? 10).map((a) => ({
                name: a.name,
                slug: a.slug,
                url: a.url,
                categories: a.categories,
                accessMethods: a.accessMethods,
              }));
              return asText({ total: trimmed.length, agents: trimmed });
            },
          },
          { signal: controller.signal }
        );

        await mc.registerTool(
          {
            name: 'get_agent',
            description: 'Get full detail for one agent by slug: description, provider, categories, access methods, tags, and links.',
            inputSchema: {
              type: 'object',
              properties: { slug: { type: 'string' } },
              required: ['slug'],
            },
            annotations: { readOnlyHint: true },
            async execute(input) {
              const all = await load();
              const agent = all.find((a) => a.slug === str(input.slug));
              return agent
                ? asText(agent)
                : asText({ error: `No agent with slug "${str(input.slug)}". Try search_agents first.` });
            },
          },
          { signal: controller.signal }
        );

        await mc.registerTool(
          {
            name: 'list_categories',
            description: 'List all directory categories with their agent counts. Slugs are valid inputs for search_agents.',
            inputSchema: { type: 'object', properties: {} },
            annotations: { readOnlyHint: true },
            async execute() {
              const all = await load();
              const counts = new Map<string, number>();
              for (const a of all) for (const c of a.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
              return asText(
                [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([slug, count]) => ({ slug, count }))
              );
            },
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
