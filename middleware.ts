import { NextResponse, type NextRequest } from 'next/server';

/**
 * Markdown content negotiation for the homepage.
 *
 * Deliberately narrow: the matcher below limits this to `/` alone, and any
 * request that does not explicitly prefer text/markdown falls straight through
 * to the normal HTML response. The only unconditional change is the Vary
 * header, which is required once one URL can answer in two formats — without
 * it a CDN can hand an agent the cached HTML, or a browser the cached Markdown.
 */
export function middleware(request: NextRequest) {
  const accept = request.headers.get('accept') ?? '';
  const wantsMarkdown =
    accept.includes('text/markdown') && !accept.includes('text/html');

  const response = wantsMarkdown
    ? NextResponse.rewrite(new URL('/index.md', request.url))
    : NextResponse.next();

  response.headers.set('Vary', 'Accept, Accept-Encoding');
  return response;
}

export const config = {
  matcher: '/',
};
