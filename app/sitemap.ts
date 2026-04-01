import type { MetadataRoute } from 'next';
import { getAllAgents, getAllCategories } from '@/lib/contentful';

export const revalidate = 3600; // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/submit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/disclaimer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Dynamic agent pages
  const { agents } = await getAllAgents({ limit: 1000 });
  const agentPages: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: `${base}/agents/${agent.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: agent.featured ? 0.9 : 0.7,
  }));

  // Dynamic category pages
  const categories = await getAllCategories();
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${base}/categories/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...agentPages, ...categoryPages];
}
