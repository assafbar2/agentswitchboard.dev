import { getAllAgents } from '@/lib/contentful';
import { NextResponse } from 'next/server';

export const revalidate = 300; // refresh every 5 minutes

export async function GET() {
  const { agents } = await getAllAgents({ limit: 500 });

  const catalog = agents.map((a) => ({
    name: a.name,
    slug: a.slug,
    url: `https://agentswitchboard.dev/agents/${a.slug}`,
    homepage: a.agentUrl ?? null,
    provider: a.providerName ?? null,
    providerUrl: a.providerUrl ?? null,
    description: a.description,
    categories: a.categories.map((c) => c.slug),
    accessMethods: a.accessMethods ?? [],
    tags: a.tags ?? [],
    verified: a.verified,
    tier: a.tier,
  }));

  return NextResponse.json(
    {
      source: 'Agent Switchboard — https://agentswitchboard.dev',
      description:
        'Machine-readable catalog of vetted AI agents. Filter by categories or accessMethods to find the right tool.',
      generated: new Date().toISOString(),
      total: catalog.length,
      agents: catalog,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
