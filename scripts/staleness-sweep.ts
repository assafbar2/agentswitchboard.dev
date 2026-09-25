/**
 * staleness-sweep.ts — find existing entries whose facts have drifted.
 *
 * check-links.ts only catches dead URLs (404/410/DNS). This catches the
 * quieter drift that needs an UPDATE or ARCHIVE:
 *   MOVED     agentUrl/providerUrl redirects to a different host
 *   RENAMED   GitHub repo was renamed or transferred (org change → check providerName)
 *   ARCHIVED  GitHub repo is archived
 *   STALE     GitHub repo has no push in 12+ months
 *
 * Usage:
 *   npx tsx scripts/staleness-sweep.ts                 # everything (published only)
 *   npx tsx scripts/staleness-sweep.ts --github-only   # skip URL probes (fast)
 *   npx tsx scripts/staleness-sweep.ts --limit 50      # first N entries (smoke test)
 *
 * Read-only: prints a markdown report with suggested cms.ts commands.
 * Nothing is applied — findings go to the shortlist as UPDATE/ARCHIVE rows.
 */

import { loadAgents, today as todayIso } from './lib/content';
import { mapLimit, probeUrl, repoInfo } from './lib/net';
import { githubRepoOf, hostChanged, monthsSince } from './lib/weekly';

interface Finding {
  slug: string;
  kind: 'MOVED' | 'RENAMED' | 'ARCHIVED' | 'STALE';
  detail: string;
  suggest?: string;
}

async function main() {
  const githubOnly = process.argv.includes('--github-only');
  const li = process.argv.indexOf('--limit');
  const limit = li >= 0 ? Number(process.argv[li + 1]) : Infinity;
  const today = todayIso();

  const agents = loadAgents()
    .filter((a) => a.status === 'published')
    .slice(0, limit);
  const findings: Finding[] = [];

  // GitHub repos (deduped: several entries can share one repo)
  const repoSlugs = new Map<string, string[]>();
  for (const a of agents) {
    const r = githubRepoOf(a.agentUrl) ?? githubRepoOf(a.providerUrl);
    if (r) repoSlugs.set(r, [...(repoSlugs.get(r) ?? []), a.slug]);
  }
  console.error(`Checking ${repoSlugs.size} GitHub repos...`);
  const infos = await mapLimit([...repoSlugs.keys()], 8, repoInfo);
  for (const info of infos) {
    for (const slug of repoSlugs.get(info.requested) ?? []) {
      if (!info.fullName) continue; // 404s are check-links.ts territory
      if (info.fullName.toLowerCase() !== info.requested) {
        findings.push({
          slug,
          kind: 'RENAMED',
          detail: `${info.requested} → ${info.fullName}`,
          suggest: `npx tsx scripts/cms.ts update ${slug} agentUrl '"https://github.com/${info.fullName}"'  # and check providerName`,
        });
      }
      if (info.archived) findings.push({ slug, kind: 'ARCHIVED', detail: `${info.fullName} is archived`, suggest: `npx tsx scripts/cms.ts unpublish ${slug}  # only if no successor` });
      if (info.pushedAt && monthsSince(info.pushedAt, today) >= 12)
        findings.push({ slug, kind: 'STALE', detail: `${info.fullName} last push ${info.pushedAt}` });
    }
  }

  if (!githubOnly) {
    const urlSlugs = new Map<string, string[]>();
    for (const a of agents) {
      for (const u of [a.agentUrl, a.providerUrl]) {
        if (!u?.startsWith('http') || githubRepoOf(u)) continue;
        urlSlugs.set(u, [...(urlSlugs.get(u) ?? []), a.slug]);
      }
    }
    console.error(`Probing ${urlSlugs.size} URLs...`);
    const urls = [...urlSlugs.keys()];
    const probes = await mapLimit(urls, 10, probeUrl);
    probes.forEach((p, i) => {
      const from = urls[i];
      if (typeof p.status !== 'number' || p.status >= 400 || !hostChanged(from, p.finalUrl)) return;
      for (const slug of new Set(urlSlugs.get(from) ?? [])) {
        const a = agents.find((x) => x.slug === slug);
        const fields = (['agentUrl', 'providerUrl'] as const).filter((f) => a?.[f] === from);
        findings.push({
          slug,
          kind: 'MOVED',
          detail: `${fields.join('+')} ${from} → ${p.finalUrl}`,
          suggest: fields.map((f) => `npx tsx scripts/cms.ts update ${slug} ${f} '"${p.finalUrl}"'`).join(' && '),
        });
      }
    });
  }

  const order = { ARCHIVED: 0, RENAMED: 1, MOVED: 2, STALE: 3 };
  findings.sort((a, b) => order[a.kind] - order[b.kind] || a.slug.localeCompare(b.slug));
  console.log(`## Staleness sweep ${today} — ${agents.length} published entries, ${findings.length} findings\n`);
  if (!findings.length) return console.log('Nothing drifted.');
  console.log('| Kind | Slug | Detail | Suggested command (verify first) |\n|---|---|---|---|');
  for (const f of findings) console.log(`| ${f.kind} | ${f.slug} | ${f.detail} | ${f.suggest ? `\`${f.suggest}\`` : ''} |`);
}

main();
