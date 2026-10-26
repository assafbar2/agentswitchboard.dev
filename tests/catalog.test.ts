import * as fs from 'fs';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAllCategories, getEveryAgent, MAX_CONCURRENT_READS } from '@/lib/catalog';
import { vendorForUrl, type OfficialVendor } from '@/lib/official';
import type { Agent, Category } from '@/lib/types';

/**
 * The catalog loader used to open every agent file at once and re-read
 * categories.json once per agent file: ~1,700 descriptors at peak, which hit
 * EMFILE (HTTP 500 on /index.md) under a 1,024 limit. Outside a React render
 * (tests, route handlers) cache() does not memoise, so every call here is a
 * fresh filesystem pass — exactly the route-handler case.
 */

const CONTENT = path.join(process.cwd(), 'content');
const AGENTS_DIR = path.join(CONTENT, 'agents');
const realReadFile = fs.promises.readFile;

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/** The loader's documented semantics, computed independently and synchronously. */
function referenceCatalog(): Agent[] {
  const cats = readJson<Category[]>(path.join(CONTENT, 'categories.json'));
  const vendors = readJson<OfficialVendor[]>(path.join(CONTENT, 'official-vendors.json'));
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = readJson<Record<string, unknown> & { agentUrl: string; official?: boolean; categories?: string[] }>(
        path.join(AGENTS_DIR, f)
      );
      const vendor = data.official ? vendorForUrl(data.agentUrl, vendors) : null;
      return {
        ...data,
        categories: (data.categories ?? []).map((slug) => bySlug.get(slug)).filter(Boolean),
        tags: data.tags ?? [],
        skills: data.skills ?? [],
        accessMethods: data.accessMethods ?? [],
        official: !!vendor,
        officialVendor: vendor ? { slug: vendor.slug, name: vendor.name } : undefined,
      } as Agent;
    })
    .filter((a) => a.status === 'published')
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
}

/** Spy on fs.promises.readFile, counting reads per file and peak agent reads in flight. */
function watchReads() {
  const reads = new Map<string, number>();
  let inFlight = 0;
  let peak = 0;
  vi.spyOn(fs.promises, 'readFile').mockImplementation((async (
    file: Parameters<typeof realReadFile>[0],
    options?: Parameters<typeof realReadFile>[1]
  ) => {
    const name = String(file);
    reads.set(name, (reads.get(name) ?? 0) + 1);
    const isAgent = name.startsWith(AGENTS_DIR + path.sep);
    if (isAgent) peak = Math.max(peak, ++inFlight);
    try {
      // Yield first so reads overlap as they would on a slow disk.
      await new Promise((resolve) => setImmediate(resolve));
      return await realReadFile(file, options);
    } finally {
      if (isAgent) inFlight--;
    }
  }) as typeof realReadFile);
  return {
    count: (file: string) => reads.get(file) ?? 0,
    agentReads: () => [...reads.keys()].filter((f) => f.startsWith(AGENTS_DIR + path.sep)),
    peak: () => peak,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('catalog loading', () => {
  it('reads categories.json and official-vendors.json once per catalog load', async () => {
    const reads = watchReads();
    await getEveryAgent();
    expect(reads.count(path.join(CONTENT, 'categories.json'))).toBe(1);
    expect(reads.count(path.join(CONTENT, 'official-vendors.json'))).toBe(1);
  });

  it('reads each agent file exactly once', async () => {
    const reads = watchReads();
    await getEveryAgent();
    const agentFiles = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.json'));
    expect(reads.agentReads()).toHaveLength(agentFiles.length);
    for (const f of agentFiles) expect(reads.count(path.join(AGENTS_DIR, f))).toBe(1);
  });

  it(`never has more than ${MAX_CONCURRENT_READS} agent files open, even across concurrent loads`, async () => {
    const reads = watchReads();
    const results = await Promise.all([getEveryAgent(), getEveryAgent(), getEveryAgent(), getAllCategories()]);
    expect(reads.peak()).toBeGreaterThan(1);
    expect(reads.peak()).toBeLessThanOrEqual(MAX_CONCURRENT_READS);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
  });

  it('returns the same agents, hydration and order as before', async () => {
    const expected = referenceCatalog();
    const agents = await getEveryAgent();
    expect(agents.length).toBeGreaterThan(800);
    expect(agents.map((a) => a.slug)).toEqual(expected.map((a) => a.slug));
    expect(agents).toEqual(expected);
    // Categories are hydrated objects, never bare slugs.
    expect(agents.every((a) => a.categories.every((c) => typeof c === 'object' && 'name' in c))).toBe(true);
  });

  it('counts category membership over published agents', async () => {
    const expected = referenceCatalog();
    const categories = await getAllCategories();
    for (const cat of categories) {
      const count = expected.filter((a) => a.categories.some((c) => c.slug === cat.slug)).length;
      expect(cat.agentCount, cat.slug).toBe(count);
    }
    const order = categories.map((c) => c.sortOrder);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('surfaces a failed read instead of hanging', async () => {
    vi.spyOn(fs.promises, 'readFile').mockImplementation((async (
      file: Parameters<typeof realReadFile>[0],
      options?: Parameters<typeof realReadFile>[1]
    ) => {
      if (String(file).startsWith(AGENTS_DIR + path.sep)) {
        throw Object.assign(new Error('EMFILE: too many open files'), { code: 'EMFILE' });
      }
      return realReadFile(file, options);
    }) as typeof realReadFile);
    await expect(getEveryAgent()).rejects.toThrow('EMFILE');
    vi.restoreAllMocks();
    // The read slots were all released: a later load still completes.
    await expect(getEveryAgent()).resolves.toHaveLength(referenceCatalog().length);
  });
});
