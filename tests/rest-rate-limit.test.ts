import { describe, expect, it, vi } from 'vitest';
import { GET as categories } from '@/app/api/categories/route';
import { GET as recommend } from '@/app/api/recommend/route';
import { GET as homeAnswer } from '@/app/home/answer/route';
import { REST_REQUESTS_PER_MINUTE, TEST_REQUESTS_PER_MINUTE, restRateLimit } from '@/lib/rest-rate-limit';

vi.spyOn(console, 'log').mockImplementation(() => {});

function request(ip: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/agents', { headers: { 'x-forwarded-for': ip, ...headers } });
}

function spend(ip: string, n: number, headers: Record<string, string> = {}): void {
  for (let i = 0; i < n; i++) expect(restRateLimit('/api/agents', request(ip, headers))).toBeNull();
}

describe('restRateLimit', () => {
  it('lets 110 a minute through per IP, then answers 429 with Retry-After and a JSON error', async () => {
    expect(REST_REQUESTS_PER_MINUTE).toBe(110);
    spend('203.0.113.10', REST_REQUESTS_PER_MINUTE);
    const res = restRateLimit('/api/agents', request('203.0.113.10'));
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(res?.headers.get('cache-control')).toBe('no-store');
    expect(res?.headers.get('access-control-allow-origin')).toBe('*');
    expect(res?.headers.get('access-control-expose-headers')).toBe('Retry-After');
    expect(await res?.json()).toMatchObject({ error: 'rate_limited', retryAfterSeconds: expect.any(Number) });

    expect(restRateLimit('/api/agents', request('203.0.113.11'))).toBeNull();
  });

  it("gives the site's own test traffic its own, larger window", () => {
    spend('203.0.113.20', REST_REQUESTS_PER_MINUTE);
    expect(restRateLimit('/api/agents', request('203.0.113.20'))?.status).toBe(429);
    spend('203.0.113.20', REST_REQUESTS_PER_MINUTE * 2, { 'x-asb-e2e': '1' });
    spend('203.0.113.21', TEST_REQUESTS_PER_MINUTE, { 'user-agent': 'asb-audit' });
    expect(restRateLimit('/api/agents', request('203.0.113.21', { 'user-agent': 'asb-audit' }))?.status).toBe(429);
  });

  it('runs before a REST route does any work', async () => {
    const ip = '203.0.113.30';
    spend(ip, REST_REQUESTS_PER_MINUTE);
    const res = await categories(new Request('http://localhost/api/categories', { headers: { 'x-forwarded-for': ip } }));
    expect(res.status).toBe(429);
    expect((await categories(new Request('http://localhost/api/categories', { headers: { 'x-forwarded-for': '203.0.113.31' } }))).status).toBe(200);
  });

  it('enforces the limit on /api/recommend and /home/answer', async () => {
    const recIp = '203.0.113.40';
    spend(recIp, REST_REQUESTS_PER_MINUTE);
    const recLimited = await recommend(
      new Request('http://localhost/api/recommend?need=query+Postgres', { headers: { 'x-forwarded-for': recIp } })
    );
    expect(recLimited.status).toBe(429);
    expect(Number(recLimited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await recLimited.json()).toMatchObject({ error: 'rate_limited' });

    const homeIp = '203.0.113.50';
    spend(homeIp, REST_REQUESTS_PER_MINUTE);
    const homeLimited = await homeAnswer(
      new Request('http://localhost/home/answer?need=query+Postgres', { headers: { 'x-forwarded-for': homeIp } })
    );
    expect(homeLimited.status).toBe(429);
    expect(Number(homeLimited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await homeLimited.json()).toMatchObject({ error: 'rate_limited' });
  });
});
