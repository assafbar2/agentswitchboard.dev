import { describe, expect, it } from 'vitest';
import { clientIp, fixedWindowLimiter } from '@/lib/rate-limit';

describe('fixedWindowLimiter', () => {
  it('allows up to the limit in a window, then reports when to retry', () => {
    const limiter = fixedWindowLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.take('a', 0)).toEqual({ ok: true, remaining: 1 });
    expect(limiter.take('a', 1_000)).toEqual({ ok: true, remaining: 0 });
    expect(limiter.take('a', 15_000)).toEqual({ ok: false, retryAfterSeconds: 45 });
  });

  it('keeps separate counts per key and resets after the window', () => {
    const limiter = fixedWindowLimiter({ limit: 1, windowMs: 1_000 });
    expect(limiter.take('a', 0).ok).toBe(true);
    expect(limiter.take('b', 0).ok).toBe(true);
    expect(limiter.take('a', 500).ok).toBe(false);
    expect(limiter.take('a', 1_000).ok).toBe(true);
  });

  it('stays bounded in memory by dropping the oldest keys', () => {
    const limiter = fixedWindowLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2 });
    limiter.take('a', 0);
    limiter.take('b', 0);
    limiter.take('c', 0);
    // 'a' was evicted, so it starts a fresh window.
    expect(limiter.take('a', 1).ok).toBe(true);
    expect(limiter.take('c', 1).ok).toBe(false);
  });
});

describe('clientIp', () => {
  it('uses the first x-forwarded-for entry', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then "unknown"', () => {
    expect(clientIp({ 'x-real-ip': '198.51.100.2' })).toBe('198.51.100.2');
    expect(clientIp({})).toBe('unknown');
  });
});
