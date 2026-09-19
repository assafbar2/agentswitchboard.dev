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
import {
  corsPreflight,
  jsonResponse,
  summarizeAgent,
  clampInt,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/lib/public-api';

export const dynamic = 'force-dynamic';

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

  return jsonResponse({
    total: matches.length,
    offset,
    limit,
    agents: page.map(summarizeAgent),
  });
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
