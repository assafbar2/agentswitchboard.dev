/**
 * In-memory fixed-window rate limits for the public MCP endpoint.
 *
 * Counts live in one server instance's memory, so on Vercel each instance
 * keeps its own window and a cold start resets it. That bounds a single
 * noisy client and caps submit spam per instance; it is not a global quota.
 * A Vercel Firewall rate-limit rule on /api/mcp is the durable layer.
 */

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export interface RateLimiter {
  take(key: string, now?: number): RateLimitResult;
}

interface Window {
  start: number;
  count: number;
}

export function fixedWindowLimiter(options: {
  limit: number;
  windowMs: number;
  /** Oldest keys are dropped past this, so memory stays bounded under key churn. */
  maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs, maxKeys = 10_000 } = options;
  const windows = new Map<string, Window>();

  return {
    take(key, now = Date.now()) {
      let w = windows.get(key);
      if (!w || now - w.start >= windowMs) {
        windows.delete(key);
        w = { start: now, count: 0 };
        windows.set(key, w);
        while (windows.size > maxKeys) {
          const oldest = windows.keys().next().value;
          if (oldest === undefined) break;
          windows.delete(oldest);
        }
      }
      if (w.count >= limit) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((w.start + windowMs - now) / 1000)) };
      }
      w.count += 1;
      return { ok: true, remaining: limit - w.count };
    },
  };
}

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

function header(headers: HeaderSource, name: string): string | undefined {
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The caller's IP as Vercel reports it. Vercel overwrites x-forwarded-for
 * with the real client address, so its first entry is trustworthy there.
 * Assistant platforms (Grok, Claude, ChatGPT) call from their own servers,
 * so one IP can stand for many of their users.
 */
export function clientIp(headers: HeaderSource): string {
  const forwarded = header(headers, 'x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || header(headers, 'x-real-ip')?.trim() || 'unknown';
}
