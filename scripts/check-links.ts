/**
 * check-links.ts — link-rot sweep over the live catalog.
 *
 * Fetches agents.json and probes every agentUrl + providerUrl.
 * Classification is deliberately conservative to avoid false alarms:
 *   DEAD — 404/410, DNS failure, or connection refused (page is gone)
 *   WARN — 403/429/5xx/timeouts (likely bot-blocking or flakiness, not rot)
 *   OK   — anything 200–399
 *
 * Usage:
 *   npx tsx scripts/check-links.ts             # human-readable report
 *   npx tsx scripts/check-links.ts --md        # markdown report (for CI issue)
 *
 * Exit code: 1 if any DEAD links found (lets CI fail/alert), else 0.
 */

const CATALOG_URL = 'https://agentswitchboard.dev/agents.json';
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 10;
const UA =
  'Mozilla/5.0 (compatible; AgentSwitchboardLinkCheck/1.0; +https://agentswitchboard.dev)';

type Verdict = 'ok' | 'warn' | 'dead';
interface Result {
  url: string;
  slugs: string[];
  status: number | string;
  verdict: Verdict;
}

async function probe(url: string): Promise<{ status: number | string; verdict: Verdict }> {
  for (const method of ['HEAD', 'GET'] as const) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': UA, Accept: '*/*' },
      });
      // Some servers reject HEAD (405/501) or lie with 403 — retry with GET
      if (method === 'HEAD' && [403, 405, 501].includes(res.status)) continue;
      if (res.status === 404 || res.status === 410) return { status: res.status, verdict: 'dead' };
      if (res.ok || (res.status >= 300 && res.status < 400)) return { status: res.status, verdict: 'ok' };
      return { status: res.status, verdict: 'warn' };
    } catch (err) {
      if (method === 'GET') {
        const msg = err instanceof Error ? (err.cause as { code?: string })?.code ?? err.name : 'ERR';
        // DNS failure / refused = site is gone; timeouts = warn only
        const dead = msg === 'ENOTFOUND' || msg === 'ECONNREFUSED';
        return { status: msg, verdict: dead ? 'dead' : 'warn' };
      }
    }
  }
  return { status: 'ERR', verdict: 'warn' };
}

async function main() {
  const md = process.argv.includes('--md');
  const catalog = await fetch(CATALOG_URL).then((r) => r.json());
  const agents: { slug: string; homepage?: string; providerUrl?: string }[] = catalog.agents;

  // Dedupe URLs, remembering which agents reference each
  const urlMap = new Map<string, Set<string>>();
  for (const a of agents) {
    for (const url of [a.homepage, a.providerUrl]) {
      if (!url || !url.startsWith('http')) continue;
      if (!urlMap.has(url)) urlMap.set(url, new Set());
      urlMap.get(url)!.add(a.slug);
    }
  }

  const urls = [...urlMap.keys()];
  console.error(`Checking ${urls.length} unique URLs across ${agents.length} agents...`);

  const results: Result[] = [];
  let inFlight = 0;
  let idx = 0;
  await new Promise<void>((resolve) => {
    const next = () => {
      while (inFlight < CONCURRENCY && idx < urls.length) {
        const url = urls[idx++];
        inFlight++;
        probe(url).then(({ status, verdict }) => {
          results.push({ url, slugs: [...urlMap.get(url)!], status, verdict });
          inFlight--;
          if (results.length === urls.length) resolve();
          else next();
        });
      }
    };
    next();
  });

  const dead = results.filter((r) => r.verdict === 'dead');
  const warn = results.filter((r) => r.verdict === 'warn');

  if (md) {
    console.log(`## Link-rot report — ${catalog.generated ?? 'now'}`);
    console.log(`\nChecked **${urls.length}** unique URLs across **${agents.length}** agents.`);
    console.log(`\n| | count |\n|---|---|\n| ✅ OK | ${results.length - dead.length - warn.length} |\n| ⚠️ Warn (bot-blocked/flaky) | ${warn.length} |\n| 💀 Dead | ${dead.length} |`);
    if (dead.length) {
      console.log(`\n### 💀 Dead links (action needed)\n`);
      console.log(`| URL | status | agents |\n|---|---|---|`);
      for (const r of dead) console.log(`| ${r.url} | ${r.status} | ${r.slugs.join(', ')} |`);
    }
    if (warn.length) {
      console.log(`\n<details><summary>⚠️ Warnings (${warn.length}) — likely bot-blocking, verify manually</summary>\n`);
      console.log(`| URL | status | agents |\n|---|---|---|`);
      for (const r of warn) console.log(`| ${r.url} | ${r.status} | ${r.slugs.join(', ')} |`);
      console.log(`\n</details>`);
    }
  } else {
    console.log(`\n✅ OK: ${results.length - dead.length - warn.length}  ⚠️ Warn: ${warn.length}  💀 Dead: ${dead.length}\n`);
    for (const r of dead) console.log(`💀 ${r.status}  ${r.url}  ← ${r.slugs.join(', ')}`);
    for (const r of warn) console.log(`⚠️  ${r.status}  ${r.url}  ← ${r.slugs.join(', ')}`);
  }

  process.exit(dead.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('link check failed:', err.message);
  process.exit(2);
});
