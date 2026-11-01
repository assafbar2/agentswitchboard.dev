import { getAllCategories, getCategoryBySlug, getEveryAgent } from '@/lib/catalog';
import { renderCategoryCard } from '@/lib/og';
import { categoryCard } from '@/lib/share-cards';

export const dynamicParams = false;

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  // Sequential on purpose: each call reads the whole catalog from disk.
  const result = await getCategoryBySlug((await context.params).slug);
  if (!result) return new Response('Not found', { status: 404 });
  const catalog = await getEveryAgent();
  return renderCategoryCard(categoryCard(result.category, result.agents, catalog));
}
