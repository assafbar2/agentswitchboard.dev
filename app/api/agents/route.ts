/**
 * Public REST search over the directory — the plain-HTTP sibling of the MCP
 * server at /api/mcp. Built for wiring tools (e.g. the Muse connector platform)
 * that consume a simple parameterized GET rather than an MCP handshake.
 *
 *   GET /api/agents?q=<text>&category=<slug>&access=<method>&limit=<n>&offset=<n>
 *   → { total, offset, limit, agents: [ { name, slug, url, description,
 *                                          provider, categories, accessMethods,
 *                                          verified } ] }
 *
 * Read-only, no auth, open CORS. Same cached catalog (lib/catalog.ts) as the
 * site and the MCP server, so results always match the web directory.
 */

import { getEveryAgent } from '@/lib/catalog';
import { searchAgents, ALL_ACCESS_METHODS } from '@/lib/search';
import { logConsumer } from '@/lib/log';
import type { Agent } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SITE = 'https://agentswitchboard.dev';
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function summarize(a: Agent) {
  return {
    name: a.name,
    slug: a.slug,
    url: `${SITE}/agents/${a.slug}`,
    description: a.description,
    provider: a.providerName,
    categories: a.categories.map((c) => c.slug),
    accessMethods: a.accessMethods,
    verified: a.verified,
  };
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const category = (searchParams.get('category') ?? '').trim();
  // Only honor known access methods; ignore anything else rather than 400.
  const access = (searchParams.get('access') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => ALL_ACCESS_METHODS.includes(s));
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);

  logConsumer('/api/agents', req, { q, category, access: access.join('+') || undefined });

  let agents = await getEveryAgent();
  if (category) {
    agents = agents.filter((a) => a.categories.some((c) => c.slug === category));
  }
  const matches = searchAgents(agents, q, access.length > 0 ? access : undefined);
  const page = matches.slice(offset, offset + limit);

  const body = {
    total: matches.length,
    offset,
    limit,
    agents: page.map(summarize),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      ...CORS,
    },
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}
