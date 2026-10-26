/**
 * Structured request logging for machine-consumer endpoints.
 * One JSON line per request → queryable in Vercel's log explorer
 * (filter on `asb_consumer`) to see who consumes the catalog, how often,
 * and which MCP tools they call.
 *
 * That log line is the always-on record. Each call also sends an
 * `agent_call` custom event to Vercel Analytics, scheduled with after() so it
 * never delays the response. Custom events are only stored on Vercel's Pro and
 * Enterprise plans: on Hobby they are dropped, and the log line is all there is.
 *
 * Machine docs that are served statically (llms.txt, index.md, openapi.json,
 * /.well-known/*, …) never run route code per request, so proxy.ts counts
 * those at the edge with logEdgeDoc().
 */

import { after } from 'next/server';
import { track } from '@vercel/analytics/server';

export type Surface = 'mcp' | 'rest' | 'doc';

export type ClientBucket =
  | 'claude'
  | 'cursor'
  | 'chatgpt-openai'
  | 'windsurf'
  | 'vscode'
  | 'mcp-remote'
  | 'python'
  | 'node'
  | 'curl'
  | 'browser'
  | 'other';

/** Vercel Analytics rejects custom-event property values longer than this. */
export const MAX_EVENT_VALUE_LENGTH = 255;

/**
 * Request header proxy.ts sets on a machine-doc request it has already
 * counted, so a route handler behind it (e.g. /agents.json) does not count
 * the same request twice. Only honoured for doc routes: the proxy always sets
 * it there, so a client cannot use it to hide API or MCP calls.
 */
export const EDGE_LOGGED_HEADER = 'x-asb-edge-logged';

/** First match wins, so specific clients come before generic runtimes. */
const CLIENT_PATTERNS: ReadonlyArray<readonly [ClientBucket, RegExp]> = [
  ['claude', /claude|anthropic/i],
  ['chatgpt-openai', /chatgpt|openai|gptbot|oai-searchbot/i],
  ['cursor', /cursor/i],
  ['windsurf', /windsurf|codeium/i],
  // VS Code's Electron UA carries `Code/1.x`; capitalised, so `claude-code/` is not it.
  ['vscode', /vscode|visual studio code|\bCode\/\d/],
  ['mcp-remote', /mcp-remote/i],
  ['python', /python|httpx|aiohttp/i],
  ['node', /^node(?:\/|$)|node-fetch|undici|axios/i],
  ['curl', /^curl\//i],
];

/** Crawlers and headless automation also send `Mozilla/5.0`: not a person in a browser. */
const NOT_A_BROWSER = /bot\b|crawl|spider|slurp|headless/i;

/** Buckets a user-agent string into a coarse client type. */
export function bucketClient(userAgent: string | null | undefined): ClientBucket {
  const ua = (userAgent ?? '').trim();
  if (!ua) return 'other';
  for (const [bucket, pattern] of CLIENT_PATTERNS) {
    if (pattern.test(ua)) return bucket;
  }
  if (/^Mozilla\/5\.0/.test(ua) && !NOT_A_BROWSER.test(ua)) return 'browser';
  return 'other';
}

/** Which consumer surface a logged route belongs to. */
export function surfaceFor(route: string): Surface {
  if (route === '/api/mcp' || route.startsWith('/api/mcp/')) return 'mcp';
  if (route.startsWith('/api/')) return 'rest';
  return 'doc';
}

function clip(value: string): string {
  return value.length > MAX_EVENT_VALUE_LENGTH ? value.slice(0, MAX_EVENT_VALUE_LENGTH) : value;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** The JSON-RPC tool name for tools/call, else the JSON-RPC method, else ''. */
function toolFor(extra: Record<string, unknown>): string {
  return nonEmptyString(extra.tool) ?? nonEmptyString(extra.method) ?? '';
}

/**
 * The request headers track() reads to attribute an event (user-agent,
 * client IP, referer). Cookies and credentials are deliberately not passed.
 */
function sessionHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of ['user-agent', 'x-forwarded-for', 'referer']) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

/** track() only has somewhere to send events on Vercel; elsewhere it just logs noise. */
function analyticsEndpointConfigured(): boolean {
  return Boolean(process.env.VERCEL_WEB_ANALYTICS_ENDPOINT || process.env.VERCEL_URL);
}

/** Sends the agent_call event after the response. Never throws, never rejects. */
function scheduleTrack(
  properties: { surface: Surface; route: string; tool: string; client: ClientBucket },
  headers: Record<string, string>
): void {
  if (!analyticsEndpointConfigured()) return;

  const send = async (): Promise<void> => {
    try {
      await track('agent_call', properties, { headers });
    } catch {
      // analytics must never break the request
    }
  };

  try {
    after(send);
  } catch {
    // after() throws outside a request scope: send without it, fire-and-forget.
    send().catch(() => {});
  }
}

function record(
  route: string,
  surface: Surface,
  req: Request,
  extra: Record<string, unknown>
): void {
  const ua = req.headers.get('user-agent');
  const client = bucketClient(ua);

  try {
    console.log(
      JSON.stringify({
        asb_consumer: true,
        route,
        ua: ua ?? 'unknown',
        client,
        referer: req.headers.get('referer') ?? undefined,
        ...extra,
      })
    );
  } catch {
    // logging must never break the request
  }

  scheduleTrack(
    { surface, route: clip(route), tool: clip(toolFor(extra)), client },
    sessionHeaders(req)
  );
}

/**
 * Logs one machine-consumer request from a route handler. Synchronous for
 * callers and never throws.
 */
export function logConsumer(
  route: string,
  req: Request,
  extra: Record<string, unknown> = {}
): void {
  try {
    const surface = surfaceFor(route);
    // proxy.ts already counted this machine-doc request.
    if (surface === 'doc' && req.headers.get(EDGE_LOGGED_HEADER) !== null) return;
    record(route, surface, req, extra);
  } catch {
    // logging must never break the request
  }
}

/**
 * Logs one machine-doc request from proxy.ts, which sees every hit including
 * the ones served from cache. Synchronous and never throws.
 */
export function logEdgeDoc(
  route: string,
  req: Request,
  extra: Record<string, unknown> = {}
): void {
  try {
    record(route, 'doc', req, extra);
  } catch {
    // logging must never break the request
  }
}
