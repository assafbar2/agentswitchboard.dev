/**
 * Network helpers for the weekly-run scripts: URL probing with a browser UA
 * and GitHub REST lookups. Read-only; never writes anywhere.
 */

import { execSync } from 'child_process';

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 AgentSwitchboardWeekly/1.0';
const TIMEOUT_MS = 12_000;

export interface Probe {
  status: number | string;
  finalUrl: string;
}

/**
 * GET with a browser UA, following redirects. GET only: some sites 404 on
 * HEAD while serving GET (azure), and some 403 anything bot-like.
 */
export async function probeUrl(url: string): Promise<Probe> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/json;q=0.9,*/*;q=0.8' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    res.body?.cancel().catch(() => {});
    return { status: res.status, finalUrl: res.url || url };
  } catch (e) {
    const cause = (e as { cause?: { code?: string } }).cause?.code;
    return { status: cause ?? (e as Error).name ?? 'ERR', finalUrl: url };
  }
}

let cachedToken: string | null | undefined;
function githubToken(): string | null {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  if (!cachedToken) {
    try {
      cachedToken = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
    } catch {
      cachedToken = null;
    }
  }
  return cachedToken;
}

export async function githubGet<T>(path: string): Promise<{ status: number; data: T | null }> {
  const token = githubToken();
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'agentswitchboard-weekly',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return { status: res.status, data: res.ok ? ((await res.json()) as T) : null };
}

export interface RepoInfo {
  requested: string;
  fullName: string | null; // differs from requested → renamed or transferred
  stars: number | null;
  createdAt: string | null;
  pushedAt: string | null;
  archived: boolean | null;
  homepage: string | null;
  topics: string[];
  status: number;
}

export async function repoInfo(repo: string): Promise<RepoInfo> {
  type R = {
    full_name: string;
    stargazers_count: number;
    created_at: string;
    pushed_at: string;
    archived: boolean;
    homepage: string | null;
    topics?: string[];
  };
  try {
    const { status, data } = await githubGet<R>(`/repos/${repo}`);
    return {
      requested: repo,
      fullName: data?.full_name ?? null,
      stars: data?.stargazers_count ?? null,
      createdAt: data?.created_at?.slice(0, 10) ?? null,
      pushedAt: data?.pushed_at?.slice(0, 10) ?? null,
      archived: data?.archived ?? null,
      homepage: data?.homepage || null,
      topics: data?.topics ?? [],
      status,
    };
  } catch {
    return { requested: repo, fullName: null, stars: null, createdAt: null, pushedAt: null, archived: null, homepage: null, topics: [], status: 0 };
  }
}

/** Run async jobs with a concurrency limit, preserving input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}
