/**
 * Per-IP request budget for the public REST API (every /api/ route except
 * /api/mcp, which keeps its own larger limits in app/api/[transport]/route.ts).
 * Same in-memory fixed window as the MCP endpoint (lib/rate-limit.ts), so it
 * bounds one noisy client per instance rather than enforcing a global quota.
 * Responses served from the CDN cache never reach a route and are not counted.
 */

import { logConsumer, isOwnTestTraffic } from './log';
import { CORS_GET } from './public-api';
import { clientIp, fixedWindowLimiter } from './rate-limit';

export const REST_REQUESTS_PER_MINUTE = 120;
/**
 * Our own e2e suite and audit scripts (isOwnTestTraffic) run several workers
 * from one IP. They get a separate, larger window, still bounded because the
 * tag is just a header anyone can send.
 */
export const TEST_REQUESTS_PER_MINUTE = 3000;

const restLimiter = fixedWindowLimiter({ limit: REST_REQUESTS_PER_MINUTE, windowMs: 60_000 });
const testLimiter = fixedWindowLimiter({ limit: TEST_REQUESTS_PER_MINUTE, windowMs: 60_000 });

/**
 * Takes one request from the caller's budget. Returns the 429 to send when it
 * is spent, else null and the route carries on.
 */
export function restRateLimit(route: string, req: Request): Response | null {
  const limited = (isOwnTestTraffic(req) ? testLimiter : restLimiter).take(clientIp(req.headers));
  if (limited.ok) return null;

  logConsumer(route, req, { method: 'rate_limited' });
  const body = {
    error: 'rate_limited',
    message: `Rate limit exceeded: ${REST_REQUESTS_PER_MINUTE} requests per minute per IP. Retry after ${limited.retryAfterSeconds} seconds.`,
    retryAfterSeconds: limited.retryAfterSeconds,
  };
  return new Response(JSON.stringify(body, null, 2), {
    status: 429,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': String(limited.retryAfterSeconds),
      ...CORS_GET,
      'Access-Control-Expose-Headers': 'Retry-After',
    },
  });
}
