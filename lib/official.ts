/**
 * Official vendors — the registry behind the "Official" badge.
 *
 * content/official-vendors.json lists every company whose first-party
 * listings may carry `official: true`, with the evidence that it is a major
 * vendor and the official sources (domains, GitHub orgs) its products ship
 * from. An entry is Official only when it sets `official: true` AND its
 * `agentUrl` resolves to exactly one vendor here. scripts/validate-content.ts
 * enforces both, so the flag can't be self-assigned without evidence.
 *
 * Criteria: CONTRIBUTING.md, "Official listings".
 */

import type { Agent } from './types';

export type OfficialBasis = 'public' | 'frontier-lab' | 'valuation' | 'market-leader' | 'subsidiary';

export interface OfficialVendor {
  slug: string;
  name: string;
  basis: OfficialBasis;
  /** One line a reviewer can check, e.g. "NASDAQ: GOOGL" or "valued $10B (2025)". */
  evidence: string;
  /** Owning company, required when basis is "subsidiary". */
  parent?: string;
  /**
   * Official sources, each either a host ("cloudflare.com", which also covers
   * subdomains) or a host plus first path segment ("github.com/cloudflare").
   */
  sources: string[];
}

/**
 * Hosts that serve many unrelated publishers. A bare host here would make
 * every repo or page on it look first-party, so sources on these hosts must
 * name the org path ("github.com/google") or a vendor-owned subdomain.
 */
export const SHARED_HOSTS = new Set([
  'github.com',
  'github.io',
  'gitlab.com',
  'huggingface.co',
  'npmjs.com',
  'pypi.org',
  'smithery.ai',
  'glama.ai',
  'medium.com',
  'substack.com',
  'x.com',
  'vercel.app',
  'netlify.app',
  'pages.dev',
  'producthunt.com',
]);

function parseSource(source: string): { host: string; segment?: string } {
  const [host, segment] = source.toLowerCase().replace(/\/+$/, '').split('/');
  return { host, segment };
}

/** True when `source` covers the given URL. */
export function sourceMatches(source: string, url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const firstSegment = parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  const s = parseSource(source);
  if (s.segment) return host === s.host && firstSegment === s.segment;
  return host === s.host || host.endsWith(`.${s.host}`);
}

/** Every vendor whose official sources cover `url`. */
export function vendorsForUrl(url: string, vendors: OfficialVendor[]): OfficialVendor[] {
  return vendors.filter((v) => v.sources.some((s) => sourceMatches(s, url)));
}

/** The single vendor that owns `url`, or null when none (or several) match. */
export function vendorForUrl(url: string, vendors: OfficialVendor[]): OfficialVendor | null {
  const matches = vendorsForUrl(url, vendors);
  return matches.length === 1 ? matches[0] : null;
}

/** Registry problems: shared bare hosts, missing parents, overlapping sources. */
export function registryProblems(vendors: OfficialVendor[]): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();
  for (const v of vendors) {
    if (slugs.has(v.slug)) problems.push(`duplicate vendor slug "${v.slug}"`);
    slugs.add(v.slug);
    if (v.basis === 'subsidiary' && !v.parent) {
      problems.push(`${v.slug}: basis "subsidiary" needs a parent`);
    }
    for (const source of v.sources) {
      const { host, segment } = parseSource(source);
      if (SHARED_HOSTS.has(host) && !segment) {
        problems.push(`${v.slug}: source "${source}" is a shared host; name the org path or a vendor subdomain`);
      }
    }
  }

  // Two vendors must never claim the same URL space.
  const all = vendors.flatMap((v) => v.sources.map((s) => ({ vendor: v.slug, ...parseSource(s), raw: s })));
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const b = all[j];
      if (a.vendor === b.vendor) continue;
      if (covers(a, b) || covers(b, a)) {
        problems.push(`sources overlap: ${a.vendor} "${a.raw}" and ${b.vendor} "${b.raw}"`);
      }
    }
  }
  return problems;
}

export interface OfficialGroup {
  vendor: { slug: string; name: string };
  agents: Agent[];
}

/** Official agents grouped by vendor: most listings first, then A→Z. */
export function groupOfficialAgents(agents: Agent[]): OfficialGroup[] {
  const groups = new Map<string, OfficialGroup>();
  for (const agent of agents) {
    if (!agent.official || !agent.officialVendor) continue;
    const key = agent.officialVendor.slug;
    if (!groups.has(key)) groups.set(key, { vendor: agent.officialVendor, agents: [] });
    groups.get(key)!.agents.push(agent);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, agents: [...g.agents].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.agents.length - a.agents.length || a.vendor.name.localeCompare(b.vendor.name));
}

function covers(
  outer: { host: string; segment?: string },
  inner: { host: string; segment?: string }
): boolean {
  const hostCovered = inner.host === outer.host || inner.host.endsWith(`.${outer.host}`);
  if (!hostCovered) return false;
  if (!outer.segment) return true;
  return inner.host === outer.host && inner.segment === outer.segment;
}
