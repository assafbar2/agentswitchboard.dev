import { describe, expect, it } from 'vitest';
import { GET as indexGET } from '@/app/agents.json/route';
import { GET as pageGET, generateStaticParams } from '@/app/catalog/[file]/route';
import { getEveryAgent } from '@/lib/catalog';
import { CATALOG_PAGE_SIZE, catalogPageOf } from '@/lib/catalog-dump';

const pageAt = (file: string) =>
  pageGET(new Request(`http://localhost/catalog/${file}`), { params: Promise.resolve({ file }) });

const pathOf = (url: string) => new URL(url).pathname.slice('/catalog/'.length);

describe('/agents.json and /catalog/<n>.json', () => {
  it('the index is small, carries the total and links every page, the API and MCP', async () => {
    const res = await indexGET();
    const text = await res.text();
    const index = JSON.parse(text);
    const every = await getEveryAgent();
    expect(text.length).toBeLessThan(10_000);
    expect(index).not.toHaveProperty('agents');
    expect(index.schemaVersion).toBe(2);
    expect(index.total).toBe(every.length);
    expect(index.pageSize).toBe(CATALOG_PAGE_SIZE);
    expect(index.pageCount).toBe(Math.ceil(every.length / CATALOG_PAGE_SIZE));
    expect(index.pages).toHaveLength(index.pageCount);
    expect(index.pages[0]).toMatch(/\/catalog\/1\.json$/);
    expect(index.search.rest).toMatch(/\/api\/agents\?limit=50&page=1$/);
    expect(index.search.mcp).toMatch(/\/api\/mcp$/);
    expect(index.description).toContain('Sponsored');
  });

  it('the pages, in order, are the whole catalog once, at most 50 each, chained by next', async () => {
    const index = await (await indexGET()).json();
    const params = await generateStaticParams();
    expect(params.map((p) => p.file)).toEqual(index.pages.map(pathOf));

    const slugs: string[] = [];
    let url: string | null = index.pages[0];
    for (let n = 1; url; n++) {
      const page = await (await pageAt(pathOf(url))).json();
      expect(page.page).toBe(n);
      expect(page.total).toBe(index.total);
      expect(page.agents.length).toBeLessThanOrEqual(CATALOG_PAGE_SIZE);
      expect(page.agents.length).toBeGreaterThan(0);
      expect(page.prev).toBe(n === 1 ? null : index.pages[n - 2]);
      slugs.push(...page.agents.map((a: { slug: string }) => a.slug));
      url = page.next;
    }
    expect(slugs).toEqual((await getEveryAgent()).map((a) => a.slug));
  });

  it('a page carries the full listing fields', async () => {
    const [first] = (await (await pageAt('1.json')).json()).agents;
    for (const key of ['url', 'iconUrl', 'homepage', 'providerUrl', 'tags', 'officialVendor', 'sponsored', 'createdAt', 'updatedAt']) {
      expect(first).toHaveProperty(key);
    }
    expect(first).not.toHaveProperty('skills');
  });

  it('every listing carries its auth type, so no-auth tools can be picked out', async () => {
    const { pages } = await (await indexGET()).json();
    const listings = (await Promise.all(pages.map(async (url: string) => (await (await pageAt(pathOf(url))).json()).agents))).flat();
    const byAuth = new Map((await getEveryAgent()).map((a) => [a.slug, a.authType]));
    for (const a of listings) expect(a.authType, a.slug).toBe(byAuth.get(a.slug));
    expect(listings.some((a: { authType: string }) => a.authType === 'none')).toBe(true);
  });

  it('is cached until the next release, not for five minutes', async () => {
    for (const res of [await indexGET(), await pageAt('1.json')]) {
      expect(res.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=86400');
    }
  });

  it('any other file is a 404', async () => {
    const { pageCount } = await (await indexGET()).json();
    for (const file of ['0.json', '01.json', `${pageCount + 1}.json`, '1', 'all.json', '-1.json']) {
      expect((await pageAt(file)).status, file).toBe(404);
    }
    expect(catalogPageOf('2.json', 3)).toBe(2);
  });
});
