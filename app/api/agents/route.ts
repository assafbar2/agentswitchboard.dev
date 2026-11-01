/**
 * Public REST search over the directory — the plain-HTTP sibling of the MCP
 * server at /api/mcp. Built for wiring tools (e.g. the Muse connector platform)
 * that consume a simple parameterized GET rather than an MCP handshake.
 *
 *   GET /api/agents?q=<text>&category=<slug>&access=<method>&official=true
 *                  &verified=true&auth=<type>&sort=<order>&limit=<n>&offset=<n>
 *   → { total, offset, limit, agents: [ { name, slug, url, iconUrl,
 *                                          description, provider, categories,
 *                                          accessMethods, verified, official,
 *                                          featured } ] }
 *
 * `access` takes api | mcp | cli | browser-extension (comma-separate to require
 * several); `extension` is accepted as an alias of `browser-extension`.
 * `auth` takes none | apiKey | oauth2 | bearer (comma-separate to accept any).
 * Order (`sort`): relevance by default — no `q` → featured first, then A→Z;
 * with `q` → best match (see FEATURED_DEFINITION in lib/public-api.ts) — or
 * newest, skills (most first), name (A→Z).
 *
 * Read-only, no auth, open CORS. Same cached catalog (lib/catalog.ts) as the
 * site and the MCP server, so results always match the web directory.
 */

import { getEveryAgent } from '@/lib/catalog';
import { filterAgents, parseFlag, parseSort, searchAgents, sortAgents } from '@/lib/search';
import { logConsumer } from '@/lib/log';
import {
  corsPreflight,
  jsonResponse,
  normalizeAccessMethods,
  normalizeAuthTypes,
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
  const official = parseFlag(searchParams.get('official'));
  // Known access methods only (aliases such as `extension` mapped to their
  // canonical value); anything else is ignored rather than a 400.
  const access = normalizeAccessMethods((searchParams.get('access') ?? '').split(','));
  const verified = parseFlag(searchParams.get('verified'));
  const auth = normalizeAuthTypes((searchParams.get('auth') ?? '').split(','));
  const sort = parseSort(searchParams.get('sort'));
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);

  logConsumer('/api/agents', req, {
    q,
    category,
    access: access.join('+') || undefined,
    official: official || undefined,
    verified: verified || undefined,
    auth: auth.join('|') || undefined,
    sort: sort === 'relevance' ? undefined : sort,
  });

  const agents = filterAgents(await getEveryAgent(), { category, official, verified, auth });
  const matches = sortAgents(searchAgents(agents, q, access.length > 0 ? access : undefined), sort);
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
