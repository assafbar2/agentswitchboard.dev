import type { NextRequest } from 'next/server';
import { getEveryAgent } from '@/lib/catalog';
import { renderOperatorCard } from '@/lib/og';
import { putThrough } from '@/lib/operator';
import { OPERATOR_EXAMPLES } from '@/lib/request-parts';
import { operatorCard } from '@/lib/share-cards';
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
  const operator = putThrough(q ?? OPERATOR_EXAMPLES[0], getTasks(), await getEveryAgent());
  if (operator.stack.length === 0) return new Response('Not found', { status: 404 });
  const card = await renderOperatorCard(operatorCard(operator, q === null));
  card.headers.set('Cache-Control', CDN_CACHE);
  return card;
}
