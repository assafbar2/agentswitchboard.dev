/**
 * validate-content.ts — the quality bar, enforced as code.
 *
 * Validates every file in content/ against the directory's editorial rules.
 * Runs in CI on every PR; a bad entry physically cannot merge.
 *
 * Run: npx tsx scripts/validate-content.ts
 * Exit 1 on any violation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

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

function main() {
  const dir = path.join(CONTENT, 'agents');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  let errors = 0;
  const slugs = new Set<string>();

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
  }

  const published = files.length;
  if (errors === 0) {
    console.log(`✅ content valid: ${published} agents, ${validCategorySlugs.size} categories, 0 violations`);
  } else {
    console.log(`\n❌ ${errors} violation(s) across content/ — fix before merging.`);
    process.exit(1);
  }
}

main();
