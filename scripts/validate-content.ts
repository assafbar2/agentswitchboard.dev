/**
 * validate-content.ts — the quality bar, enforced as code.
 *
 * Validates every file in content/ against the directory's editorial rules.
 * Runs in CI on every PR; a bad entry physically cannot merge.
 *
 * Run: npx tsx scripts/validate-content.ts
 *      npx tsx scripts/validate-content.ts --official-candidates
 *        (also lists unflagged entries whose agentUrl is on an official vendor source)
 * Exit 1 on any violation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { registryProblems, vendorsForUrl, type OfficialVendor } from '../lib/official';

const CONTENT = path.resolve(process.cwd(), 'content');

const categories = JSON.parse(fs.readFileSync(path.join(CONTENT, 'categories.json'), 'utf8'));
const validCategorySlugs = new Set<string>(categories.map((c: { slug: string }) => c.slug));

const GENERIC_TAGS = new Set(['ai', 'tool', 'tools', 'automation', 'agent', 'agents']);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const SkillSchema = z.object({
  id: z.string().regex(SLUG, 'skill id must be kebab-case'),
  name: z.string().min(2),
  description: z.string().min(20).max(200),
  inputSchema: z.unknown().optional(),
  outputSchema: z.unknown().optional(),
});

const AgentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().regex(SLUG, 'slug must be kebab-case'),
    description: z.string().min(30).max(200, 'description hard limit is 200 chars'),
    longDescription: z.unknown().optional(),
    providerName: z.string().min(1),
    providerUrl: z.string().url().startsWith('http'),
    version: z.string().optional(),
    agentUrl: z.string().url().startsWith('http'),
    wellKnownUrl: z.string().url().optional(),
    agentCardJson: z.string().optional(),
    categories: z
      .array(z.string().refine((s) => validCategorySlugs.has(s), (s) => ({ message: `unknown category "${s}"` })))
      .min(1)
      .max(3),
    tags: z.array(
      z
        .string()
        .regex(SLUG, 'tags must be kebab-case')
        .refine((t) => !GENERIC_TAGS.has(t), (t) => ({ message: `tag "${t}" is too generic` }))
    ),
    skills: z.array(SkillSchema),
    authType: z.enum(['apiKey', 'oauth2', 'bearer', 'none']),
    authInstructions: z.unknown().optional(),
    integrationGuide: z.unknown().optional(),
    supportsStreaming: z.boolean(),
    supportsPushNotifications: z.boolean(),
    iconUrl: z.string().url().optional(),
    status: z.enum(['published', 'draft', 'archived']),
    featured: z.boolean(),
    featuredUntil: z.string().optional(),
    verified: z.boolean(),
    official: z.boolean().optional(),
    referralUrl: z.string().optional(),
    sponsorLabel: z.string().optional(),
    tier: z.enum(['free', 'premium']),
    discoveredBy: z.enum(['manual', 'worker']),
    workerSource: z.string().optional(),
    accessMethods: z.array(z.enum(['api', 'mcp', 'cli', 'browser-extension'])),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

const SOURCE = /^[a-z0-9.-]+\.[a-z0-9-]+(\/[a-z0-9._-]+)?$/;

const OfficialVendorSchema = z
  .object({
    slug: z.string().regex(SLUG, 'vendor slug must be kebab-case'),
    name: z.string().min(1),
    basis: z.enum(['public', 'frontier-lab', 'valuation', 'market-leader', 'subsidiary']),
    evidence: z.string().min(5, 'evidence must say why the vendor qualifies'),
    parent: z.string().optional(),
    sources: z
      .array(z.string().regex(SOURCE, 'source must be a lowercase host or host/org, no scheme'))
      .min(1),
  })
  .strict();

/** Parse and check content/official-vendors.json; returns the vendors and a violation count. */
function loadOfficialVendors(): { vendors: OfficialVendor[]; errors: number } {
  const p = path.join(CONTENT, 'official-vendors.json');
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.log(`❌ content/official-vendors.json: ${(e as Error).message}`);
    return { vendors: [], errors: 1 };
  }
  const result = z.array(OfficialVendorSchema).safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      console.log(`❌ content/official-vendors.json: ${issue.path.join('.')}: ${issue.message}`);
    }
    return { vendors: [], errors: result.error.issues.length };
  }
  const problems = registryProblems(result.data);
  for (const problem of problems) console.log(`❌ content/official-vendors.json: ${problem}`);
  return { vendors: result.data, errors: problems.length };
}

function main() {
  const listCandidates = process.argv.includes('--official-candidates');
  const official = loadOfficialVendors();
  const candidates: string[] = [];
  let flagged = 0;
  const dir = path.join(CONTENT, 'agents');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  let errors = official.errors;
  const slugs = new Set<string>();
  const published = new Set<string>();

  // Auxiliary content files aren't schema-validated, but they ARE parsed at
  // build time (e.g. /changelog does JSON.parse on changelog.json). A syntax
  // error here used to pass CI and only fail `next build` on Vercel — guard it.
  for (const aux of ['changelog.json', 'categories.json', 'site.json']) {
    const p = path.join(CONTENT, aux);
    if (!fs.existsSync(p)) continue;
    try {
      JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      console.log(`❌ content/${aux}: invalid JSON — ${(e as Error).message}`);
      errors++;
    }
  }

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      console.log(`❌ ${file}: invalid JSON`);
      errors++;
      continue;
    }

    const result = AgentSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        console.log(`❌ ${file}: ${issue.path.join('.')}: ${issue.message}`);
        errors++;
      }
      continue;
    }

    // filename must match slug; slugs must be unique
    const slug = result.data.slug;
    if (file !== `${slug}.json`) {
      console.log(`❌ ${file}: filename does not match slug "${slug}"`);
      errors++;
    }
    if (slugs.has(slug)) {
      console.log(`❌ ${file}: duplicate slug "${slug}"`);
      errors++;
    }
    slugs.add(slug);
    if (result.data.status === 'published') published.add(slug);

    // Official needs evidence: the product URL must sit on exactly one
    // registered vendor's official domain or GitHub org.
    const vendors = vendorsForUrl(result.data.agentUrl, official.vendors);
    if (result.data.official) {
      flagged++;
      if (vendors.length === 0) {
        console.log(
          `❌ ${file}: official: true but agentUrl ${result.data.agentUrl} is not on a source in content/official-vendors.json`
        );
        errors++;
      } else if (vendors.length > 1) {
        console.log(`❌ ${file}: agentUrl matches several official vendors (${vendors.map((v) => v.slug).join(', ')})`);
        errors++;
      }
    } else if (vendors.length === 1 && result.data.status === 'published') {
      candidates.push(`${slug} (${vendors[0].slug})`);
    }
  }

  if (listCandidates) {
    console.log(
      candidates.length
        ? `ℹ️  ${candidates.length} unflagged entr${candidates.length === 1 ? 'y' : 'ies'} on an official vendor source — review against the criteria:\n   ${candidates.join('\n   ')}`
        : 'ℹ️  no unflagged entries on official vendor sources'
    );
  }

  // Homepage placements must point at published agents, or the slot silently disappears.
  const sitePath = path.join(CONTENT, 'site.json');
  if (fs.existsSync(sitePath)) {
    try {
      const placements: unknown = JSON.parse(fs.readFileSync(sitePath, 'utf8')).homepageFeatured;
      if (placements !== undefined) {
        if (!Array.isArray(placements) || placements.some((p) => typeof p !== 'string')) {
          console.log('❌ content/site.json: homepageFeatured must be an array of slugs');
          errors++;
        } else {
          for (const p of placements as string[]) {
            if (!published.has(p)) {
              console.log(`❌ content/site.json: homepageFeatured "${p}" is not a published agent`);
              errors++;
            }
          }
        }
      }
    } catch {
      // invalid JSON is already reported above
    }
  }

  if (errors === 0) {
    console.log(
      `✅ content valid: ${files.length} agents (${flagged} official, ${official.vendors.length} vendors), ${validCategorySlugs.size} categories, 0 violations`
    );
  } else {
    console.log(`\n❌ ${errors} violation(s) across content/ — fix before merging.`);
    process.exit(1);
  }
}

main();
