/**
 * Shared shapes and HTTP helpers for the public catalog REST API.
 * Used by GET /api/agents, GET /api/agents/[slug], and GET /api/categories,
 * and — for the label definitions and access-method input rules — by the MCP
 * server (/api/mcp), WebMCP and the agent docs, so they cannot drift apart.
 */

import type { Agent, Category } from './types';
import { BASE_URL } from './env';
import { ALL_ACCESS_METHODS } from './search';

// ── Label definitions ───────────────────────────────────────────────
// "Verified" is worded once, in components/VerifiedBadge.tsx
// (VERIFIED_DEFINITION). These two sit beside it so every agent-facing surface
// (llms.txt, /index.md, /for-agents, skill.md, REST docs, MCP and WebMCP tool
// descriptions) defines the flags the same way.

/** What `official: true` means. Mirrors CONTRIBUTING.md, "Official listings". */
export const OFFICIAL_DEFINITION =
  "Official: a first-party listing, published by the company behind the product under its own domain or GitHub org (e.g. Notion's own Notion MCP, not a community build), where that company is a major vendor (publicly traded, a frontier AI lab, or valued around $1B+). It records who publishes the product, not a paid placement, and is separate from Verified.";

/** What `featured: true` means, and how it affects result order. */
export const FEATURED_DEFINITION =
  'Featured: set only by the maintainer. With no search text, results list featured listings first, then A→Z; with search text, results are ranked by relevance and equal scores keep that featured-first order.';

// ── Access-method input ─────────────────────────────────────────────

/** Accepted spellings that map onto a canonical access method. */
const ACCESS_METHOD_ALIASES = new Map<string, string>([['extension', 'browser-extension']]);

/**
 * Every value the `access` input accepts: the canonical methods, then their
 * aliases. Docs use the canonical `browser-extension`; `extension` is accepted
 * because earlier docs used it.
 */
export const ACCESS_METHOD_INPUTS: string[] = [
  ...ALL_ACCESS_METHODS,
  ...ACCESS_METHOD_ALIASES.keys(),
];

/**
 * Canonical, de-duplicated access methods from raw input: trims, lowercases,
 * maps aliases (`extension` → `browser-extension`) and drops unknown values.
 */
export function normalizeAccessMethods(values: readonly string[]): string[] {
  const methods = new Set<string>();
  for (const raw of values) {
    const value = raw.trim().toLowerCase();
    const method = ACCESS_METHOD_ALIASES.get(value) ?? value;
    if (ALL_ACCESS_METHODS.includes(method)) methods.add(method);
  }
  return [...methods];
}

export const CORS_GET = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const CACHE_PUBLIC =
  'public, s-maxage=300, stale-while-revalidate=600';

export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 10;

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_GET });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': CACHE_PUBLIC,
      ...CORS_GET,
    },
  });
}

export function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Search-result card. Same fields as GET /api/agents `agents[]`. */
export function summarizeAgent(a: Agent) {
  return {
    name: a.name,
    slug: a.slug,
    url: `${BASE_URL}/agents/${a.slug}`,
    description: a.description,
    provider: a.providerName,
    categories: a.categories.map((c) => c.slug),
    accessMethods: a.accessMethods,
    verified: a.verified,
    official: a.official,
    // Featured listings sort first in the default order, so callers see why.
    featured: a.featured === true,
  };
}

/** Full listing for GET /api/agents/{slug} — skills, auth, links. */
export function detailAgent(a: Agent) {
  return {
    ...summarizeAgent(a),
    officialVendor: a.officialVendor?.name ?? null,
    homepage: a.agentUrl ?? null,
    providerUrl: a.providerUrl ?? null,
    authType: a.authType,
    tags: a.tags ?? [],
    skills: (a.skills ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
    })),
    supportsStreaming: a.supportsStreaming,
    supportsPushNotifications: a.supportsPushNotifications,
    tier: a.tier,
    createdAt: a.createdAt ?? null,
    updatedAt: a.updatedAt ?? null,
  };
}

export function summarizeCategory(c: Category) {
  return {
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    agentCount: c.agentCount ?? 0,
  };
}
