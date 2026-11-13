/**
 * Two or three listings side by side, as the /compare page shows them.
 *
 *   GET /api/compare?a=<slug>&b=<slug>[&c=<slug>]
 *   → { title, url, intro, agents: [ { …search-result fields, authType,
 *        setsApart: [fact line] } ], rows: [ { key, label, same,
 *        values: { <slug>: value } } ], notes: [string] }
 *
 * The same parameters as the page, so a /compare link becomes the API call by
 * adding /api. Unknown or repeated slugs, and any past three, are left out
 * with a note; fewer than two listings found is a 400 that names listings to
 * put beside the one found. Read-only, no auth, open CORS.
 */

import { getEveryAgent, getRetiredListings } from '@/lib/catalog';
import { requestedSlugs } from '@/lib/compare';
import { compareDecision } from '@/lib/decide';
import { logConsumer } from '@/lib/log';
import { restRateLimit } from '@/lib/rest-rate-limit';
import { corsPreflight, jsonResponse } from '@/lib/public-api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const limited = restRateLimit('/api/compare', req);
  if (limited) return limited;
  const { searchParams } = new URL(req.url);
  const requested = requestedSlugs(searchParams);
  logConsumer('/api/compare', req, { slugs: requested.join(',') || undefined });

  const [catalog, retired] = await Promise.all([getEveryAgent(), getRetiredListings()]);
  const decision = compareDecision(requested, catalog, retired);
  if (!decision.ok) {
    return jsonResponse({ error: decision.error, message: decision.message, ...decision.extra }, decision.status);
  }
  return jsonResponse(decision.body);
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
