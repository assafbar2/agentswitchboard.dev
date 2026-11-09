import { getAgentBySlug, getEveryAgent } from '@/lib/catalog';
import { renderListingCard } from '@/lib/og';
import { listingCard } from '@/lib/share-cards';

export const dynamicParams = false;

export async function generateStaticParams() {
  const agents = await getEveryAgent();
  return agents.map((a) => ({ slug: a.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const agent = await getAgentBySlug((await context.params).slug);
  if (!agent) return new Response('Not found', { status: 404 });
  return renderListingCard(listingCard(agent));
}
