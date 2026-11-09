import { getEveryAgent } from '@/lib/catalog';
import { curatedComparisons } from '@/lib/compare';
import { renderCompareCard } from '@/lib/og';
import { compareCard } from '@/lib/share-cards';

// Curated comparisons only. Any other mix's card is /compare/card.png?a=&b=&c=.
export const dynamicParams = false;

export async function generateStaticParams() {
  return curatedComparisons(await getEveryAgent()).map((c) => ({ pair: c.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ pair: string }> }) {
  const { pair } = await context.params;
  const curated = curatedComparisons(await getEveryAgent()).find((c) => c.slug === pair);
  if (!curated) return new Response('Not found', { status: 404 });
  return renderCompareCard(compareCard(curated.agents));
}
