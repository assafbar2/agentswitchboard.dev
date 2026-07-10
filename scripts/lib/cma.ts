/**
 * Shared Contentful Management API plumbing for all ops scripts.
 * Single source of truth for token refresh + authenticated fetch.
 *
 * Token flow: scripts/refresh-cma-token.sh mints a 10-minute App Identity
 * token (private key in .env.local as CONTENTFUL_APP_PRIVATE_KEY_B64) and
 * writes it to .env.local; cma() transparently re-mints when it ages out.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

export const SPACE = process.env.CONTENTFUL_SPACE_ID || '8e4hmp8gwcuv';
export const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/master`;

let TOKEN = '';
let tokenCreatedAt = 0;
const TOKEN_MAX_AGE_MS = 7 * 60 * 1000; // refresh before the 10-min expiry

function readTokenFromEnvLocal(): string {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/CONTENTFUL_MANAGEMENT_TOKEN="([^"]+)"/);
  return match?.[1] ?? process.env.CONTENTFUL_MANAGEMENT_TOKEN ?? '';
}

export function refreshToken(): void {
  execSync('bash scripts/refresh-cma-token.sh', { stdio: 'pipe' });
  TOKEN = readTokenFromEnvLocal();
  tokenCreatedAt = Date.now();
}

function ensureToken(): void {
  if (!TOKEN || Date.now() - tokenCreatedAt > TOKEN_MAX_AGE_MS) {
    try {
      refreshToken();
    } catch {
      // fall back to whatever is in the env file
      TOKEN = readTokenFromEnvLocal();
      tokenCreatedAt = Date.now();
      if (!TOKEN) throw new Error('No CMA token available — run scripts/refresh-cma-token.sh');
    }
  }
}

/** Authenticated CMA fetch relative to the space/master environment. */
 
export async function cma(path: string, opts: RequestInit = {}): Promise<any> {
  ensureToken();
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(opts.headers || {}),
    },
  });
  return r.json();
}

 
export async function findEntryBySlug(contentType: string, slug: string): Promise<any | null> {
  const res = await cma(`/entries?content_type=${contentType}&fields.slug=${slug}&limit=1`);
  return res.items?.[0] ?? null;
}

/** Live category slug -> entry-id map, fetched from the CMS (no hardcoding). */
export async function fetchCategoryMap(): Promise<Record<string, string>> {
  const res = await cma(`/entries?content_type=category&limit=100`);
  const map: Record<string, string> = {};
   
  for (const item of res.items ?? []) {
    const slug = item.fields?.slug?.['en-US'];
    if (slug) map[slug] = item.sys.id;
  }
  return map;
}

/** Update selected fields on an entry by slug, then publish. */
export async function updateEntryFields(
  contentType: string,
  slug: string,
   
  fields: Record<string, any>
): Promise<'updated' | 'not-found' | 'error'> {
  const entry = await findEntryBySlug(contentType, slug);
  if (!entry) return 'not-found';

  for (const [key, value] of Object.entries(fields)) {
    entry.fields[key] = { 'en-US': value };
  }

  const updated = await cma(`/entries/${entry.sys.id}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) },
    body: JSON.stringify({ fields: entry.fields }),
  });
  if (!updated.sys?.id || updated.sys?.type === 'Error') return 'error';

  const pub = await cma(`/entries/${updated.sys.id}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(updated.sys.version) },
  });
  return pub.sys?.publishedVersion ? 'updated' : 'error';
}
