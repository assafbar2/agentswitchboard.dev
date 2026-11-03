import { NextResponse, type NextRequest } from 'next/server';

/**
 * Drawn-on-request cards (/compare, /stack and /operator card.png) render only
 * at the exact URL their page publishes, `?v=` included. Any other query (an
 * extra key, another key order, a stale v= that X still holds) is sent to that
 * URL before anything is drawn, so each card has one cache entry and junk
 * queries never reach the renderer.
 */
export function redirectToCanonicalCard(request: NextRequest, canonical: string): Response | null {
  const target = new URL(canonical, request.url);
  // Compared decoded and in order: the platform may re-encode a value (a comma
  // as %2C), which is the same card, while another key or order is not.
  const same =
    request.nextUrl.pathname === target.pathname &&
    JSON.stringify([...request.nextUrl.searchParams]) === JSON.stringify([...target.searchParams]);
  return same ? null : NextResponse.redirect(target, 307);
}
