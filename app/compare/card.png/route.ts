import type { NextRequest } from 'next/server';
import { getEveryAgent } from '@/lib/catalog';
import { curatedComparisons, requestedSlugs, selectCompared } from '@/lib/compare';
import { renderCompareCard, renderComparisonsCard } from '@/lib/og';
import { redirectToCanonicalCard } from '@/lib/card-route';
import { compareCard, compareCardImage, comparisonsCard, comparisonsCardImage } from '@/lib/share-cards';

/**
 * Drawn on request and kept only by the CDN, never in the build's cache: there
 * are countless mixes. A card's URL carries ?v=, which changes whenever what
 * the card shows does, so a cached copy never goes stale.
 */
const CDN_CACHE = 'public, max-age=86400, s-maxage=31536000, immutable';

/** The card of /compare, or with a=, b= and c=, of that /compare link. */
export async function GET(request: NextRequest) {
  const catalog = await getEveryAgent();
  const requested = requestedSlugs(request.nextUrl.searchParams);
  let card: Response;
  if (requested.length === 0) {
    const data = comparisonsCard(curatedComparisons(catalog).map((c) => c.agents));
    const redirect = redirectToCanonicalCard(request, comparisonsCardImage(data).url);
    if (redirect) return redirect;
    card = await renderComparisonsCard(data);
  } else {
    const { agents } = selectCompared(requested, catalog, new Map());
    if (agents.length < 2) return new Response('Not found', { status: 404 });
    const data = compareCard(agents);
    const redirect = redirectToCanonicalCard(request, compareCardImage(agents.map((a) => a.slug), data).url);
    if (redirect) return redirect;
    card = await renderCompareCard(data);
  }
  card.headers.set('Cache-Control', CDN_CACHE);
  return card;
}
