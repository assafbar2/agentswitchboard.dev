import type { MetadataRoute } from 'next';
import { getEveryAgent, getAllCategories } from '@/lib/catalog';
import { getReleases } from '@/lib/changelog';
import { curatedComparisons } from '@/lib/compare';
import { getDropSchedule } from '@/lib/drops';
import { alternativesPage } from '@/lib/related';
import { taskMatches } from '@/lib/search';
import { getStacks, stackEntries } from '@/lib/stacks';
import { getTasks } from '@/lib/tasks';
import type { Agent } from '@/lib/types';

const changed = (agent: Agent) => agent.updatedAt ?? agent.createdAt;

/**
 * A page's lastmod: the latest date in the content it shows, never the
 * build's. Crawlers re-fetch the pages whose lastmod moved, so a page with no
 * dated content gets none.
 */
function newest(dates: readonly (string | Date | undefined)[]): Date | undefined {
  const times = dates.map((d) => (d === undefined ? NaN : new Date(d).getTime())).filter((t) => !Number.isNaN(t));
  return times.length > 0 ? new Date(Math.max(...times)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';
  const agents = await getEveryAgent();
  const categories = await getAllCategories();
  const { drops, pending } = getDropSchedule();
  const lastDay = (changes: { days: string[] }) => changes.days[changes.days.length - 1];

  const stacks = getStacks().map((stack) => ({
    stack,
    lastModified: newest([stack.week, ...stackEntries(stack, agents).map((e) => changed(e.agent))]),
  }));
  const tasks = getTasks().map((task) => ({ task, lastModified: newest(taskMatches(agents, task).map(changed)) }));
  // Only the curated comparisons: any other /compare link is left out of search.
  const comparisons = curatedComparisons(agents).map((comparison) => ({
    comparison,
    lastModified: newest(comparison.agents.map(changed)),
  }));

  const catalog = newest(agents.map(changed));
  const released = newest(getReleases().map((r) => r.date));
  const dropped = newest(drops.map(lastDay));
  const logged = newest([dropped, pending ? lastDay(pending) : undefined]);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: newest([catalog, released, dropped]), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/browse`, lastModified: catalog, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/categories`, lastModified: catalog, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/changelog`, lastModified: newest([released, logged]), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/whats-new`, lastModified: released, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/drops`, lastModified: dropped, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/new`, lastModified: newest(agents.map((a) => a.createdAt)), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/stacks`, lastModified: newest(stacks.map((s) => s.lastModified)), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/tasks`, lastModified: newest(tasks.map((t) => t.lastModified)), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/compare`, lastModified: newest(comparisons.map((c) => c.lastModified)), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/switchboard`, lastModified: newest([catalog, dropped]), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/operator`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/submit`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/for-agents`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/connect`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/advertise`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/disclaimer`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/skill.md`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Dynamic agent pages
  const agentPages: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: `${base}/agents/${agent.slug}`,
    lastModified: newest([changed(agent)]),
    changeFrequency: 'weekly' as const,
    priority: agent.featured ? 0.9 : 0.7,
  }));

  const alternativesPages: MetadataRoute.Sitemap = agents.flatMap((agent) => {
    const alternatives = alternativesPage(agent, agents);
    if (!alternatives) return [];
    return [
      {
        url: `${base}/agents/${agent.slug}/alternatives`,
        lastModified: newest([agent, ...alternatives.map((a) => a.agent)].map(changed)),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      },
    ];
  });

  // Dynamic category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${base}/categories/${cat.slug}`,
    lastModified: newest(agents.filter((a) => a.categories.some((c) => c.slug === cat.slug)).map(changed)),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const dropPages: MetadataRoute.Sitemap = drops.map((drop) => ({
    url: `${base}/drops/${drop.date}`,
    lastModified: newest([lastDay(drop)]),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const stackPages: MetadataRoute.Sitemap = stacks.map(({ stack, lastModified }) => ({
    url: `${base}/stacks/${stack.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const taskPages: MetadataRoute.Sitemap = tasks.map(({ task, lastModified }) => ({
    url: `${base}/tasks/${task.slug}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const comparisonPages: MetadataRoute.Sitemap = comparisons.map(({ comparison, lastModified }) => ({
    url: `${base}/compare/${comparison.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...agentPages,
    ...alternativesPages,
    ...categoryPages,
    ...dropPages,
    ...stackPages,
    ...taskPages,
    ...comparisonPages,
  ];
}
