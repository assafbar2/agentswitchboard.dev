import type { MetadataRoute } from 'next';
import { beforeAll, describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import { getEveryAgent } from '@/lib/catalog';
import { getReleases } from '@/lib/changelog';
import { getDropSchedule } from '@/lib/drops';
import { getStacks } from '@/lib/stacks';

const pathOf = (url: string) => new URL(url).pathname;
const time = (date: string | Date) => new Date(date).getTime();

describe('sitemap lastmod', () => {
  let entries: MetadataRoute.Sitemap;
  beforeAll(async () => {
    entries = await sitemap();
  });

  it('dates each listing by its own file', async () => {
    const byPath = new Map(entries.map((e) => [pathOf(e.url), e]));
    for (const agent of await getEveryAgent()) {
      const date = agent.updatedAt ?? agent.createdAt;
      expect(byPath.get(`/agents/${agent.slug}`)?.lastModified, agent.slug).toEqual(date ? new Date(date) : undefined);
    }
  });

  it('takes every date from the content files, never the build', async () => {
    const { drops, pending } = getDropSchedule();
    const dates = [
      ...(await getEveryAgent()).flatMap((a) => [a.createdAt, a.updatedAt]),
      ...getReleases().map((r) => r.date),
      ...[...drops, ...(pending ? [pending] : [])].flatMap((d) => d.days),
      ...getStacks().map((s) => s.week),
    ];
    const known = new Set(dates.flatMap((d) => (d ? [time(d)] : [])));
    const dated = entries.filter((e) => e.lastModified !== undefined);
    expect(dated.length).toBeGreaterThan(1000);
    for (const { url, lastModified } of dated) expect(known.has(time(lastModified!)), url).toBe(true);
  });

  it('dates a category by the newest listing in it', async () => {
    const agents = await getEveryAgent();
    const slug = agents[0].categories[0].slug;
    const members = agents.filter((a) => a.categories.some((c) => c.slug === slug));
    const latest = Math.max(...members.map((a) => time(a.updatedAt ?? a.createdAt!)));
    const entry = entries.find((e) => pathOf(e.url) === `/categories/${slug}`);
    expect(entry?.lastModified).toEqual(new Date(latest));
  });

  it('leaves lastmod off the pages no content dates', async () => {
    const byPath = new Map(entries.map((e) => [pathOf(e.url), e]));
    for (const path of ['/about', '/terms', '/privacy', '/operator', '/skill.md']) {
      expect(byPath.get(path), path).toBeDefined();
      expect(byPath.get(path)?.lastModified, path).toBeUndefined();
    }
  });
});
