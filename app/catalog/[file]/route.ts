import { getEveryAgent } from '@/lib/catalog';
import {
  CATALOG_FLAGS,
  CATALOG_HEADERS,
  CATALOG_PAGE_SIZE,
  CATALOG_SCHEMA_VERSION,
  CATALOG_SOURCE,
  catalogEntry,
  catalogPageCount,
  catalogPageOf,
  catalogPageUrl,
} from '@/lib/catalog-dump';
import { BASE_URL } from '@/lib/env';
import { NextResponse } from 'next/server';

/**
 * /catalog/<n>.json: one page of the catalog /agents.json indexes, built once
 * per deploy. Any other file is a 404.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const pageCount = catalogPageCount((await getEveryAgent()).length);
  return Array.from({ length: pageCount }, (_, i) => ({ file: `${i + 1}.json` }));
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const agents = await getEveryAgent();
  const pageCount = catalogPageCount(agents.length);
  const page = catalogPageOf((await context.params).file, pageCount);
  if (page === null) return new Response('Not found', { status: 404 });
  const start = (page - 1) * CATALOG_PAGE_SIZE;

  return NextResponse.json(
    {
      source: CATALOG_SOURCE,
      description: `Page ${page} of ${pageCount} of the Agent Switchboard catalog; the index is ${BASE_URL}/agents.json. ${CATALOG_FLAGS}`,
      schemaVersion: CATALOG_SCHEMA_VERSION,
      generated: new Date().toISOString(),
      index: `${BASE_URL}/agents.json`,
      total: agents.length,
      pageSize: CATALOG_PAGE_SIZE,
      page,
      pageCount,
      offset: start,
      prev: page > 1 ? catalogPageUrl(page - 1) : null,
      next: page < pageCount ? catalogPageUrl(page + 1) : null,
      agents: agents.slice(start, start + CATALOG_PAGE_SIZE).map(catalogEntry),
    },
    { headers: CATALOG_HEADERS }
  );
}
