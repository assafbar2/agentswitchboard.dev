/**
 * enrich.ts — live evidence for finalists, so no number comes from memory.
 *
 *   URL          → GET status with a browser UA, final URL, "moved" if the host changed
 *   owner/repo   → stars, created, last push, archived, renamed/transferred, homepage
 *   github URL   → both of the above
 *   npm:<pkg>    → exists? + last-week downloads
 *   pypi:<pkg>   → exists? + latest version
 *
 * Usage:
 *   npx tsx scripts/enrich.ts https://browserless.io browserless/browserless npm:@mozilla/firefox-devtools-mcp
 *
 * Read-only. Paste the output into the shortlist's evidence column.
 */

import { githubRepoOf, hostChanged } from './lib/weekly';
import { mapLimit, probeUrl, repoInfo } from './lib/net';

async function npmInfo(pkg: string): Promise<string> {
  const meta = await fetch(`https://registry.npmjs.org/${pkg.replace('/', '%2F')}`, { signal: AbortSignal.timeout(12_000) });
  if (!meta.ok) return `npm ${pkg}: not found (${meta.status})`;
  const dl = await fetch(`https://api.npmjs.org/downloads/point/last-week/${pkg}`, { signal: AbortSignal.timeout(12_000) })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return `npm ${pkg}: exists · ${dl?.downloads?.toLocaleString('en-US') ?? '?'} downloads last week`;
}

async function pypiInfo(pkg: string): Promise<string> {
  const r = await fetch(`https://pypi.org/pypi/${pkg}/json`, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) return `pypi ${pkg}: not found (${r.status})`;
  const j = await r.json();
  return `pypi ${pkg}: exists · latest ${j?.info?.version ?? '?'}`;
}

async function one(input: string): Promise<string> {
  try {
    if (input.startsWith('npm:')) return await npmInfo(input.slice(4));
    if (input.startsWith('pypi:')) return await pypiInfo(input.slice(5));
    const lines: string[] = [];
    if (/^https?:\/\//.test(input)) {
      const p = await probeUrl(input);
      const moved = hostChanged(input, p.finalUrl) ? ` · MOVED → ${p.finalUrl}` : p.finalUrl !== input ? ` · → ${p.finalUrl}` : '';
      lines.push(`url ${input}: ${p.status}${moved}`);
    }
    const repo = githubRepoOf(input);
    if (repo) {
      const r = await repoInfo(repo);
      if (!r.fullName) lines.push(`repo ${repo}: not found (${r.status})`);
      else {
        const renamed = r.fullName.toLowerCase() !== repo ? ` · RENAMED/TRANSFERRED → ${r.fullName}` : '';
        lines.push(
          `repo ${repo}: ${r.stars?.toLocaleString('en-US')}★ · created ${r.createdAt} · pushed ${r.pushedAt}` +
            `${r.archived ? ' · ARCHIVED' : ''}${renamed}${r.homepage ? ` · homepage ${r.homepage}` : ''}`,
        );
      }
    }
    return lines.length ? lines.join('\n') : `${input}: unrecognised (use a URL, owner/repo, npm:<pkg>, or pypi:<pkg>)`;
  } catch (e) {
    return `${input}: error ${(e as Error).message}`;
  }
}

async function main() {
  const inputs = process.argv.slice(2);
  if (!inputs.length) {
    console.log('Usage: npx tsx scripts/enrich.ts <url|owner/repo|npm:pkg|pypi:pkg> ...');
    process.exit(1);
  }
  const results = await mapLimit(inputs, 6, one);
  console.log(`# checked ${new Date().toISOString().slice(0, 10)}`);
  for (const r of results) console.log(r);
}

main();
