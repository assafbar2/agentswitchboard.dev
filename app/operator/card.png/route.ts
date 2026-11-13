import type { NextRequest } from 'next/server';
import { getOrganicAgents } from '@/lib/catalog';
import { renderOperatorCard } from '@/lib/og';
import { putThrough } from '@/lib/operator';
import { redirectToCanonicalCard } from '@/lib/card-route';
import { OPERATOR_EXAMPLES, cleanRequest } from '@/lib/request-parts';
import { operatorCard, operatorCardImage } from '@/lib/share-cards';
import { getTasks } from '@/lib/tasks';

/**
 * Drawn on request and kept only by the CDN, like a /stack card: there are
 * countless requests. A card's URL carries ?v=, which changes whenever what
 * the card shows does, so a cached copy never goes stale.
 */
const CDN_CACHE = 'public, max-age=86400, s-maxage=31536000, immutable';

/** The card of /operator with the same request, or without one of its example. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  const operator = putThrough(q ?? OPERATOR_EXAMPLES[0], getTasks(), await getOrganicAgents());
  if (operator.stack.length === 0) return new Response('Not found', { status: 404 });
  const data = operatorCard(operator, q === null);
  const redirect = redirectToCanonicalCard(request, operatorCardImage(q === null ? null : cleanRequest(q).text, data).url);
  if (redirect) return redirect;
  const card = await renderOperatorCard(data);
  card.headers.set('Cache-Control', CDN_CACHE);
  return card;
}
