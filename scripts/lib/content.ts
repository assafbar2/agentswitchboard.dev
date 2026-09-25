/**
 * Filesystem helpers shared by the weekly-run scripts: catalog loading and
 * the candidate ledger file.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  addDays,
  buildIndex,
  lastDropDate,
  lookbackDays,
  parseLedger,
  type IndexedAgent,
  type LedgerEntry,
} from './weekly';

const CONTENT = path.resolve(process.cwd(), 'content');

export interface AgentFile {
  slug: string;
  name: string;
  status: string;
  agentUrl: string;
  providerUrl: string;
  providerName: string;
  featured?: boolean;
  verified?: boolean;
}

export function loadAgents(): AgentFile[] {
  const dir = path.join(CONTENT, 'agents');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as AgentFile);
}

/** Index over every entry, archived included, so archived never returns as "new". */
export function loadIndex(): IndexedAgent[] {
  return buildIndex(loadAgents());
}

/**
 * The ledger lives OUTSIDE the public repo by default: it records why
 * candidates were passed over. Override with ASB_LEDGER.
 */
export function ledgerPath(): string {
  return process.env.ASB_LEDGER || path.join(os.homedir(), '.asb', 'candidate-ledger.jsonl');
}

export function readLedger(): LedgerEntry[] {
  const p = ledgerPath();
  return fs.existsSync(p) ? parseLedger(fs.readFileSync(p, 'utf8')) : [];
}

export function appendLedger(entries: LedgerEntry[]): void {
  const p = ledgerPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Last "Weekly drop YYYY-MM-DD" date from local git history (null if none). */
export function lastDropFromGit(): string | null {
  let out = '';
  try {
    out = execSync(`git log -E --grep='^Weekly drop [0-9]{4}-[0-9]{2}-[0-9]{2}' --format=%s`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
  } catch {
    return null;
  }
  return lastDropDate(out.split('\n'));
}

/** First day of the research window: today minus lookbackDays(). */
export function windowStart(on = today()): string {
  return addDays(on, -lookbackDays(lastDropFromGit(), on));
}
