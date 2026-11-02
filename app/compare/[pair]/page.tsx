import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { CompareView } from '@/components/CompareView';
import { getEveryAgent } from '@/lib/catalog';
import { compareSuggestions, compareTitle, curatedComparisons, pairPath } from '@/lib/compare';
import { pageMetadata } from '@/lib/metadata';
import { compareCard, comparisonCardImage } from '@/lib/share-cards';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

// Curated comparisons only: proxy.ts sends any other <a>-vs-<b> to its /compare link.
export const dynamicParams = false;

export async function generateStaticParams() {
  return curatedComparisons(await getEveryAgent()).map((c) => ({ pair: c.slug }));
}

interface Props {
  params: Promise<{ pair: string }>;
}

async function load(pair: string) {
  const catalog = await getEveryAgent();
  const comparisons = curatedComparisons(catalog);
  return { catalog, comparisons, curated: comparisons.find((c) => c.slug === pair) ?? null };
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { curated } = await load((await params).pair);
  if (!curated) return { title: 'Comparison Not Found' };
  return pageMetadata(
    {
      title: compareTitle(curated.agents),
      description: curated.intro,
      path: pairPath(curated.items),
      image: comparisonCardImage(curated.items, compareCard(curated.agents)),
    },
    parent
  );
}

export default async function CuratedComparisonPage({ params }: Props) {
  const { catalog, comparisons, curated } = await load((await params).pair);
  if (!curated) notFound();
  const path = pairPath(curated.items);
  return (
    <CompareView
      agents={curated.agents}
      notes={[]}
      curated={curated}
      suggestions={compareSuggestions(curated.agents, catalog)}
      comparisons={comparisons}
      path={path}
      url={`${BASE_URL}${path}`}
    />
  );
}
