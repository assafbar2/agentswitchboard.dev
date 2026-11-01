/**
 * Every stack: listings that together do one job (content/stacks.json).
 *
 *   GET /api/stacks
 *   → { total, stackOfTheWeek, stacks: [ { slug, title, promise, week, url,
 *       items: [ { the search-result fields, authType, why } ] } ] }
 *
 * In the order /stacks shows them, the stack of the week first. Read-only,
 * no auth, open CORS.
 */

import { getEveryAgent } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import { corsPreflight, jsonResponse, summarizeStack } from '@/lib/public-api';
import { getStacks, stackEntries, stackOfTheWeek, stacksInOrder } from '@/lib/stacks';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  logConsumer('/api/stacks', req);
  const stacks = getStacks();
  const catalog = await getEveryAgent();
  return jsonResponse({
    total: stacks.length,
    stackOfTheWeek: stackOfTheWeek(stacks)?.slug ?? null,
    stacks: stacksInOrder(stacks).map((s) => summarizeStack(s, stackEntries(s, catalog))),
  });
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
