/**
 * The homepage box's answer, for the website alone:
 *
 *   GET /home/answer?need=<what the visitor typed>
 *
 * The same body as GET /api/recommend (lib/decide.ts recommendDecision), but
 * the task's Featured and Sponsored tools go first, each labeled in
 * `placements` (lib/promoted.ts). GET /api/recommend and the MCP and WebMCP
 * recommend tools stay organic. Not part of the public API: same origin, no
 * CORS, never cached, never indexed. The need's text is never logged.
 */

import { getOrganicAgents } from '@/lib/catalog';
import { recommendDecision } from '@/lib/decide';
import { promotion, today } from '@/lib/promoted';
import { getTasks } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
};

export async function GET(req: Request): Promise<Response> {
  const need = new URL(req.url).searchParams.get('need') ?? '';
  const day = today();
  const decision = recommendDecision(need, getTasks(), await getOrganicAgents(), (a) => promotion(a, day));
  const body = decision.ok
    ? decision.body
    : { error: decision.error, message: decision.message, ...decision.extra };
  return new Response(JSON.stringify(body), { status: decision.ok ? 200 : decision.status, headers: HEADERS });
}
