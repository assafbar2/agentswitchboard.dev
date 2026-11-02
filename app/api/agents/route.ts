/**
 * Public REST search over the directory — the plain-HTTP sibling of the MCP
 * server at /api/mcp. Built for wiring tools (e.g. the Muse connector platform)
 * that consume a simple parameterized GET rather than an MCP handshake.
 *
 *   GET /api/agents?q=<text>&task=<slug>&category=<slug>&access=<method>
 *                  &official=true&verified=true&auth=<type>&since=<day|days>
 *                  &sort=<order>&limit=<n>&offset=<n>
 *   → { total, offset, limit, since?, agents: [ { name, slug, url, iconUrl,
 *                                          description, provider, categories,
 *                                          accessMethods, verified, official,
 *                                          featured } ] }
 *
 * `task` (a slug from GET /api/tasks) keeps the listings that fit the task,
 * best fit first, as /browse?task= does; an unknown one is a 400.
 * `access` takes api | mcp | cli | browser-extension (comma-separate to require
 * several); `extension` is accepted as an alias of `browser-extension`.
 * `auth` takes none | apiKey | oauth2 | bearer (comma-separate to accept any).
 * `since` keeps listings added on or after a day: YYYY-MM-DD, or a number of
 * days back with today included (since=7 is the last 7 days). The response
 * echoes the first day kept; anything else is a 400.
 * Order (`sort`): relevance by default — no `q` → featured first, then A→Z,
 * or best fit first with a `task`; with `q` → best match (see
 * FEATURED_DEFINITION in lib/public-api.ts) — or newest, skills (most
 * first), name (A→Z).
 *
 * Read-only, no auth, open CORS. Same cached catalog (lib/catalog.ts) as the
 * site and the MCP server, so results always match the web directory.
 */

import { getEveryAgent } from '@/lib/catalog';
import {
  filterAgents,
  invalidSinceMessage,
  parseFlag,
  parseSince,
  parseSort,
  searchAgents,
  sortAgents,
  taskMatches,
} from '@/lib/search';
import { getTask } from '@/lib/tasks';
import { logConsumer } from '@/lib/log';
import {
  corsPreflight,
  jsonResponse,
  normalizeAccessMethods,
  normalizeAuthTypes,
  summarizeAgent,
  unknownTaskMessage,
  clampInt,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '@/lib/public-api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const taskSlug = (searchParams.get('task') ?? '').trim().toLowerCase();
  const category = (searchParams.get('category') ?? '').trim();
  const official = parseFlag(searchParams.get('official'));
  // Known access methods only (aliases such as `extension` mapped to their
  // canonical value); anything else is ignored rather than a 400.
  const access = normalizeAccessMethods((searchParams.get('access') ?? '').split(','));
  const verified = parseFlag(searchParams.get('verified'));
  const auth = normalizeAuthTypes((searchParams.get('auth') ?? '').split(','));
  const sort = parseSort(searchParams.get('sort'));
  const sinceRaw = (searchParams.get('since') ?? '').trim();
  const since = sinceRaw ? parseSince(sinceRaw) : null;
  const limit = clampInt(searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);

  logConsumer('/api/agents', req, {
    q,
    task: taskSlug || undefined,
    category,
    access: access.join('+') || undefined,
    official: official || undefined,
    verified: verified || undefined,
    auth: auth.join('|') || undefined,
    since: sinceRaw || undefined,
    sort: sort === 'relevance' ? undefined : sort,
  });

  const task = taskSlug ? getTask(taskSlug) : null;
  if (taskSlug && !task) {
    return jsonResponse({ error: 'unknown_task', message: unknownTaskMessage(taskSlug) }, 400);
  }
  if (sinceRaw && !since) {
    return jsonResponse({ error: 'invalid_since', message: invalidSinceMessage(sinceRaw) }, 400);
  }

  const catalog = await getEveryAgent();
  const agents = filterAgents(task ? taskMatches(catalog, task) : catalog, {
    category,
    official,
    verified,
    auth,
    since: since ?? undefined,
  });
  const matches = sortAgents(searchAgents(agents, q, access.length > 0 ? access : undefined), sort);
  const page = matches.slice(offset, offset + limit);

  return jsonResponse({
    total: matches.length,
    offset,
    limit,
    ...(since && { since }),
    agents: page.map(summarizeAgent),
  });
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
