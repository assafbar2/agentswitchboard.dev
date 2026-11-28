/**
 * Markdown twin of a listing page, at /agents/<slug>.md (next.config.ts
 * rewrites it here): verified access methods, copy-ready endpoints and install
 * commands, auth, skills, limitations, last-checked date, official/verified
 * status, and organic alternatives. Prerendered like /tasks/<slug>.md, with a
 * Link header naming the HTML page as canonical.
 */

import { getOrganicAgents } from '@/lib/catalog';
import { renderAgentMarkdown } from '@/lib/agent-markdown';
import { BASE_URL } from '@/lib/env';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
  const agents = await getOrganicAgents();
  return agents.map((a) => ({ slug: a.slug }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const catalog = await getOrganicAgents();
  const agent = catalog.find((a) => a.slug === slug);
  if (!agent) return new Response('Not found', { status: 404 });

  const page = `${BASE_URL}/agents/${agent.slug}`;
  const body = renderAgentMarkdown(agent, catalog);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${page}>; rel="canonical"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
