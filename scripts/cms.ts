/**
 * cms.ts — small ops CLI for Contentful content tasks.
 *
 * Usage:
 *   npx tsx scripts/cms.ts categories                 # live slug -> id map
 *   npx tsx scripts/cms.ts find <slug>                # entry summary
 *   npx tsx scripts/cms.ts feature <slug>             # feature an agent
 *   npx tsx scripts/cms.ts feature <slug> --off       # unfeature
 *   npx tsx scripts/cms.ts feature <slug> --until <ISO-date>
 *   npx tsx scripts/cms.ts update <slug> <field> <json-value>
 *
 * Homepage slots are driven by the `featured` flag (+ optional
 * featuredUntil) — see lib/contentful.ts getHomepageAgents().
 */

import { fetchCategoryMap, findEntryBySlug, updateEntryFields } from './lib/cma';

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  switch (cmd) {
    case 'categories': {
      const map = await fetchCategoryMap();
      console.log('LIVE CATEGORIES (slug -> id):');
      for (const [slug, id] of Object.entries(map).sort()) {
        console.log(`  ${slug.padEnd(20)} ${id}`);
      }
      break;
    }

    case 'find': {
      const [slug] = args;
      if (!slug) return usage();
      const entry = await findEntryBySlug('agent', slug);
      if (!entry) return console.log(`❌ ${slug}: not found`);
      const f = entry.fields;
      console.log({
        id: entry.sys.id,
        version: entry.sys.version,
        published: !!entry.sys.publishedVersion,
        name: f.name?.['en-US'],
        featured: f.featured?.['en-US'] ?? false,
        featuredUntil: f.featuredUntil?.['en-US'] ?? null,
        tier: f.tier?.['en-US'],
        accessMethods: f.accessMethods?.['en-US'],
      });
      break;
    }

    case 'feature': {
      const [slug, ...flags] = args;
      if (!slug) return usage();
      const off = flags.includes('--off');
      const untilIdx = flags.indexOf('--until');
       
      const fields: Record<string, any> = { featured: !off };
      if (untilIdx >= 0 && flags[untilIdx + 1]) fields.featuredUntil = flags[untilIdx + 1];
      const result = await updateEntryFields('agent', slug, fields);
      console.log(
        result === 'updated'
          ? `✅ ${slug}: featured=${!off}${fields.featuredUntil ? ` until ${fields.featuredUntil}` : ''}`
          : `❌ ${slug}: ${result}`
      );
      break;
    }

    case 'update': {
      const [slug, field, ...valueParts] = args;
      if (!slug || !field || valueParts.length === 0) return usage();
      const raw = valueParts.join(' ');
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw; // plain string
      }
      const result = await updateEntryFields('agent', slug, { [field]: value });
      console.log(result === 'updated' ? `🔄 ${slug}.${field} updated` : `❌ ${slug}: ${result}`);
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
  npx tsx scripts/cms.ts update <slug> <field> <json-value>`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
