/**
 * Full listing for one published agent.
 *
 *   GET /api/agents/<slug>
 *   → skills, auth type, homepage, tags, streaming/push flags
 *
 * Read-only, no auth, open CORS. 404 when the slug is unknown or unpublished.
 */

import { getAgentBySlug } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import { corsPreflight, jsonResponse, detailAgent } from '@/lib/public-api';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  logConsumer('/api/agents/[slug]', req, { slug });

  const agent = await getAgentBySlug(slug);
  if (!agent) {
    return jsonResponse(
      {
        error: 'not_found',
        message: `No published agent with slug "${slug}". Search GET /api/agents?q=… then retry with a returned slug.`,
      },
      404
    );
  }

  return jsonResponse(detailAgent(agent));
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
