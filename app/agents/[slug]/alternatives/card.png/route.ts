import { getEveryAgent } from '@/lib/catalog';
import { renderAlternativesCard } from '@/lib/og';
import { alternativesPage } from '@/lib/related';
import { alternativesCard } from '@/lib/share-cards';

export const dynamicParams = false;

export async function generateStaticParams() {
  const agents = await getEveryAgent();
  return agents.filter((a) => alternativesPage(a, agents)).map((a) => ({ slug: a.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const agents = await getEveryAgent();
  const agent = agents.find((a) => a.slug === slug);
  const alternatives = agent && alternativesPage(agent, agents);
  if (!agent || !alternatives) return new Response('Not found', { status: 404 });
  return renderAlternativesCard(alternativesCard(agent, alternatives));
}
