/**
 * The connect bundle: one MCP client config for every listing named whose
 * docs give a server address or command, and how to connect the rest.
 *
 *   GET /api/bundle?items=<slug>,<slug>,…   (1 to 10, as on a /stack link)
 *   → { summary, stackUrl, config: { mcpServers } | null, claudeCode: [string],
 *        setupPrompt, items: [ { …search-result fields, authType,
 *        how: config|guide|other, server, docsUrl, note } ], notes: [string] }
 *
 * The same `items` as a shared stack, so a /stack link becomes the API call
 * with /api/bundle in place of /stack. Unknown or repeated slugs, listings no
 * longer listed and any past ten are left out with a note; none found is a
 * 400. Read-only, no auth, open CORS.
 */

import { getEveryAgent, getRetiredListings } from '@/lib/catalog';
import { bundleDecision } from '@/lib/decide';
import { logConsumer } from '@/lib/log';
import { restRateLimit } from '@/lib/rest-rate-limit';
import { corsPreflight, jsonResponse } from '@/lib/public-api';
import { requestedStackSlugs } from '@/lib/shared-stack';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const limited = restRateLimit('/api/bundle', req);
  if (limited) return limited;
  const requested = requestedStackSlugs(new URL(req.url).searchParams.getAll('items'));
  logConsumer('/api/bundle', req, { items: requested.length });

  const [catalog, retired] = await Promise.all([getEveryAgent(), getRetiredListings()]);
  const decision = bundleDecision(requested, catalog, retired);
  if (!decision.ok) {
    return jsonResponse({ error: decision.error, message: decision.message, ...decision.extra }, decision.status);
  }
  return jsonResponse(decision.body);
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
