/**
 * One recommendation for what a user needs, and the next step to start using it.
 *
 *   GET /api/recommend?need=<the user's need, in a sentence>
 *   → { request, answer, recommendations: [ { need, task, pick, pickedBecause,
 *        why, unmet, nextStep: { how, label, url, server, note }, limitations,
 *        alternatives, fits } ], unmatched, stackUrl, operatorUrl, basis, notes }
 *
 * The Operator's pick (lib/operator.ts) for each need the request names, from
 * the catalog in organic order: no featured order and no placement field.
 * No need is a 400; a need no task matches is a 404 with the closest tasks.
 * The need's text is never logged. Read-only, no auth, open CORS.
 */

import { getEveryAgent } from '@/lib/catalog';
import { recommendDecision } from '@/lib/decide';
import { logConsumer } from '@/lib/log';
import { organicOrder, withoutPlacement } from '@/lib/organic';
import { corsPreflight, jsonResponse } from '@/lib/public-api';
import { getTasks } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const need = new URL(req.url).searchParams.get('need') ?? '';
  const decision = recommendDecision(need, getTasks(), organicOrder(await getEveryAgent()));
  logConsumer('/api/recommend', req, {
    picks: decision.ok ? decision.body.recommendations.length : 0,
    unmatched: decision.ok ? decision.body.unmatched.length : decision.error,
  });
  if (!decision.ok) {
    return jsonResponse({ error: decision.error, message: decision.message, ...decision.extra }, decision.status);
  }
  return jsonResponse(withoutPlacement(decision.body));
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
