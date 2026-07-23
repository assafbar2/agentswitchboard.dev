/**
 * cms.ts — content ops CLI (git-as-CMS edition).
 *
 * Operates directly on content/ files. Publishing = committing.
 *
 * Usage:
 *   npx tsx scripts/cms.ts categories                 # valid slugs + counts
 *   npx tsx scripts/cms.ts find <slug>                # entry summary
 *   npx tsx scripts/cms.ts feature <slug>             # feature an agent
 *   npx tsx scripts/cms.ts feature <slug> --off       # unfeature
 *   npx tsx scripts/cms.ts feature <slug> --until <ISO-date>
 *   npx tsx scripts/cms.ts update <slug> <field> <json-value>
 *   npx tsx scripts/cms.ts unpublish <slug>           # status -> archived
 *
 * Homepage slots are driven by the `featured` flag (+ optional
 * featuredUntil) — see lib/catalog.ts getHomepageAgents().
 * Remember: changes go live when committed & deployed, not on save.
 */

import * as fs from 'fs';
import * as path from 'path';
import { appendChangelog } from './lib/changelog';

const CONTENT = path.resolve(process.cwd(), 'content');

function agentPath(slug: string): string {
  return path.join(CONTENT, 'agents', `${slug}.json`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readAgent(slug: string): any | null {
  const p = agentPath(slug);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeAgent(slug: string, data: any): void {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(agentPath(slug), JSON.stringify(data, null, 2) + '\n');
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case 'categories': {
      const cats = JSON.parse(fs.readFileSync(path.join(CONTENT, 'categories.json'), 'utf8'));
      const files = fs.readdirSync(path.join(CONTENT, 'agents')).filter((f) => f.endsWith('.json'));
      const counts = new Map<string, number>();
      for (const f of files) {
        const a = JSON.parse(fs.readFileSync(path.join(CONTENT, 'agents', f), 'utf8'));
        for (const c of a.categories ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      console.log('LIVE CATEGORIES (slug · agents):');
      for (const c of cats) console.log(`  ${c.slug.padEnd(20)} ${counts.get(c.slug) ?? 0}`);
      break;
    }

    case 'find': {
      const [slug] = args;
      if (!slug) return usage();
      const a = readAgent(slug);
      if (!a) return console.log(`❌ ${slug}: not found`);
      console.log({
        name: a.name,
        status: a.status,
        featured: a.featured,
        featuredUntil: a.featuredUntil ?? null,
        tier: a.tier,
        accessMethods: a.accessMethods,
        file: `content/agents/${slug}.json`,
      });
      break;
    }

    case 'feature': {
      const [slug, ...flags] = args;
      if (!slug) return usage();
      const a = readAgent(slug);
      if (!a) return console.log(`❌ ${slug}: not found`);
      const off = flags.includes('--off');
      a.featured = !off;
      const untilIdx = flags.indexOf('--until');
      if (untilIdx >= 0 && flags[untilIdx + 1]) a.featuredUntil = flags[untilIdx + 1];
      if (off) delete a.featuredUntil;
      writeAgent(slug, a);
      appendChangelog({ action: 'updated', slug, name: a.name, note: off ? 'Unfeatured' : 'Featured' });
      console.log(`✅ ${slug}: featured=${!off}${a.featuredUntil ? ` until ${a.featuredUntil}` : ''} — commit to publish`);
      break;
    }

    case 'update': {
      const [slug, field, ...valueParts] = args;
      if (!slug || !field || valueParts.length === 0) return usage();
      const a = readAgent(slug);
      if (!a) return console.log(`❌ ${slug}: not found`);
      const raw = valueParts.join(' ');
      try {
        a[field] = JSON.parse(raw);
      } catch {
        a[field] = raw;
      }
      writeAgent(slug, a);
      appendChangelog({ action: 'updated', slug, name: a.name, note: `${field} updated` });
      console.log(`🔄 ${slug}.${field} updated — commit to publish`);
      break;
    }

    case 'unpublish': {
      const [slug] = args;
      if (!slug) return usage();
      const a = readAgent(slug);
      if (!a) return console.log(`❌ ${slug}: not found`);
      a.status = 'archived';
      writeAgent(slug, a);
      appendChangelog({ action: 'removed', slug, name: a.name });
      console.log(`🗑  ${slug}: status=archived — commit to remove from site`);
      break;
    }

    default:
      usage();
  }
}

function usage() {
  console.log(`Usage:
  npx tsx scripts/cms.ts categories
  npx tsx scripts/cms.ts find <slug>
  npx tsx scripts/cms.ts feature <slug> [--off] [--until <ISO-date>]
  npx tsx scripts/cms.ts update <slug> <field> <json-value>
  npx tsx scripts/cms.ts unpublish <slug>`);
}

main();
