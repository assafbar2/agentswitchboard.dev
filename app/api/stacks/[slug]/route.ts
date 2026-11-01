/**
 * One stack by slug.
 *
 *   GET /api/stacks/<slug>
 *   → { slug, title, promise, week, url, items }, as in GET /api/stacks
 *
 * Read-only, no auth, open CORS. 404 when the slug is unknown.
 */

import { getEveryAgent } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import { corsPreflight, jsonResponse, summarizeStack } from '@/lib/public-api';
import { getStack, stackEntries } from '@/lib/stacks';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  logConsumer('/api/stacks/[slug]', req, { slug });

  const stack = getStack(slug);
  if (!stack) {
    return jsonResponse(
      { error: 'not_found', message: `No stack with slug "${slug}". GET /api/stacks lists every stack.` },
      404
    );
  }

  return jsonResponse(summarizeStack(stack, stackEntries(stack, await getEveryAgent())));
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
