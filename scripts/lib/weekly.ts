/**
 * Pure helpers for the weekly content run (window, dedup index, ledger).
 * No network, no filesystem — everything here is unit-tested in
 * weekly.test.ts. The CLIs in scripts/ do the I/O.
 */

export const WINDOW_CAP_DAYS = 14;

// ─── Lookback window ─────────────────────────────────────────────────────────

const DROP_SUBJECT = /^Weekly drop (\d{4}-\d{2}-\d{2})\b/;

/**
 * Latest run date from "Weekly drop YYYY-MM-DD…" commit subjects.
 * Uses the date in the SUBJECT (commit dates can lag by weeks) and the max
 * across all matches, so it works whether the drop PR was squashed or merged
 * with a merge commit (the merge commit subject doesn't match; the drop
 * commit underneath does).
 */
export function lastDropDate(subjects: string[]): string | null {
  let best: string | null = null;
  for (const s of subjects) {
    const m = DROP_SUBJECT.exec(s.trim());
    if (m && (!best || m[1] > best)) best = m[1];
  }
  return best;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Window in days: since the last drop, clamped to [1, cap]; cap when there's no prior drop. */
export function lookbackDays(last: string | null, today: string, cap = WINDOW_CAP_DAYS): number {
  if (!last) return cap;
  return Math.min(Math.max(daysBetween(last, today), 1), cap);
}

// ─── Dedup index ─────────────────────────────────────────────────────────────

/** Hosts shared by unrelated products — never treat a match on these as a duplicate. */
const SHARED_HOSTS = new Set([
  'github.com', 'gitlab.com', 'bitbucket.org', 'huggingface.co', 'npmjs.com', 'pypi.org',
  'medium.com', 'substack.com', 'youtube.com', 'x.com', 'twitter.com', 'linkedin.com',
  'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'notion.site', 'gitbook.io',
  'readthedocs.io', 'apps.apple.com', 'play.google.com', 'chromewebstore.google.com',
  'marketplace.visualstudio.com', 'smithery.ai', 'glama.ai', 'mcp.so',
]);

export function hostOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Subdomains of hosting platforms (foo.vercel.app) are specific; the bare platform is not. */
export function isSharedHost(host: string): boolean {
  return SHARED_HOSTS.has(host);
}

const NOT_A_REPO_OWNER = new Set(['orgs', 'topics', 'features', 'marketplace', 'apps', 'sponsors', 'collections', 'trending', 'search', 'settings', 'login']);

/** "owner/repo" (lowercase) from a github.com URL or an "owner/repo" string. */
export function githubRepoOf(input: string | undefined | null): string | null {
  if (!input) return null;
  const s = input.trim();
  let path: string;
  if (/^https?:\/\//i.test(s)) {
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      return null;
    }
    if (u.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com') return null;
    path = u.pathname;
  } else if (/^[\w.-]+\/[\w.-]+$/.test(s)) {
    path = s;
  } else {
    return null;
  }
  const [owner, repo] = path.replace(/^\/+/, '').split('/');
  if (!owner || !repo || NOT_A_REPO_OWNER.has(owner.toLowerCase())) return null;
  return `${owner}/${repo.replace(/\.git$/i, '')}`.toLowerCase();
}

/** Lowercase alphanumerics only: "Mobile MCP" and "mobile-mcp" compare equal. */
export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface IndexedAgent {
  slug: string;
  name: string;
  status: string;
  hosts: string[];
  repo: string | null;
}

export interface AgentLike {
  slug: string;
  name: string;
  status?: string;
  agentUrl?: string;
  providerUrl?: string;
}

export function buildIndex(agents: AgentLike[]): IndexedAgent[] {
  return agents.map((a) => {
    const hosts = [hostOf(a.agentUrl), hostOf(a.providerUrl)].filter((h): h is string => !!h);
    return {
      slug: a.slug,
      name: a.name,
      status: a.status ?? 'published',
      hosts: [...new Set(hosts)],
      repo: githubRepoOf(a.agentUrl) ?? githubRepoOf(a.providerUrl),
    };
  });
}

export interface Candidate {
  name?: string;
  url?: string;
  repo?: string;
}

/** "Name|url-or-owner/repo" (tab also works); a bare URL or owner/repo is fine too. */
export function parseCandidate(line: string): Candidate {
  const [a, b] = line.split(/\s*[|\t]\s*/);
  const ref = (b ?? '').trim();
  const name = (a ?? '').trim();
  if (!ref && (/^https?:\/\//.test(name) || /^[\w.-]+\/[\w.-]+$/.test(name))) {
    return /^https?:\/\//.test(name) ? { url: name } : { repo: name };
  }
  if (!ref) return { name };
  return /^https?:\/\//.test(ref) ? { name, url: ref } : { name, repo: ref };
}

export type MatchKind = 'slug' | 'name' | 'repo' | 'host';
export interface Match {
  slug: string;
  kind: MatchKind;
  status: string;
}

/**
 * Existing entries a candidate may duplicate. slug/name/repo matches are
 * near-certain; a host match only means "same company or domain" — check
 * the product, not the name, before calling it a duplicate.
 */
export function findMatches(index: IndexedAgent[], c: Candidate): Match[] {
  const out: Match[] = [];
  const seen = new Set<string>();
  const push = (a: IndexedAgent, kind: MatchKind) => {
    const k = `${a.slug}:${kind}`;
    if (!seen.has(k)) {
      seen.add(k);
      out.push({ slug: a.slug, kind, status: a.status });
    }
  };
  const nn = c.name ? normalizeName(c.name) : null;
  const repo = githubRepoOf(c.repo) ?? githubRepoOf(c.url);
  const host = hostOf(c.url);
  for (const a of index) {
    if (nn && nn.length > 1 && normalizeName(a.slug) === nn) push(a, 'slug');
    if (nn && nn.length > 1 && normalizeName(a.name) === nn) push(a, 'name');
    if (repo && a.repo === repo) push(a, 'repo');
    if (host && !isSharedHost(host) && a.hosts.includes(host)) push(a, 'host');
  }
  const rank: Record<MatchKind, number> = { repo: 0, slug: 1, name: 2, host: 3 };
  return out.sort((x, y) => rank[x.kind] - rank[y.kind]);
}

// ─── Candidate ledger ────────────────────────────────────────────────────────

export const LEDGER_STATUSES = ['added', 'rejected', 'bench', 'watch'] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];

/** Neutral reason codes — the ledger may be shared; keep judgments out of it. */
export const REASON_CODES = [
  'NO-URL', 'NO-PROGRAMMATIC', 'NOT-USABLE', 'NO-PROVIDER', 'DUPLICATE', 'WRAPPER',
  'NOT-A-PRODUCT', 'TOS-RISK', 'STALE', 'BELOW-BAR', 'OUT-OF-SCOPE', 'TOO-NEW', 'UNVERIFIED',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface LedgerEntry {
  key: string; // github "owner/repo" or host — see ledgerKey()
  name: string;
  status: LedgerStatus;
  date: string; // YYYY-MM-DD this record was written
  reason?: ReasonCode;
  recheckAfter?: string; // YYYY-MM-DD
  signal?: string; // snapshot, e.g. "1,935★ · HN 246"
  note?: string;
}

/** Stable key: GitHub repo if there is one, else the host, else the normalized name. */
export function ledgerKey(c: Candidate): string | null {
  const repo = githubRepoOf(c.repo) ?? githubRepoOf(c.url);
  if (repo) return repo;
  const host = hostOf(c.url);
  if (host && !isSharedHost(host)) return host;
  return c.name ? `name:${normalizeName(c.name)}` : null;
}

export function parseLedger(text: string): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    try {
      const e = JSON.parse(t);
      if (e && typeof e.key === 'string' && LEDGER_STATUSES.includes(e.status)) out.push(e);
    } catch {
      // skip malformed lines rather than losing the whole ledger
    }
  }
  return out;
}

/** Latest record per key (append-only file: later lines win). */
export function latestByKey(entries: LedgerEntry[]): Map<string, LedgerEntry> {
  const m = new Map<string, LedgerEntry>();
  for (const e of entries) {
    const prev = m.get(e.key);
    if (!prev || e.date >= prev.date) m.set(e.key, e);
  }
  return m;
}

export type LedgerVerdict = 'new' | 'skip' | 'recheck';

/**
 * new     — never evaluated
 * skip    — evaluated; don't re-research (added, or rejected/bench/watch not yet due)
 * recheck — rejected/bench/watch whose recheckAfter has passed
 */
export function ledgerVerdict(latest: LedgerEntry | undefined, today: string): LedgerVerdict {
  if (!latest) return 'new';
  if (latest.status === 'added') return 'skip';
  if (latest.recheckAfter && latest.recheckAfter <= today) return 'recheck';
  return 'skip';
}

// ─── Staleness ───────────────────────────────────────────────────────────────

export function monthsSince(iso: string, today: string): number {
  return daysBetween(iso, today) / 30.44;
}

/** True when a redirect landed on a different site (ignoring www and http→https). */
export function hostChanged(fromUrl: string, finalUrl: string): boolean {
  const a = hostOf(fromUrl);
  const b = hostOf(finalUrl);
  return !!a && !!b && a !== b;
}

// ─── Verified bar ────────────────────────────────────────────────────────────

/**
 * The bar for `verified: true` — "we checked it works", re-derived on every sweep
 * (scripts/verify-entries.ts):
 *   1. the entry is published and declares at least one access method
 *   2. no listed URL is dead (404/410, DNS failure, refused, bad TLS)
 *   3. at least one listed URL loads (2xx; 401 counts — an auth-gated endpoint is live)
 *   4. a linked GitHub repo exists, isn't archived, and was pushed within 12 months
 * Bot walls (403/429/5xx/timeouts) prove nothing either way: if they're all we
 * got, the verdict is null and the current flag is kept.
 */
export interface VerifyInput {
  status: string;
  accessMethods: string[];
  urls: { field: string; status: number | string }[];
  repo?: { found: boolean; archived: boolean | null; pushedAt: string | null } | null;
}

export interface VerifyVerdict {
  verified: boolean | null;
  reasons: string[];
}

const DEAD_CODES = new Set([
  'ENOTFOUND', 'ECONNREFUSED', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN',
]);

export function urlOutcome(status: number | string): 'ok' | 'dead' | 'inconclusive' {
  if (typeof status === 'number') {
    if ((status >= 200 && status < 300) || status === 401) return 'ok';
    if (status === 404 || status === 410) return 'dead';
    return 'inconclusive';
  }
  return DEAD_CODES.has(status) ? 'dead' : 'inconclusive';
}

export function verifyVerdict(input: VerifyInput, today: string): VerifyVerdict {
  const fails: string[] = [];
  if (input.status !== 'published') fails.push(`status ${input.status}`);
  if (!input.accessMethods.length) fails.push('no access method');
  const outcomes = input.urls.map((u) => ({ ...u, outcome: urlOutcome(u.status) }));
  for (const u of outcomes) if (u.outcome === 'dead') fails.push(`${u.field} dead (${u.status})`);
  if (input.repo) {
    if (!input.repo.found) fails.push('repo not found');
    else {
      if (input.repo.archived) fails.push('repo archived');
      if (input.repo.pushedAt && monthsSince(input.repo.pushedAt, today) >= 12) fails.push(`repo stale (last push ${input.repo.pushedAt})`);
    }
  }
  if (fails.length) return { verified: false, reasons: fails };
  if (outcomes.some((u) => u.outcome === 'ok') || input.repo?.found) return { verified: true, reasons: [] };
  return {
    verified: null,
    reasons: outcomes.map((u) => `${u.field} ${u.status}`),
  };
}
