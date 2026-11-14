/**
 * Public REST search over the directory — the plain-HTTP sibling of the MCP
 * server at /api/mcp. Built for wiring tools (e.g. the Muse connector platform)
 * that consume a simple parameterized GET rather than an MCP handshake.
 *
 *   GET /api/agents?q=<text>&task=<slug>&category=<slug>&access=<method>
 *                  &official=true&verified=true&auth=<type>&since=<day|days>
 *                  &sort=<order>&order=organic&limit=<n>&offset=<n>&page=<n>
 *   → { total, offset, limit, since?, next, agents: [ { name, slug, url, iconUrl,
 *                                          description, provider, categories,
 *                                          accessMethods, verified, official,
 *                                          featured } ] }
 *
 * `task` (a slug from GET /api/tasks) keeps the listings that fit the task,
 * best fit first and A→Z on a tie, featured ignored, as /browse?task= and
 * GET /api/tasks/<slug> do; an unknown one is a 400.
 * `access` takes api | mcp | cli | browser-extension (comma-separate to require
 * several); `extension` is accepted as an alias of `browser-extension`.
 * `auth` takes none | apiKey | oauth2 | bearer (comma-separate to accept any).
 * `since` keeps listings added on or after a day: YYYY-MM-DD, or a number of
 * days back with today included (since=7 is the last 7 days). The response
 * echoes the first day kept; anything else is a 400.
 * Order (`sort`): relevance by default — no `q` → featured first, then A→Z,
 * or best fit first with a `task`; with `q` → best match (see
 * FEATURED_DEFINITION in lib/public-api.ts) — or newest, skills (most
 * first), name (A→Z). `order=organic` ignores featured, so ties and the
 * no-`q` order are A→Z (lib/organic.ts); WebMCP asks for it.
 * Paging: `page` (from 1) steps `offset` by `limit`; `offset` wins when both
 * are sent. `next` is the URL of the following page, null on the last one.
 *
 * Read-only, no auth, open CORS. Same cached catalog (lib/catalog.ts) as the
 * site and the MCP server, so results always match the web directory.
 */

import { getEveryAgent } from '@/lib/catalog';
import { organicOrder, wantsOrganic } from '@/lib/organic';
import {
  clampQuery,
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
import { logZeroResults } from '@/lib/leads';
import { logConsumer } from '@/lib/log';
import { restRateLimit } from '@/lib/rest-rate-limit';
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

const MAX_PAGE = 1_000_000;

/** The same request one page on, as `offset` (which wins over `page`). */
function nextPageUrl(requestUrl: string, offset: number, limit: number): string {
  const url = new URL(requestUrl);
  url.searchParams.delete('page');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}

export async function GET(req: Request): Promise<Response> {
  const limited = restRateLimit('/api/agents', req);
  if (limited) return limited;
  const { searchParams } = new URL(req.url);
  const q = clampQuery(searchParams.get('q'));
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
  const page = clampInt(searchParams.get('page'), 1, 1, MAX_PAGE);
  const offset = searchParams.has('offset')
    ? clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER)
    : (page - 1) * limit;

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

  const everyAgent = await getEveryAgent();
  // A task ranks on fit alone, as GET /api/tasks/<slug> and the task page do.
  const catalog = task || wantsOrganic(searchParams) ? organicOrder(everyAgent) : everyAgent;
  const agents = filterAgents(task ? taskMatches(catalog, task) : catalog, {
    category,
    official,
    verified,
    auth,
    since: since ?? undefined,
  });
  const matches = sortAgents(searchAgents(agents, q, access.length > 0 ? access : undefined), sort);
  logZeroResults('rest', req.headers, matches.length, {
    q,
    task: task?.slug,
    category,
    access: access.join('+') || undefined,
    official,
    verified,
    auth: auth.join('|') || undefined,
    since: since ?? undefined,
  });
  const results = matches.slice(offset, offset + limit);

  return jsonResponse({
    total: matches.length,
    offset,
    limit,
    ...(since && { since }),
    next: offset + limit < matches.length ? nextPageUrl(req.url, offset + limit, limit) : null,
    agents: results.map(summarizeAgent),
  });
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
