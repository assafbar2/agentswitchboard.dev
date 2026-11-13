/**
 * AI-assistant surfaces are always organic. The Claude Connectors Directory
 * (Anthropic Software Directory Policy 4.C) and the ChatGPT plugin directory
 * (plugin guidelines, Advertising) forbid ads, sponsored content and paid
 * placement, so the MCP server (/api/mcp) and the WebMCP tools
 * (lib/webmcp-tools.ts) never return a placement field and never rank by one.
 *
 * Every content/agents/*.json read is intercepted: in "placed" mode every
 * other listing is featured, sponsored, labeled and premium. Each tool must
 * answer exactly as it does with no placement at all, and no answer may carry
 * a placement field.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MCP_TOOL_NAMES } from '@/lib/mcp-tools';

const placement = vi.hoisted(() => ({ on: false }));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const AGENT_FILE = /[\\/]content[\\/]agents[\\/]([^\\/]+)\.json$/;
  let parity = 0;
  const flagged = new Map<string, boolean>();
  const readFile = (async (file: unknown, ...rest: unknown[]) => {
    const raw = await (actual.promises.readFile as (...a: unknown[]) => Promise<string>)(file, ...rest);
    const match = typeof file === 'string' ? AGENT_FILE.exec(file) : null;
    if (!placement.on || !match) return raw;
    if (!flagged.has(match[1])) flagged.set(match[1], parity++ % 2 === 0);
    if (!flagged.get(match[1])) return raw;
    return JSON.stringify({
      ...JSON.parse(raw),
      featured: true,
      featuredUntil: '2999-01-01',
      sponsored: true,
      sponsorLabel: 'Sponsored',
      tier: 'premium',
    });
  }) as typeof actual.promises.readFile;
  const promises = { ...actual.promises, readFile };
  return { ...actual, promises, default: { ...actual, promises } };
});

const { POST: mcpPost } = await import('@/app/api/[transport]/route');
const { WEBMCP_TOOLS } = await import('@/lib/webmcp-tools');
const agentsRoute = await import('@/app/api/agents/route');
const agentRoute = await import('@/app/api/agents/[slug]/route');
const alternativesRoute = await import('@/app/api/agents/[slug]/alternatives/route');
const categoriesRoute = await import('@/app/api/categories/route');
const compareRoute = await import('@/app/api/compare/route');
const bundleRoute = await import('@/app/api/bundle/route');
const recommendRoute = await import('@/app/api/recommend/route');

const PLACEMENT_KEY = /^(featured|featuredUntil|sponsored|sponsorLabel|tier)$/;

function placementKeys(value: unknown, at = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => placementKeys(v, `${at}[${i}]`));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, v]) => [
    ...(PLACEMENT_KEY.test(key) ? [`${at}.${key}`] : []),
    ...placementKeys(v, `${at}.${key}`),
  ]);
}

const CALLS: [string, Record<string, unknown>][] = [
  ['search_agents', { limit: 50 }],
  ['search_agents', { limit: 50, offset: 50 }],
  ['search_agents', { query: 'browser', limit: 50 }],
  ['search_agents', { query: 'email', limit: 50 }],
  ['search_agents', { task: 'query-a-database', limit: 50 }],
  ['search_agents', { access: ['mcp'], auth: ['none'], limit: 50 }],
  ['search_agents', { category: 'code-devtools', limit: 50 }],
  ['search_agents', { sort: 'newest', limit: 50 }],
  ['search_agents', { sort: 'skills', limit: 50 }],
  ['search_agents', { sort: 'name', limit: 50 }],
  ['get_agent', { slug: 'playwright-mcp' }],
  ['get_agent', { slug: 'barnir-hired' }],
  ['list_categories', {}],
  ['compare_agents', { slugs: ['github-copilot', 'cursor', 'codeium-windsurf'] }],
  ['compare_agents', { slugs: ['pinecone', 'qdrant'] }],
  ['alternatives_to', { slug: 'pinecone' }],
  ['alternatives_to', { slug: 'playwright-mcp' }],
  ['connect_bundle', { slugs: ['playwright-mcp', 'github-mcp', 'notion-mcp', 'cursor'] }],
  ['recommend', { need: 'read my Notion, file Linear tickets, ping me on Slack' }],
  ['recommend', { need: 'query Postgres and send email' }],
  ['recommend', { need: 'write and fix code' }],
  ['recommend', { need: 'an official MCP to browse the web' }],
];

let rpcId = 0;
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const res = await mcpPost(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'x-forwarded-for': `198.51.100.${(rpcId % 250) + 1}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
    })
  );
  const text = await res.text();
  const data = text
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .pop();
  return JSON.parse(data ? data.slice(5) : text);
}

async function mcpCall(name: string, args: Record<string, unknown>) {
  const { result } = await rpc('tools/call', { name, arguments: args });
  return { structured: result.structuredContent, text: JSON.parse(result.content[0].text) };
}

/** Same-origin fetch for the WebMCP tools, answered by the REST route handlers in-process. */
async function restFetch(input: string | URL | Request): Promise<Response> {
  const url = new URL(String(input), 'http://localhost');
  const req = new Request(url);
  const slug = (s: string) => ({ params: Promise.resolve({ slug: decodeURIComponent(s) }) });
  const p = url.pathname;
  let m: RegExpExecArray | null;
  if (p === '/api/agents') return agentsRoute.GET(req);
  if ((m = /^\/api\/agents\/([^/]+)\/alternatives$/.exec(p))) return alternativesRoute.GET(req, slug(m[1]));
  if ((m = /^\/api\/agents\/([^/]+)$/.exec(p))) return agentRoute.GET(req, slug(m[1]));
  if (p === '/api/categories') return categoriesRoute.GET(req);
  if (p === '/api/compare') return compareRoute.GET(req);
  if (p === '/api/bundle') return bundleRoute.GET(req);
  if (p === '/api/recommend') return recommendRoute.GET(req);
  throw new Error(`WebMCP fetched an unexpected path: ${p}`);
}

async function webMcpCall(name: string, args: Record<string, unknown>) {
  const tool = WEBMCP_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`no WebMCP tool ${name}`);
  const result = await tool.execute(args);
  expect(result.isError, `${name} ${JSON.stringify(args)}: ${result.content[0].text}`).toBeFalsy();
  return { structured: result.structuredContent, text: JSON.parse(result.content[0].text) };
}

const SURFACES = [
  ['MCP server', mcpCall],
  ['WebMCP', webMcpCall],
] as const;

beforeAll(() => {
  vi.stubGlobal('fetch', restFetch);
});
afterAll(() => {
  vi.unstubAllGlobals();
  placement.on = false;
});

describe('AI-assistant surfaces are organic', () => {
  it('the placed catalog really carries placement fields, and REST still shows them', async () => {
    placement.on = true;
    const res = await agentsRoute.GET(new Request('http://localhost/api/agents?limit=50'));
    const body = await res.json();
    placement.on = false;
    expect(body.agents.some((a: { featured?: boolean }) => a.featured)).toBe(true);
  });

  for (const [surface, call] of SURFACES) {
    describe(surface, () => {
      for (const [name, args] of CALLS) {
        it(`${name} ${JSON.stringify(args)}: no placement field, and the same answer whatever is placed`, async () => {
          placement.on = false;
          const organic = await call(name, args);
          placement.on = true;
          const placed = await call(name, args);
          placement.on = false;

          expect(placementKeys(placed.structured)).toEqual([]);
          expect(placementKeys(placed.text)).toEqual([]);
          expect(placed.structured).toEqual(organic.structured);
          expect(placed.text).toEqual(organic.text);
        });
      }
    });
  }

  it('the MCP tool list names no placement field and promises no placement order', async () => {
    const { result } = await rpc('tools/list');
    expect(result.tools).toHaveLength(9);
    // The logger's allow-list of tool names (lib/mcp-tools.ts) matches what is registered.
    expect(result.tools.map((t: { name: string }) => t.name).sort()).toEqual([...MCP_TOOL_NAMES].sort());
    for (const tool of result.tools) {
      expect(placementKeys(tool.outputSchema ?? {}), tool.name).toEqual([]);
      expect(JSON.stringify(tool.outputSchema ?? {}), tool.name).not.toMatch(/"(featured|sponsored|sponsorLabel)"/);
      expect(tool.description, tool.name).not.toMatch(/featured|sponsor/i);
      expect(JSON.stringify(tool.inputSchema), tool.name).not.toMatch(/featured|sponsor/i);
    }
  });

  it('the WebMCP tool declarations name no placement field and promise no placement order', () => {
    expect(WEBMCP_TOOLS.map((t) => t.name).sort()).toEqual(
      ['alternatives_to', 'compare_agents', 'connect_bundle', 'get_agent', 'list_categories', 'recommend', 'search_agents']
    );
    for (const tool of WEBMCP_TOOLS) {
      expect(JSON.stringify(tool.outputSchema ?? {}), tool.name).not.toMatch(/"(featured|featuredUntil|sponsored|sponsorLabel|tier)"/);
      expect(tool.description, tool.name).not.toMatch(/featured|sponsor/i);
      expect(JSON.stringify(tool.inputSchema), tool.name).not.toMatch(/featured|sponsor/i);
    }
  });
});
