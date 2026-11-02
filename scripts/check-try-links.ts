/**
 * check-try-links.ts — every Try it link in CHANGELOG.md's highlights opens a
 * page the build generates.
 *
 * Reads the build's manifests in .next: the prerendered paths, plus the
 * routes served without parameters (such as /browse), so run it after
 * `npm run build`. CI does, right after the build step.
 *
 * Run: npx tsx scripts/check-try-links.ts
 * Exit 1 if any Try it link points elsewhere.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getReleases, tryItProblems } from '../lib/changelog';

const NEXT = path.resolve(process.cwd(), '.next');

function readManifest<T>(file: string): T {
  const full = path.join(NEXT, file);
  if (!fs.existsSync(full)) {
    console.error(`❌ ${path.relative(process.cwd(), full)} not found: run \`npm run build\` first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T;
}

const prerendered = Object.keys(readManifest<{ routes: Record<string, unknown> }>('prerender-manifest.json').routes);
const routes = Object.values(readManifest<Record<string, string>>('app-path-routes-manifest.json'));
const pages = new Set([...prerendered, ...routes.filter((route) => !route.includes('['))]);

const releases = getReleases();
const links = releases.reduce((n, r) => n + r.highlights.length, 0);
const problems = tryItProblems(releases, pages);

if (problems.length > 0) {
  console.error(`❌ ${problems.length} of ${links} Try it links open no page:`);
  for (const problem of problems) console.error(`   ${problem}`);
  process.exit(1);
}
console.log(`✅ all ${links} Try it links open a page the build generates (${pages.size} pages)`);
