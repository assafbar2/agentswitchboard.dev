import type { NextRequest } from 'next/server';
import { getEveryAgent } from '@/lib/catalog';
import { renderStackCard } from '@/lib/og';
import { redirectToCanonicalCard } from '@/lib/card-route';
import { sharedStackCard, sharedStackCardImage } from '@/lib/share-cards';
import { entrySlug, listedAgents, requestedStackSlugs, sharedStack } from '@/lib/shared-stack';

/**
 * Drawn on request and kept only by the CDN, like a /compare card: there are
 * countless stacks. A card's URL carries ?v=, which changes whenever what the
 * card shows does, so a cached copy never goes stale.
 */
const CDN_CACHE = 'public, max-age=86400, s-maxage=31536000, immutable';

/** The card of a /stack link with the same items and title. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const stack = sharedStack(requestedStackSlugs(params.getAll('items')), params.get('title') ?? '', await getEveryAgent(), new Map());
  const agents = listedAgents(stack);
  if (agents.length === 0) return new Response('Not found', { status: 404 });
  const data = sharedStackCard(stack.title, agents);
  const redirect = redirectToCanonicalCard(request, sharedStackCardImage(stack.entries.map(entrySlug), stack.title, data).url);
  if (redirect) return redirect;
  const card = await renderStackCard(data);
  card.headers.set('Cache-Control', CDN_CACHE);
  return card;
}
