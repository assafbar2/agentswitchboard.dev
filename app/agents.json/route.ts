import { getEveryAgent } from '@/lib/catalog';
import { BASE_URL } from '@/lib/env';
import { logConsumer } from '@/lib/log';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  logConsumer('/agents.json', req);
  const agents = await getEveryAgent();

  const catalog = agents.map((a) => ({
    name: a.name,
    slug: a.slug,
    url: `${BASE_URL}/agents/${a.slug}`,
    homepage: a.agentUrl ?? null,
    provider: a.providerName ?? null,
    providerUrl: a.providerUrl ?? null,
    description: a.description,
    categories: a.categories.map((c) => c.slug),
    accessMethods: a.accessMethods ?? [],
    tags: a.tags ?? [],
    verified: a.verified,
    tier: a.tier,
    createdAt: a.createdAt ?? null,
    updatedAt: a.updatedAt ?? null,
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
