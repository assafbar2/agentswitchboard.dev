import { getEveryAgent } from '@/lib/catalog';
import {
  CATALOG_FLAGS,
  CATALOG_HEADERS,
  CATALOG_PAGE_SIZE,
  CATALOG_SCHEMA_VERSION,
  CATALOG_SOURCE,
  catalogPageCount,
  catalogPageUrl,
} from '@/lib/catalog-dump';
import { BASE_URL } from '@/lib/env';
import { MAX_LIMIT } from '@/lib/public-api';
import { NextResponse } from 'next/server';

// Built once per deploy and served from the CDN whatever the query string, like
// /llms.txt. proxy.ts counts every read at the edge, so nothing here reads the
// request (which would make the route render per request).
export const dynamic = 'force-static';

export async function GET() {
  const total = (await getEveryAgent()).length;
  const pageCount = catalogPageCount(total);

  return NextResponse.json(
    {
      source: CATALOG_SOURCE,
      description:
        'Index of the machine-readable Agent Switchboard catalog (AI agents, MCP servers and agentic tools). ' +
        `The listings are in ${pageCount} static pages of up to ${CATALOG_PAGE_SIZE}, featured first, then A→Z: fetch the URLs in \`pages\` in order, or follow each page's \`next\`. ` +
        'To find tools for a job, search instead: GET /api/agents (filters, `page` and `next`) or the MCP server. ' +
        CATALOG_FLAGS,
      schemaVersion: CATALOG_SCHEMA_VERSION,
      // Build time: the catalog only changes with a deploy.
      generated: new Date().toISOString(),
      total,
      pageSize: CATALOG_PAGE_SIZE,
      pageCount,
      pages: Array.from({ length: pageCount }, (_, i) => catalogPageUrl(i + 1)),
      search: {
        rest: `${BASE_URL}/api/agents?limit=${MAX_LIMIT}&page=1`,
        mcp: `${BASE_URL}/api/mcp`,
        openapi: `${BASE_URL}/openapi.json`,
        docs: `${BASE_URL}/llms.txt`,
      },
    },
    { headers: CATALOG_HEADERS }
  );
}
