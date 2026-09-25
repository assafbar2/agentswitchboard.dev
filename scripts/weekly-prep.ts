/**
 * weekly-prep.ts — Step 0 of the weekly content run, as one read-only command.
 *
 * Prints: git sync state · last drop + lookback window · published/archived
 * counts · maintenance due? · ledger rechecks due · platform-audit names with no
 * catalog match. Writes the dedup index (slug, name, hosts, repo, status) as TSV.
 *
 * Usage:
 *   git fetch origin && npx tsx scripts/weekly-prep.ts [--out /tmp/asb-index.tsv] [--today YYYY-MM-DD]
 *
 * Never writes to content/ or git. See docs/WEEKLY_DROP_RUNBOOK.md §1.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { lastDropFromGit, ledgerPath, loadAgents, readLedger, today as todayIso } from './lib/content';
import {
  addDays,
  buildIndex,
  latestByKey,
  ledgerVerdict,
  lookbackDays,
  normalizeName,
  WINDOW_CAP_DAYS,
} from './lib/weekly';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function sh(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function main() {
  const today = arg('--today') ?? todayIso();
  const out = arg('--out') ?? '/tmp/asb-index.tsv';

  // 1. Sync state (run `git fetch origin` first; this reads local refs only)
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  const behind = sh('git rev-list --count HEAD..origin/main') || '?';
  const ahead = sh('git rev-list --count origin/main..HEAD') || '?';
  const dirty = sh('git status --porcelain').split('\n').filter(Boolean);
  console.log(`SYNC      branch ${branch} · behind ${behind} · ahead ${ahead} · dirty files ${dirty.length}`);
  if (behind !== '0') console.log('          ⚠️  not level with origin/main — pull before researching');

  // 2. Window
  const last = lastDropFromGit();
  const days = lookbackDays(last, today);
  const start = addDays(today, -days);
  console.log(
    `WINDOW    last drop ${last ?? 'none'} → ${days}d (cap ${WINDOW_CAP_DAYS}) · research ${start} → ${today}`,
  );
  const maintenance = !last || last.slice(0, 7) !== today.slice(0, 7);
  console.log('MODES     A (launches) + B (established gaps) — both every run');
  console.log(
    `MAINT     ${maintenance ? 'due (first run this month): staleness-sweep + verify-entries' : 'not due (already ran this month)'}`,
  );

  // 3. Counts + index
  const agents = loadAgents();
  const published = agents.filter((a) => a.status === 'published').length;
  const archived = agents.filter((a) => a.status === 'archived').length;
  console.log(`CATALOG   published ${published} · archived ${archived} · files ${agents.length} (quote "published")`);

  const index = buildIndex(agents);
  const tsv = index.map((a) => [a.slug, a.name, a.hosts.join(','), a.repo ?? '', a.status].join('\t'));
  fs.writeFileSync(out, tsv.join('\n') + '\n');
  console.log(`INDEX     ${index.length} entries → ${out} (slug · name · hosts · repo · status)`);

  // 4. Ledger
  const ledger = readLedger();
  const latest = latestByKey(ledger);
  const due = [...latest.values()].filter((e) => ledgerVerdict(e, today) === 'recheck');
  console.log(`LEDGER    ${ledgerPath()} · ${latest.size} candidates on file · ${due.length} due for recheck`);
  for (const e of due) console.log(`          ↻ ${e.name} (${e.key}) — ${e.status} ${e.reason ?? ''} since ${e.date}`);

  // 5. Platform audit (Mode B, every run): names from docs/platform-audit.txt with no catalog match
  const auditFile = path.resolve(process.cwd(), 'docs', 'platform-audit.txt');
  if (fs.existsSync(auditFile)) {
    const hay = index.map((a) => `${normalizeName(a.slug)} ${normalizeName(a.name)} ${a.hosts.join(' ')}`).join('\n');
    const names = fs
      .readFileSync(auditFile, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*/, '').trim())
      .filter(Boolean);
    const missing = names.filter((n) => {
      const key = latest.get(`platform:${normalizeName(n)}`);
      if (key && ledgerVerdict(key, today) === 'skip') return false;
      return !hay.includes(normalizeName(n));
    });
    console.log(`PLATFORMS ${names.length} on the audit list · ${missing.length} unmatched and not settled in the ledger`);
    if (missing.length) console.log(`          ${missing.join(' ')}`);
  }
}

main();
