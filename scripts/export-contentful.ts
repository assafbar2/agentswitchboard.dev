/**
 * One-time export: Contentful → content/ files (git-as-CMS migration).
 *
 * Pulls PUBLISHED entries via the CMA public endpoint (drafts and
 * unpublished entries are excluded by definition), unwraps en-US locales,
 * resolves category links, and preserves sys timestamps + ids.
 *
 * Run: npx tsx scripts/export-contentful.ts
 * Idempotent — safe to re-run right before merging to re-sync.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cma } from './lib/cma';

const OUT = path.resolve(process.cwd(), 'content');

const GENERIC_TAGS = new Set(['ai', 'tool', 'tools', 'automation', 'agent', 'agents']);

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** One-time normalization at the migration boundary:
 *  - legacy string-form skills → {id,name,description} (same coercion the
 *    old Contentful mapper applied at read time)
 *  - non-kebab skill ids / tags → kebab-case
 *  - generic tags (banned by the editorial bar) → dropped */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSkills(skills: any): any[] {
  if (!Array.isArray(skills)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return skills.map((s: any) =>
    typeof s === 'string'
      ? { id: kebab(s), name: s, description: s }
      : { ...s, id: kebab(String(s.id ?? s.name ?? '')) }
  );
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => kebab(String(t))).filter((t) => t && !GENERIC_TAGS.has(t)))];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(fields: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields ?? {})) {
    out[k] = v?.['en-US'];
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllPublished(contentType: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  let skip = 0;
  let total = Infinity;
  while (skip < total) {
    const res = await cma(`/public/entries?content_type=${contentType}&limit=100&skip=${skip}`);
    if (!res.items) throw new Error(`export failed for ${contentType}: ${JSON.stringify(res).slice(0, 200)}`);
    total = res.total;
    all.push(...res.items);
    skip += 100;
  }
  return all;
}

async function main() {
  fs.mkdirSync(path.join(OUT, 'agents'), { recursive: true });

  // ── Categories ────────────────────────────────────────────────
  const catEntries = await fetchAllPublished('category');
  const catById = new Map<string, { id: string; slug: string }>();
  const categories = catEntries
    .map((e) => {
      const f = unwrap(e.fields);
      const cat = {
        id: e.sys.id,
        name: f.name,
        slug: f.slug,
        description: f.description ?? undefined,
        icon: f.icon ?? undefined,
        sortOrder: f.sortOrder ?? 0,
      };
      catById.set(e.sys.id, cat);
      return cat;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
  fs.writeFileSync(path.join(OUT, 'categories.json'), JSON.stringify(categories, null, 2) + '\n');
  console.log(`✅ categories.json (${categories.length})`);

  // ── Site settings ─────────────────────────────────────────────
  const settings = await fetchAllPublished('siteSettings');
  if (settings.length > 0) {
    fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify(unwrap(settings[0].fields), null, 2) + '\n');
    console.log('✅ site.json');
  }

  // ── Agents ────────────────────────────────────────────────────
  const agentEntries = await fetchAllPublished('agent');
  let written = 0;
  const slugs = new Set<string>();
  for (const e of agentEntries) {
    const f = unwrap(e.fields);
    if (!f.slug) { console.log(`⚠️  entry ${e.sys.id} has no slug — skipped`); continue; }
    if (slugs.has(f.slug)) { console.log(`⚠️  duplicate slug ${f.slug} — skipped ${e.sys.id}`); continue; }
    slugs.add(f.slug);

    const agent = {
      id: e.sys.id,
      name: f.name,
      slug: f.slug,
      description: f.description,
      longDescription: f.longDescription ?? undefined,
      providerName: f.providerName,
      providerUrl: f.providerUrl,
      version: f.version ?? undefined,
      agentUrl: f.agentUrl,
      wellKnownUrl: f.wellKnownUrl ?? undefined,
      agentCardJson: f.agentCardJson ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categories: (f.categories ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((link: any) => catById.get(link?.sys?.id)?.slug)
        .filter(Boolean),
      tags: normalizeTags(f.tags),
      skills: normalizeSkills(f.skills),
      authType: f.authType ?? 'none',
      authInstructions: f.authInstructions ?? undefined,
      integrationGuide: f.integrationGuide ?? undefined,
      supportsStreaming: f.supportsStreaming ?? false,
      supportsPushNotifications: f.supportsPushNotifications ?? false,
      iconUrl: f.iconUrl ?? undefined,
      status: f.status ?? 'published',
      featured: f.featured ?? false,
      featuredUntil: f.featuredUntil ?? undefined,
      verified: f.verified ?? false,
      referralUrl: f.referralUrl ?? undefined,
      sponsorLabel: f.sponsorLabel ?? undefined,
      tier: f.tier ?? 'free',
      discoveredBy: f.discoveredBy ?? 'manual',
      workerSource: f.workerSource ?? undefined,
      accessMethods: f.accessMethods ?? [],
      createdAt: e.sys.createdAt,
      updatedAt: e.sys.updatedAt,
    };

    fs.writeFileSync(
      path.join(OUT, 'agents', `${f.slug}.json`),
      JSON.stringify(agent, null, 2) + '\n'
    );
    written++;
  }
  console.log(`✅ content/agents/ (${written} files from ${agentEntries.length} published entries)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
