import { getAllCategories, getEveryAgent } from '@/lib/catalog';
import { renderSiteCard } from '@/lib/og';
import { siteCard } from '@/lib/share-cards';

export const dynamic = 'force-static';

export async function GET() {
  // Sequential on purpose: each call reads the whole catalog from disk.
  const agents = await getEveryAgent();
  const categories = await getAllCategories();
  return renderSiteCard(siteCard(agents, categories));
}
