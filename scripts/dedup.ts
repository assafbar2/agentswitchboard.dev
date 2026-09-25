/**
 * dedup.ts — check candidates against the catalog AND the candidate ledger
 * before spending any research on them.
 *
 * Matches by slug, name, GitHub repo, and host (archived entries included).
 * A host-only match is a "maybe": same company or domain, possibly a
 * different product — check the product, not the name.
 *
 * Usage:
 *   npx tsx scripts/dedup.ts "Mobile MCP|https://github.com/mobile-next/mobile-mcp" "Cohere|https://cohere.com"
 *   npx tsx scripts/dedup.ts --file candidates.txt      # one "Name|url-or-owner/repo" per line
 *
 * Verdicts: NEW · DUP (slug/name/repo) · MAYBE (host) · LEDGER-SKIP · LEDGER-RECHECK
 */

import * as fs from 'fs';
import { loadIndex, readLedger, today as todayIso } from './lib/content';
import { findMatches, latestByKey, ledgerKey, ledgerVerdict, parseCandidate } from './lib/weekly';

function main() {
  const fi = process.argv.indexOf('--file');
  const lines =
    fi >= 0
      ? fs.readFileSync(process.argv[fi + 1], 'utf8').split('\n')
      : process.argv.slice(2).filter((a) => a !== '--file');
  const cands = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map(parseCandidate);
  if (!cands.length) {
    console.log('Usage: npx tsx scripts/dedup.ts "Name|url-or-owner/repo" ... | --file candidates.txt');
    process.exit(1);
  }

  const index = loadIndex();
  const latest = latestByKey(readLedger());
  const today = todayIso();
  let fresh = 0;
  for (const c of cands) {
    const label = c.name || c.repo || c.url || '?';
    const matches = findMatches(index, c);
    const strong = matches.filter((m) => m.kind !== 'host');
    const key = ledgerKey(c);
    const led = key ? latest.get(key) : undefined;
    const lv = ledgerVerdict(led, today);
    let verdict: string;
    if (strong.length) verdict = `DUP          ${strong.map((m) => `${m.slug} (${m.kind}${m.status !== 'published' ? `, ${m.status}` : ''})`).join(', ')}`;
    else if (lv === 'skip') verdict = `LEDGER-SKIP  ${led!.status} ${led!.reason ?? ''} on ${led!.date}${led!.recheckAfter ? ` · recheck ${led!.recheckAfter}` : ''}`;
    else if (lv === 'recheck') verdict = `LEDGER-RECHECK ${led!.status} ${led!.reason ?? ''} on ${led!.date} — due`;
    else if (matches.length) verdict = `MAYBE        same host as ${matches.map((m) => m.slug).join(', ')} — check the product`;
    else {
      verdict = 'NEW';
      fresh++;
    }
    console.log(`${label.padEnd(36)} ${verdict}`);
  }
  console.log(`\n${fresh} new of ${cands.length}`);
}

main();
