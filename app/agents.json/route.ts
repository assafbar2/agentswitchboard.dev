import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { getEveryAgent } from '@/lib/catalog';
import { BASE_URL } from '@/lib/env';
import { logConsumer } from '@/lib/log';
import { FEATURED_DEFINITION, OFFICIAL_DEFINITION } from '@/lib/public-api';
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
    official: a.official,
    officialVendor: a.officialVendor?.name ?? null,
    // Featured listings sort first in this file's order, so callers see why.
    featured: a.featured === true,
    tier: a.tier,
    createdAt: a.createdAt ?? null,
    updatedAt: a.updatedAt ?? null,
  }));

  return NextResponse.json(
    {
      source: 'Agent Switchboard — https://agentswitchboard.dev',
      description:
        'Machine-readable catalog of every published Agent Switchboard listing (AI agents, MCP servers and agentic tools), featured first, then A→Z. Filter by categories or accessMethods to find the right tool. ' +
        `Flags: ${VERIFIED_DEFINITION} ${OFFICIAL_DEFINITION} ${FEATURED_DEFINITION}`,
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
