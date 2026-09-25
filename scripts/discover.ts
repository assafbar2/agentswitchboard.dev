/**
 * discover.ts — pull candidate leads from the scriptable sources, already
 * deduped against the catalog and the candidate ledger. Leads only: every
 * survivor still needs judgment and scripts/enrich.ts verification.
 *
 * Usage:
 *   npx tsx scripts/discover.ts hn            [--since YYYY-MM-DD] [--min-points 50]
 *   npx tsx scripts/discover.ts github-new    [--since YYYY-MM-DD] [--min-stars 100]
 *   npx tsx scripts/discover.ts github-rising [--days 365] [--min-stars 5000]
 *   npx tsx scripts/discover.ts mcp-registry  [--since YYYY-MM-DD] [--include-community]
 *   add --all to also print DUP / LEDGER-SKIP rows
 *
 * --since defaults to the window start (last "Weekly drop" subject date,
 * capped at 14 days). github-rising has no keyword filter on purpose:
 * popular agent repos with no topics and plain descriptions (garrytan/gbrain,
 * 30k★, no topics) never surface in topic or keyword searches. Record
 * non-products in the ledger once and they drop out of future runs.
 */

import { loadIndex, readLedger, today as todayIso, windowStart } from './lib/content';
import { githubGet } from './lib/net';
import {
  addDays,
  findMatches,
  hostOf,
  latestByKey,
  ledgerKey,
  ledgerVerdict,
  type Candidate,
  type IndexedAgent,
  type LedgerEntry,
} from './lib/weekly';

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const showAll = process.argv.includes('--all');

interface Lead extends Candidate {
  label: string;
  info: string;
}

function classify(index: IndexedAgent[], latest: Map<string, LedgerEntry>, today: string, lead: Lead): string {
  const m = findMatches(index, lead);
  const strong = m.filter((x) => x.kind !== 'host');
  if (strong.length) return `DUP:${strong[0].slug}`;
  const key = ledgerKey(lead);
  const v = ledgerVerdict(key ? latest.get(key) : undefined, today);
  if (v === 'skip') return `LEDGER-SKIP:${latest.get(key!)!.status}`;
  if (v === 'recheck') return 'RECHECK';
  if (m.length) return `MAYBE:${m[0].slug}`;
  return 'NEW';
}

function report(leads: Lead[]) {
  const index = loadIndex();
  const latest = latestByKey(readLedger());
  const today = todayIso();
  const seen = new Set<string>();
  let shown = 0;
  for (const l of leads) {
    const k = ledgerKey(l) ?? l.label;
    if (seen.has(k)) continue;
    seen.add(k);
    const c = classify(index, latest, today, l);
    if (!showAll && (c.startsWith('DUP') || c.startsWith('LEDGER-SKIP'))) continue;
    shown++;
    console.log(`${c.padEnd(24)} ${l.info}  ${l.label}  ${l.url ?? ''}`);
  }
  console.log(`\n${shown} shown of ${seen.size} unique leads${showAll ? '' : ' (DUP and LEDGER-SKIP hidden; --all to show)'}`);
}

async function hn(since: string) {
  const minPts = Number(flag('--min-points') ?? 50);
  const ts = Math.floor(Date.parse(`${since}T00:00:00Z`) / 1000);
  const leads: Lead[] = [];
  for (const q of ['MCP', 'agent', 'agentic', 'LLM', 'Claude', 'Codex']) {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=200&numericFilters=${encodeURIComponent(`created_at_i>${ts},points>=${minPts}`)}`;
    const j = await fetch(url).then((r) => r.json());
    for (const h of j.hits ?? []) {
      leads.push({ label: h.title, url: h.url ?? undefined, info: `${String(h.points).padStart(4)}p ${h.created_at.slice(0, 10)}` });
    }
  }
  for (const tag of ['show_hn', 'launch_hn']) {
    const url = `https://hn.algolia.com/api/v1/search?tags=${tag}&hitsPerPage=200&numericFilters=${encodeURIComponent(`created_at_i>${ts},points>=${minPts}`)}`;
    const j = await fetch(url).then((r) => r.json());
    for (const h of j.hits ?? []) {
      leads.push({ label: h.title, url: h.url ?? undefined, info: `${String(h.points).padStart(4)}p ${h.created_at.slice(0, 10)}` });
    }
  }
  leads.sort((a, b) => parseInt(b.info) - parseInt(a.info));
  report(leads.filter((l) => l.url && hostOf(l.url) !== 'news.ycombinator.com'));
}

interface SearchRepo {
  full_name: string;
  html_url: string;
  stargazers_count: number;
  created_at: string;
  description: string | null;
  homepage: string | null;
}

async function searchRepos(q: string, pages: number): Promise<SearchRepo[]> {
  const out: SearchRepo[] = [];
  for (let p = 1; p <= pages; p++) {
    const { status, data } = await githubGet<{ items: SearchRepo[] }>(
      `/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=100&page=${p}`,
    );
    if (status !== 200 || !data) {
      console.error(`GitHub search "${q}" page ${p}: HTTP ${status}`);
      break;
    }
    out.push(...data.items);
    if (data.items.length < 100) break;
  }
  return out;
}

const toLead = (r: SearchRepo): Lead => ({
  name: r.full_name.split('/')[1],
  label: `${r.full_name} — ${(r.description ?? '').slice(0, 70)}`,
  repo: r.full_name,
  url: r.html_url,
  info: `${String(r.stargazers_count).padStart(6)}★ ${r.created_at.slice(0, 10)}`,
});

async function githubNew(since: string) {
  const min = Number(flag('--min-stars') ?? 100);
  const all: SearchRepo[] = [];
  for (const term of ['mcp', 'agent', 'agentic', 'llm', 'claude code', 'codex']) {
    all.push(...(await searchRepos(`${term} created:>=${since} stars:>=${min}`, 1)));
  }
  report(all.sort((a, b) => b.stargazers_count - a.stargazers_count).map(toLead));
}

async function githubRising() {
  const days = Number(flag('--days') ?? 365);
  const min = Number(flag('--min-stars') ?? 5000);
  const since = addDays(todayIso(), -days);
  report((await searchRepos(`created:>=${since} stars:>=${min}`, 3)).map(toLead));
}

async function mcpRegistry(since: string) {
  const community = process.argv.includes('--include-community');
  const byName = new Map<string, Lead>();
  let cursor: string | undefined;
  for (let page = 0; page < 400; page++) {
    const u = new URL('https://registry.modelcontextprotocol.io/v0/servers');
    u.searchParams.set('updated_since', `${since}T00:00:00Z`);
    u.searchParams.set('limit', '100');
    if (cursor) u.searchParams.set('cursor', cursor);
    const j = await fetch(u).then((r) => r.json());
    for (const s of j.servers ?? []) {
      const name: string = s.server?.name ?? '';
      if (!name || byName.has(name)) continue;
      if (!community && name.startsWith('io.github.')) continue;
      const repoUrl: string | undefined = s.server?.repository?.url || undefined;
      byName.set(name, {
        label: name,
        url: s.server?.websiteUrl || repoUrl,
        repo: repoUrl,
        info: (s._meta?.['io.modelcontextprotocol.registry/official']?.publishedAt ?? '').slice(0, 10),
      });
    }
    cursor = j.metadata?.nextCursor;
    if (!cursor) break;
  }
  console.error('Registry dates are publish dates, not launch dates — confirm launches on the vendor site.');
  report([...byName.values()]);
}

async function main() {
  const cmd = process.argv[2];
  const since = flag('--since') ?? windowStart();
  switch (cmd) {
    case 'hn':
      return hn(since);
    case 'github-new':
      return githubNew(since);
    case 'github-rising':
      return githubRising();
    case 'mcp-registry':
      return mcpRegistry(since);
    default:
      console.log('Usage: npx tsx scripts/discover.ts <hn|github-new|github-rising|mcp-registry> [--since YYYY-MM-DD] [--all]');
      process.exit(1);
  }
}

main();
