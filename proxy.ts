import { NextResponse, type NextRequest } from 'next/server';
import { EDGE_LOGGED_HEADER, logEdgeDoc } from '@/lib/log';

/**
 * Runs before routing (Next 16 renamed the `middleware` convention to
 * `proxy`). Two jobs, both narrow:
 *
 * 1. Markdown content negotiation for the homepage. Any request for `/` that
 *    does not explicitly prefer text/markdown falls straight through to the
 *    normal HTML response. The only unconditional change is the Vary header,
 *    which is required once one URL can answer in two formats — without it a
 *    CDN can hand an agent the cached HTML, or a browser the cached Markdown.
 *
 * 2. Counting machine-doc reads. These docs are static or CDN-cached, so their
 *    route code does not run per request and cannot log them. The proxy sees
 *    every hit: it logs one line synchronously, leaves the analytics event to
 *    after(), and never changes the response, so caching is unaffected.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    const accept = request.headers.get('accept') ?? '';
    const wantsMarkdown =
      accept.includes('text/markdown') && !accept.includes('text/html');

    const response = wantsMarkdown
      ? NextResponse.rewrite(new URL('/index.md', request.url))
      : NextResponse.next();

    response.headers.set('Vary', 'Accept, Accept-Encoding');
    if (wantsMarkdown && request.method === 'GET') logEdgeDoc('/', request);
    return response;
  }

  // Count reads only: CORS preflights and HEAD checks are not consumption.
  if (request.method !== 'GET') return NextResponse.next();

  logEdgeDoc(pathname, request);

  // Tell a route handler behind this (e.g. /agents.json) that the hit is
  // already counted. Upstream request headers only; the response is untouched.
  const forwarded = new Headers(request.headers);
  forwarded.set(EDGE_LOGGED_HEADER, '1');
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
  matcher: [
    '/',
    '/llms.txt',
    '/agents.json',
    '/index.md',
    '/skill.md',
    '/SKILL.md',
    '/openapi.json',
    '/.well-known/:path*',
  ],
};
