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

/**
 * Anthropic's published outbound range for MCP tool calls, stable and
 * announced before it changes: https://platform.claude.com/docs/en/api/ip-addresses.
 * Every Claude user of a directory-listed connector arrives from these
 * addresses, so they get a larger per-IP budget than a single client.
 * OpenAI's ChatGPT ranges are hundreds of small prefixes that change without
 * a schedule, so they are not listed here.
 */
export const ASSISTANT_PLATFORM_CIDRS = ['160.79.104.0/21'] as const;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    n = n * 256 + Number(part);
  }
  return n;
}

/** Whether an IPv4 address falls inside a CIDR block; false for anything unparseable. */
export function inCidr(ip: string, cidr: string): boolean {
  const [base, bitsText] = cidr.split('/');
  const addr = ipv4ToInt(ip);
  const start = ipv4ToInt(base);
  const bits = Number(bitsText);
  if (addr === null || start === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const size = 2 ** (32 - bits);
  return Math.floor(addr / size) === Math.floor(start / size);
}

export function isAssistantPlatformIp(ip: string): boolean {
  return ASSISTANT_PLATFORM_CIDRS.some((cidr) => inCidr(ip, cidr));
}
