/**
 * ledger.ts — the candidate ledger: every candidate the weekly run evaluates,
 * so rejects and near-misses aren't re-researched and late bloomers resurface
 * on a date instead of by luck.
 *
 * Append-only JSONL, stored OUTSIDE the public repo (default
 * ~/.asb/candidate-ledger.jsonl; override with ASB_LEDGER). Use neutral
 * reason codes; keep narrative judgments out of it.
 *
 * Usage:
 *   npx tsx scripts/ledger.ts add <key|url> --name "Ando" --status watch --reason NOT-USABLE --recheck 2026-10-23 [--signal "…"] [--note "…"]
 *   npx tsx scripts/ledger.ts get <key|url>
 *   npx tsx scripts/ledger.ts due [--date YYYY-MM-DD]
 *   npx tsx scripts/ledger.ts list [--status rejected]
 *
 * Keys: GitHub "owner/repo" when there is one, else the host (a URL is
 * normalized for you), else "name:<normalized-name>". Platform-audit
 * outcomes use "platform:<name>".
 */

import { appendLedger, ledgerPath, readLedger, today as todayIso } from './lib/content';
import {
  latestByKey,
  ledgerKey,
  ledgerVerdict,
  LEDGER_STATUSES,
  REASON_CODES,
  type LedgerEntry,
  type LedgerStatus,
  type ReasonCode,
} from './lib/weekly';

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function keyFrom(input: string): string {
  if (input.startsWith('platform:') || input.startsWith('name:')) return input.toLowerCase();
  if (/^https?:\/\//.test(input)) return ledgerKey({ url: input }) ?? input;
  if (/^[\w.-]+\/[\w.-]+$/.test(input)) return ledgerKey({ repo: input }) ?? input;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(input)) return ledgerKey({ url: `https://${input}` }) ?? input;
  return ledgerKey({ name: input }) ?? input;
}

function fmt(e: LedgerEntry): string {
  return [
    e.date,
    e.status.padEnd(8),
    (e.reason ?? '').padEnd(15),
    e.key,
    `(${e.name})`,
    e.recheckAfter ? `recheck ${e.recheckAfter}` : '',
    e.signal ? `· ${e.signal}` : '',
  ]
    .filter(Boolean)
    .join('  ');
}

function main() {
  const [cmd, target] = process.argv.slice(2);
  const today = flag('--date') ?? todayIso();

  switch (cmd) {
    case 'add': {
      if (!target) return usage();
      const status = flag('--status') as LedgerStatus | undefined;
      const reason = flag('--reason') as ReasonCode | undefined;
      if (!status || !LEDGER_STATUSES.includes(status)) {
        console.log(`❌ --status must be one of: ${LEDGER_STATUSES.join(', ')}`);
        process.exit(1);
      }
      if (reason && !REASON_CODES.includes(reason)) {
        console.log(`❌ --reason must be one of: ${REASON_CODES.join(', ')}`);
        process.exit(1);
      }
      const recheck = flag('--recheck');
      if (recheck && !/^\d{4}-\d{2}-\d{2}$/.test(recheck)) {
        console.log('❌ --recheck must be YYYY-MM-DD');
        process.exit(1);
      }
      const entry: LedgerEntry = {
        key: keyFrom(target),
        name: flag('--name') ?? target,
        status,
        date: today,
        ...(reason ? { reason } : {}),
        ...(recheck ? { recheckAfter: recheck } : {}),
        ...(flag('--signal') ? { signal: flag('--signal') } : {}),
        ...(flag('--note') ? { note: flag('--note') } : {}),
      };
      appendLedger([entry]);
      console.log(`✅ ${fmt(entry)}  → ${ledgerPath()}`);
      break;
    }
    case 'get': {
      if (!target) return usage();
      const key = keyFrom(target);
      const history = readLedger().filter((e) => e.key === key);
      if (!history.length) return console.log(`${key}: not in ledger (new)`);
      for (const e of history) console.log(fmt(e));
      console.log(`→ ${ledgerVerdict(latestByKey(history).get(key), today)}`);
      break;
    }
    case 'due': {
      const due = [...latestByKey(readLedger()).values()].filter((e) => ledgerVerdict(e, today) === 'recheck');
      console.log(`${due.length} due for recheck on ${today} (${ledgerPath()})`);
      for (const e of due) console.log(fmt(e));
      break;
    }
    case 'list': {
      const st = flag('--status');
      const all = [...latestByKey(readLedger()).values()].filter((e) => !st || e.status === st);
      for (const e of all.sort((a, b) => a.key.localeCompare(b.key))) console.log(fmt(e));
      console.log(`${all.length} candidates (${ledgerPath()})`);
      break;
    }
    default:
      usage();
  }
}

function usage() {
  console.log(`Usage:
  npx tsx scripts/ledger.ts add <key|url> --name <name> --status <${LEDGER_STATUSES.join('|')}> [--reason <code>] [--recheck YYYY-MM-DD] [--signal "…"] [--note "…"]
  npx tsx scripts/ledger.ts get <key|url>
  npx tsx scripts/ledger.ts due [--date YYYY-MM-DD]
  npx tsx scripts/ledger.ts list [--status <status>]
Reason codes: ${REASON_CODES.join(' ')}`);
}

main();
