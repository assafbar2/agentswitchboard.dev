/**
 * Shared shapes and HTTP helpers for the public catalog REST API.
 * Used by GET /api/agents, GET /api/agents/[slug], and GET /api/categories.
 */

import type { Agent, Category } from './types';
import { BASE_URL } from './env';

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
  };
}

/** Full listing for GET /api/agents/{slug} — skills, auth, links. */
export function detailAgent(a: Agent) {
  return {
    ...summarizeAgent(a),
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
