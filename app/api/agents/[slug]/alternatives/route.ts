/**
 * Listings that could stand in for one listing, as its alternatives page
 * (/agents/<slug>/alternatives) lists them.
 *
 *   GET /api/agents/<slug>/alternatives[?limit=<1–8>]
 *   → { agent, total, url, compareUrl, basis, alternatives: [ { …search-result
 *        fields, authType, sharedAccess, inCommon, why } ] }
 *
 * `url` is the alternatives page, null when the listing has too few for one;
 * `compareUrl` compares it with its top two. 404 when the slug is unknown or
 * no longer listed. Read-only, no auth, open CORS.
 */

import { getEveryAgent, getRetiredListings } from '@/lib/catalog';
import { alternativesDecision } from '@/lib/decide';
import { logConsumer } from '@/lib/log';
import { clampInt, corsPreflight, jsonResponse } from '@/lib/public-api';
import { MAX_ALTERNATIVES } from '@/lib/related';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params;
  const limit = clampInt(new URL(req.url).searchParams.get('limit'), MAX_ALTERNATIVES, 1, MAX_ALTERNATIVES);
  logConsumer('/api/agents/[slug]/alternatives', req, { slug });

  const [catalog, retired] = await Promise.all([getEveryAgent(), getRetiredListings()]);
  const decision = alternativesDecision(slug, catalog, retired, limit);
  if (!decision.ok) return jsonResponse({ error: decision.error, message: decision.message }, decision.status);
  return jsonResponse(decision.body);
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
