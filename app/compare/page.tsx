import type { Metadata, ResolvingMetadata } from 'next';
import { CompareView } from '@/components/CompareView';
import { getEveryAgent, getRetiredListings } from '@/lib/catalog';
import {
  compareSuggestions,
  compareTitle,
  comparisonFor,
  curatedComparisons,
  pairPath,
  requestedSlugs,
  selectCompared,
} from '@/lib/compare';
import { compareHref } from '@/lib/compare-link';
import { pageMetadata } from '@/lib/metadata';
import { compareCard, compareCardImage, comparisonCardImage, comparisonsCard, comparisonsCardImage } from '@/lib/share-cards';
import { joinList } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function load(searchParams: Props['searchParams']) {
  const [query, catalog, retired] = await Promise.all([searchParams, getEveryAgent(), getRetiredListings()]);
  const { agents, notes } = selectCompared(requestedSlugs(query), catalog, retired);
  const comparisons = curatedComparisons(catalog);
  const slugs = agents.map((a) => a.slug);
  const curated = agents.length >= 2 ? comparisonFor(slugs, comparisons) : null;
  return { agents, notes, comparisons, curated, slugs, catalog };
}

export async function generateMetadata({ searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { agents, notes, comparisons, curated, slugs } = await load(searchParams);
  if (agents.length >= 2) {
    return pageMetadata(
      {
        title: compareTitle(agents),
        description: `${joinList(agents.map((a) => a.name))} side by side: what each does, how you connect it, the sign-in it needs, and its skills.`,
        // A curated comparison has its own page; any other mix is one of countless, so search engines skip it.
        ...(curated
          ? { path: pairPath(curated.items), image: comparisonCardImage(curated.items, compareCard(curated.agents)) }
          : { path: compareHref(slugs), image: compareCardImage(slugs, compareCard(agents)), robots: { index: false, follow: true } }),
      },
      parent
    );
  }
  return pageMetadata(
    {
      title: 'Compare AI agents side by side',
      description: 'Put up to three AI agents, MCP servers and tools side by side: what each does, how you connect it, the sign-in it needs, and its skills.',
      path: '/compare',
      image: comparisonsCardImage(comparisonsCard(comparisons.map((c) => c.agents))),
      ...((agents.length > 0 || notes.length > 0) && { robots: { index: false, follow: true } }),
    },
    parent
  );
}

export default async function ComparePage({ searchParams }: Props) {
  const { agents, notes, comparisons, curated, slugs, catalog } = await load(searchParams);
  const path = curated ? pairPath(curated.items) : compareHref(slugs);
  return (
    <CompareView
      agents={agents}
      notes={notes}
      curated={curated}
      suggestions={compareSuggestions(agents, catalog)}
      comparisons={comparisons}
      path={path}
      url={`${BASE_URL}${path}`}
    />
  );
}
