/**
 * Full plain-text / Markdown reference for LLMs at /llms-full.txt.
 *
 * Prerendered at build time (like /llms.txt and /index.md) from the organic
 * catalog so it stays fast, zero-cost per request, and completely free of
 * featured/sponsored placement bias.
 */

import { getAllCategories, getOrganicAgents } from '@/lib/catalog';
import { renderLlmsFull } from '@/lib/agent-markdown';
import { getStacks } from '@/lib/stacks';
import { getTasks } from '@/lib/tasks';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  // Sequential on purpose: each helper reads the catalog from disk.
  const agents = await getOrganicAgents();
  const categories = await getAllCategories();
  const body = renderLlmsFull(agents, categories, getTasks(), getStacks());

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
