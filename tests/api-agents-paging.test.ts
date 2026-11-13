import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/agents/route';
import { DEFAULT_LIMIT, MAX_LIMIT } from '@/lib/public-api';

type Body = { total: number; offset: number; limit: number; next: string | null; agents: { slug: string }[] };

async function get(query: string): Promise<Body> {
  const res = await GET(new Request(`http://localhost/api/agents${query}`));
  expect(res.status).toBe(200);
  return res.json();
}

const slugs = (body: Body) => body.agents.map((a) => a.slug);

describe('GET /api/agents paging', () => {
  it('keeps the default page size and cap', async () => {
    const body = await get('');
    expect(body.limit).toBe(DEFAULT_LIMIT);
    expect(body.agents).toHaveLength(DEFAULT_LIMIT);
    expect((await get('?limit=1000')).limit).toBe(MAX_LIMIT);
  });

  it('page steps offset by limit, and offset wins when both are sent', async () => {
    const byOffset = await get('?limit=5&offset=10');
    const byPage = await get('?limit=5&page=3');
    expect(byPage.offset).toBe(10);
    expect(slugs(byPage)).toEqual(slugs(byOffset));
    expect((await get('?limit=5&page=3&offset=0')).offset).toBe(0);
    expect((await get('?limit=5&page=0')).offset).toBe(0);
  });

  it('next is the same query one page on, null on the last page', async () => {
    const first = await get('?access=mcp&limit=20&page=1');
    expect(first.next).not.toBeNull();
    const next = new URL(first.next!);
    expect(next.pathname).toBe('/api/agents');
    expect(Object.fromEntries(next.searchParams)).toEqual({ access: 'mcp', limit: '20', offset: '20' });
    const second = await get(`?${next.searchParams}`);
    expect(second.offset).toBe(20);
    expect(slugs(second)).not.toContain(slugs(first)[0]);

    const lastPage = Math.ceil(first.total / 20);
    expect((await get(`?access=mcp&limit=20&page=${lastPage}`)).next).toBeNull();
    expect((await get(`?access=mcp&limit=20&page=${lastPage + 5}`)).agents).toEqual([]);
  });

  it('following next from the start visits every match once', async () => {
    const seen: string[] = [];
    let body = await get('?verified=true&limit=50');
    const total = body.total;
    for (;;) {
      seen.push(...slugs(body));
      if (!body.next) break;
      body = await get(new URL(body.next).search);
    }
    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);
  });
});
