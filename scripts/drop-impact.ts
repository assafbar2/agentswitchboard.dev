/**
 * drop-impact.ts — what a content change does to the rest of the site.
 *
 * A listing reaches past its own page: it joins task pages, shifts other
 * listings' alternatives and Related Agents (shared keywords are weighted by
 * how rare they are across the whole catalog), and can give an alternatives
 * page to another listing or take one away. This compares the catalog in
 * content/ with the one at a base ref and prints the difference as Markdown,
 * for the PR description.
 *
 * Run: npx tsx scripts/drop-impact.ts [--base origin/main]
 */

import { execFileSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getAllCategories, getEveryAgent, getHomepageAgents } from '../lib/catalog';
import { getDropSchedule } from '../lib/drops';
import { getAlternatives, MAX_RELATED, MIN_ALTERNATIVES } from '../lib/related';
import { taskMatches } from '../lib/search';
import { getStacks } from '../lib/stacks';
import { getTasks, TASK_PAGE_SIZE } from '../lib/tasks';
import { tryThis } from '../lib/try-this';
import type { Agent } from '../lib/types';
import { impactReport, type ListingFacts, type Snapshot } from './lib/impact';

function setupFacts(agent: Agent): Pick<ListingFacts, 'setup' | 'fallbacks'> {
  const setup = [
    agent.mcpEndpoint && 'MCP address',
    agent.mcpCommand && 'MCP launch command',
    agent.install && 'install command',
    agent.apiBaseUrl && 'API base URL',
    agent.quickstartUrl && 'setup guide',
  ].filter((s): s is string => !!s);
  const has = (method: Agent['accessMethods'][number]) => agent.accessMethods.includes(method);
  const fallbacks = [
    has('mcp') && !agent.mcpEndpoint && !agent.mcpCommand && 'mcp',
    has('cli') && !agent.install && 'cli',
    has('api') && !agent.apiBaseUrl && 'api',
  ].filter((m): m is string => !!m);
  return { setup, fallbacks };
}

/** The catalog in ./content, as the site derives it. */
async function snapshot(): Promise<Snapshot> {
  const all = await getEveryAgent();
  const listings: Record<string, ListingFacts> = {};
  for (const agent of all) {
    listings[agent.slug] = {
      name: agent.name,
      hash: crypto.createHash('sha1').update(JSON.stringify(agent)).digest('hex'),
      icon: !!agent.iconUrl,
      skills: agent.skills.length,
      prompts: tryThis(agent)?.prompts.length ?? 0,
      alternatives: getAlternatives(agent, all).map((a) => a.agent.slug),
      ...setupFacts(agent),
    };
  }
  const tasks = getTasks().map((t) => ({ slug: t.slug, label: t.label, fits: taskMatches(all, t).map((a) => a.slug) }));
  const stacks = getStacks();
  const alternativesPages = Object.values(listings).filter((l) => l.alternatives.length >= MIN_ALTERNATIVES).length;
  const categories = (await getAllCategories()).length;
  return {
    listings,
    tasks,
    stacks: Object.fromEntries(stacks.map((s) => [s.slug, s.items.map((i) => i.slug)])),
    homepage: (await getHomepageAgents()).map((h) => h.agent.slug),
    pages: all.length + alternativesPages + tasks.length + getDropSchedule().drops.length + categories + stacks.length,
  };
}

/**
 * The base's snapshot: its content/ unpacked into a temporary directory, and
 * this script run again from there, since the catalog modules read content/
 * from the working directory when they load.
 */
function baseSnapshot(base: string): Snapshot {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drop-impact-'));
  try {
    const tar = path.join(dir, 'content.tar');
    execFileSync('git', ['archive', '--format=tar', '-o', tar, base, 'content']);
    execFileSync('tar', ['-xf', tar, '-C', dir]);
    const file = path.join(dir, 'snapshot.json');
    execFileSync(process.execPath, [...process.execArgv, path.resolve(process.argv[1]), '--snapshot', file], {
      cwd: dir,
      stdio: 'inherit',
    });
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Snapshot;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function option(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const out = option('--snapshot');
  if (out) {
    fs.writeFileSync(out, JSON.stringify(await snapshot()));
    return;
  }
  const base = option('--base') ?? 'origin/main';
  const sha = execFileSync('git', ['rev-parse', '--short', base], { encoding: 'utf8' }).trim();
  const before = baseSnapshot(base);
  const after = await snapshot();
  process.stdout.write(
    impactReport(before, after, {
      base: /^[0-9a-f]{4,40}$/i.test(base) ? sha : `${base} (${sha})`,
      minAlternatives: MIN_ALTERNATIVES,
      relatedSize: MAX_RELATED,
      taskPageSize: TASK_PAGE_SIZE,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
