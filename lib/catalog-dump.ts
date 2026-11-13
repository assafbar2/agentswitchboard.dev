import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { BASE_URL } from '@/lib/env';
import { absoluteIconUrl } from '@/lib/icons';
import { FEATURED_DEFINITION, OFFICIAL_DEFINITION, SPONSORED_DEFINITION, howToUseFields } from '@/lib/public-api';
import type { Agent } from '@/lib/types';

/**
 * The catalog dump: /agents.json is a small index, and the listings sit in
 * static pages of at most CATALOG_PAGE_SIZE at /catalog/<n>.json. No one
 * request returns the whole catalog.
 */
export const CATALOG_PAGE_SIZE = 50;

/** Bumped when the shape of /agents.json or a page changes. 1 was the single-file dump. */
export const CATALOG_SCHEMA_VERSION = 2;

export const CATALOG_SOURCE = 'Agent Switchboard — https://agentswitchboard.dev';

export const CATALOG_FLAGS = `Flags: ${VERIFIED_DEFINITION} ${OFFICIAL_DEFINITION} ${FEATURED_DEFINITION} ${SPONSORED_DEFINITION}`;

/**
 * The index and pages change only when a release deploys, and a deploy replaces
 * them in Vercel's CDN. Other caches keep a copy at most a day, browsers an hour.
 */
export const CATALOG_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

export const catalogPageUrl = (page: number) => `${BASE_URL}/catalog/${page}.json`;

export const catalogPageCount = (total: number) => Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));

/** `<n>.json` for a page that exists, else null. */
export function catalogPageOf(file: string, pageCount: number): number | null {
  const m = /^([1-9]\d*)\.json$/.exec(file);
  const page = m ? Number(m[1]) : NaN;
  return page >= 1 && page <= pageCount ? page : null;
}

/** One listing as /catalog/<n>.json carries it. */
export function catalogEntry(a: Agent) {
  return {
    name: a.name,
    slug: a.slug,
    url: `${BASE_URL}/agents/${a.slug}`,
    iconUrl: absoluteIconUrl(a.iconUrl),
    homepage: a.agentUrl ?? null,
    provider: a.providerName ?? null,
    providerUrl: a.providerUrl ?? null,
    description: a.description,
    categories: a.categories.map((c) => c.slug),
    accessMethods: a.accessMethods ?? [],
    authType: a.authType,
    tags: a.tags ?? [],
    verified: a.verified,
    official: a.official,
    officialVendor: a.officialVendor?.name ?? null,
    // Featured listings sort first in the catalog order, so callers see why.
    featured: a.featured === true,
    sponsored: a.sponsored === true,
    tier: a.tier,
    createdAt: a.createdAt ?? null,
    updatedAt: a.updatedAt ?? null,
    ...howToUseFields(a),
  };
}
