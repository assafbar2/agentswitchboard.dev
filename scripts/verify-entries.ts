/**
 * verify-entries.ts — apply the verified bar (scripts/lib/weekly.ts
 * verifyVerdict) to every entry.
 *
 * The bar (see verifyVerdict): published · ≥1 access method · no dead URL
 * (404/410/DNS/TLS) · at least one URL loads (2xx or 401) or a live repo ·
 * any linked GitHub repo exists, isn't archived, and was pushed in the last
 * 12 months. Bot walls only (403/429/5xx/timeout, after one retry) → the
 * current value is kept and the entry is listed for a person to check.
 *
 * Usage:
 *   npx tsx scripts/verify-entries.ts            # dry run: report only
 *   npx tsx scripts/verify-entries.ts --apply    # write the `verified` field
 *   npx tsx scripts/verify-entries.ts --slug a,b # limit to some entries
 *
 * --apply only rewrites `verified` (no updatedAt or changelog churn).
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadAgents, today as todayIso } from './lib/content';
import { mapLimit, probeUrl, repoInfo, type RepoInfo } from './lib/net';
import { githubRepoOf, urlOutcome, verifyVerdict } from './lib/weekly';

interface Row {
  slug: string;
  was: boolean;
  now: boolean | null;
  reasons: string[];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const si = process.argv.indexOf('--slug');
  const only = si >= 0 ? new Set(process.argv[si + 1].split(',')) : null;
  const today = todayIso();

  const agents = loadAgents().filter((a) => !only || only.has(a.slug)) as (ReturnType<typeof loadAgents>[number] & {
    accessMethods?: string[];
  })[];

  // Repos (one lookup per repo)
  const repoOf = new Map<string, string>();
  for (const a of agents) {
    const r = githubRepoOf(a.agentUrl) ?? githubRepoOf(a.providerUrl);
    if (r) repoOf.set(a.slug, r);
  }
  const repos = [...new Set(repoOf.values())];
  console.error(`Checking ${repos.length} GitHub repos...`);
  const repoInfos = new Map<string, RepoInfo>();
  (await mapLimit(repos, 8, repoInfo)).forEach((r) => repoInfos.set(r.requested, r));

  // Non-repo URLs (one probe per URL, one retry for inconclusive results)
  const urls = [
    ...new Set(
      agents.flatMap((a) => [a.agentUrl, a.providerUrl]).filter((u) => u?.startsWith('http') && !githubRepoOf(u)),
    ),
  ];
  console.error(`Probing ${urls.length} URLs...`);
  const status = new Map<string, number | string>();
  // A bare domain root almost never truly 404s; that's a geo/locale redirect quirk (www.ibm.com).
  const rootQuirk = (u: string, st: number | string) =>
    st === 404 && new URL(u).pathname.replace(/\/+$/, '') === '' ? 'ROOT-404' : st;
  (await mapLimit(urls, 10, probeUrl)).forEach((p, i) => status.set(urls[i], rootQuirk(urls[i], p.status)));
  const retry = urls.filter((u) => urlOutcome(status.get(u)!) === 'inconclusive');
  if (retry.length) {
    console.error(`Retrying ${retry.length} inconclusive URLs...`);
    (await mapLimit(retry, 4, probeUrl)).forEach((p, i) => status.set(retry[i], rootQuirk(retry[i], p.status)));
  }

  const rows: Row[] = [];
  for (const a of agents) {
    const repoName = repoOf.get(a.slug);
    const info = repoName ? repoInfos.get(repoName) : undefined;
    const repo = info
      ? info.status === 404
        ? { found: false, archived: null, pushedAt: null }
        : info.fullName
          ? { found: true, archived: info.archived, pushedAt: info.pushedAt }
          : null // API error: say nothing about the repo
      : null;
    const pageUrls = (['agentUrl', 'providerUrl'] as const)
      .filter((f) => a[f]?.startsWith('http') && !githubRepoOf(a[f]))
      .map((f) => ({ field: f, status: status.get(a[f]) ?? 'ERR' }));
    const v = verifyVerdict({ status: a.status, accessMethods: a.accessMethods ?? [], urls: pageUrls, repo }, today);
    rows.push({ slug: a.slug, was: !!a.verified, now: v.verified, reasons: v.reasons });
  }

  const promote = rows.filter((r) => r.now === true && !r.was);
  const demote = rows.filter((r) => r.now === false && r.was);
  const keep = rows.filter((r) => r.now === null);
  const final = rows.map((r) => (r.now === null ? r.was : r.now));

  console.log(`## Verified sweep ${today}\n`);
  console.log(
    `${rows.length} entries · verified after: ${final.filter(Boolean).length} · ` +
      `promoted ${promote.length} · demoted ${demote.length} · inconclusive (kept) ${keep.length}\n`,
  );
  if (promote.length) console.log(`### Promoted → true\n${promote.map((r) => `- ${r.slug}`).join('\n')}\n`);
  if (demote.length) console.log(`### Demoted → false\n${demote.map((r) => `- ${r.slug} — ${r.reasons.join('; ')}`).join('\n')}\n`);
  if (keep.length)
    console.log(`### Inconclusive (value kept; check by hand)\n${keep.map((r) => `- ${r.slug} (${r.was}) — ${r.reasons.join('; ')}`).join('\n')}\n`);

  if (apply) {
    const dir = path.resolve(process.cwd(), 'content', 'agents');
    let written = 0;
    for (const r of [...promote, ...demote]) {
      const file = path.join(dir, `${r.slug}.json`);
      const raw = fs.readFileSync(file, 'utf8');
      const re = /("verified"\s*:\s*)(true|false)/g;
      // Edit the value in place so hand-formatted files keep their layout.
      const out =
        (raw.match(re) ?? []).length === 1
          ? raw.replace(re, `$1${r.now}`)
          : JSON.stringify({ ...JSON.parse(raw), verified: r.now }, null, 2) + '\n';
      fs.writeFileSync(file, out);
      written++;
    }
    console.log(`Applied: ${written} files updated.`);
  }
}

main();
