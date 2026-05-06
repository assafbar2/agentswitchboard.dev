/**
 * Weekly Drop — canonical script for adding new agents discovered via Mode A or Mode B.
 *
 * Usage:
 *   1. Paste agents into AGENTS_TO_ADD below
 *   2. npx tsx scripts/weekly-drop.ts
 *   3. Commit: git add scripts/weekly-drop.ts && git commit -m "Weekly drop [DATE]: added [x] agents"
 *   4. Clear AGENTS_TO_ADD for next run, commit: "chore: clear weekly-drop for next run"
 *
 * Skills format: { id: string, name: string (2-4 words), description: string (80-150 chars, starts with a verb) }
 * Description hard limit: 200 chars (Contentful Symbol field)
 * Access methods: 'api' | 'mcp' | 'cli' | 'browser-extension'
 * Auth types: 'apiKey' | 'oauth2' | 'bearer' | 'none'
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import * as fs from 'fs';

// ─── AGENTS TO ADD — edit this array, run, commit, then clear ────────────────
const AGENTS_TO_ADD: AgentInput[] = [
  // Paste new agents here. Each run skips agents that already exist.
];
// ─────────────────────────────────────────────────────────────────────────────

interface AgentSkill {
  id: string;
  name: string;
  description: string;
}

interface AgentInput {
  name: string;
  slug: string;
  description: string;
  providerName: string;
  providerUrl: string;
  agentUrl: string;
  categories: string[];
  tags?: string[];
  authType?: 'apiKey' | 'oauth2' | 'bearer' | 'none';
  accessMethods?: ('api' | 'mcp' | 'cli' | 'browser-extension')[];
  supportsStreaming?: boolean;
  supportsPushNotifications?: boolean;
  featured?: boolean;
  verified?: boolean;
  skills?: AgentSkill[];
}

// ── Token management ─────────────────────────────────────────────

function readTokenFromEnv(): string {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/CONTENTFUL_MANAGEMENT_TOKEN="([^"]+)"/);
  return match?.[1] ?? process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
}

try {
  execSync('bash scripts/refresh-cma-token.sh', { stdio: 'inherit' });
  process.env.CONTENTFUL_MANAGEMENT_TOKEN = readTokenFromEnv();
} catch {
  console.log('⚠️  Token refresh failed, using existing token');
}

const SPACE = process.env.CONTENTFUL_SPACE_ID || '8e4hmp8gwcuv';
let TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/master`;
console.log(`Using space: ${SPACE}, token starts: ${TOKEN?.slice(0, 15)}...`);

let tokenCreatedAt = Date.now();

async function refreshTokenIfNeeded() {
  if (Date.now() - tokenCreatedAt > 7 * 60 * 1000) {
    console.log('  🔄 Refreshing token...');
    try {
      execSync('bash scripts/refresh-cma-token.sh', { stdio: 'pipe' });
      TOKEN = readTokenFromEnv();
      tokenCreatedAt = Date.now();
      console.log('  ✅ Token refreshed');
    } catch {
      console.log('  ⚠️  Token refresh failed mid-run');
    }
  }
}

// ── Category ID map ──────────────────────────────────────────────

const CAT: Record<string, string> = {
  language:           '7inqvMgFf4dh13bC79cFhU',
  'data-analytics':   '3d0ys6UDI0FjTrgw4v5wv8',
  'customer-support': '53qEOctvvj7B7iPGjkgLw0',
  'code-devtools':    'Wx5Z0jaccw9a94lsbfKTX',
  finance:            '4l9ucrmQTUoipatNlXCqeP',
  'sales-marketing':  '14ULrKtnQZyzO792Km8BnZ',
  legal:              '2EiPFKj4bl1l93XXc9pnny',
  'content-media':    '2bHczM99CVsDHN44Y4NmX8',
  infrastructure:     '4DWCugnTmIRlLsaYa5WjZR',
  research:           '22Kd21qgJwkPaMhgYGUfTO',
  scheduling:         '4UuA4GGBTNK9FENwYQSMxe',
  security:           'ZcI8XfUcXNjfAhGvki2zi',
  'commerce-payments':'44nVoPNVZXunRtMumItZfO',
  'memory-state':     'ydaYTlRXXas53G3kbr65i',
  'browser-computer': '6g6TPbURSB52Z2scsiUGxN',
  'vector-databases': '1rQCIuLKfXhq2efEUDtQ8C',
  'voice-messaging':  '2pV8SRrEcdoS7Rjodj490d',
};

function catLink(slug: string) {
  return { sys: { type: 'Link', linkType: 'Entry', id: CAT[slug] } };
}

// ── CMA helpers ──────────────────────────────────────────────────

async function cma(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(opts.headers || {}),
    },
  });
  return r.json();
}

async function findEntry(slug: string): Promise<any> {
  const res = await cma(`/entries?content_type=agent&fields.slug=${slug}&limit=1`);
  return res.items?.[0] ?? null;
}

async function createAgent(agent: AgentInput): Promise<'created' | 'skipped' | 'error'> {
  await refreshTokenIfNeeded();

  // Validate description length
  if (agent.description.length > 200) {
    console.log(`  ❌ ${agent.name}: description too long (${agent.description.length} chars > 200)`);
    return 'error';
  }

  const existing = await findEntry(agent.slug);
  if (existing) {
    console.log(`  ⏭  ${agent.name} (${agent.slug}) already exists`);
    return 'skipped';
  }

  const fields: any = {
    name:           { 'en-US': agent.name },
    slug:           { 'en-US': agent.slug },
    description:    { 'en-US': agent.description },
    providerName:   { 'en-US': agent.providerName },
    providerUrl:    { 'en-US': agent.providerUrl },
    agentUrl:       { 'en-US': agent.agentUrl },
    categories:     { 'en-US': agent.categories.map((c) => catLink(c)) },
    tags:           { 'en-US': agent.tags ?? [] },
    authType:       { 'en-US': agent.authType ?? 'apiKey' },
    status:         { 'en-US': 'published' },
    featured:       { 'en-US': agent.featured ?? false },
    verified:       { 'en-US': agent.verified ?? false },
    tier:           { 'en-US': 'free' },
    discoveredBy:   { 'en-US': 'manual' },
    accessMethods:  { 'en-US': agent.accessMethods ?? [] },
    supportsStreaming:          { 'en-US': agent.supportsStreaming ?? false },
    supportsPushNotifications: { 'en-US': agent.supportsPushNotifications ?? false },
  };

  if (agent.skills) {
    fields.skills = { 'en-US': agent.skills };
  }

  const entry = await cma('/entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': 'agent' } as any,
    body: JSON.stringify({ fields }),
  });

  if (!entry.sys?.id || entry.sys?.type?.includes('Error')) {
    console.log(`  ❌ ${agent.name}: ${JSON.stringify(entry).slice(0, 300)}`);
    return 'error';
  }

  const pub = await cma(`/entries/${entry.sys.id}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) } as any,
  });

  if (pub.sys?.publishedVersion) {
    console.log(`  ✅ ${agent.name}`);
    return 'created';
  } else {
    console.log(`  ⚠️  ${agent.name} created but publish failed: ${JSON.stringify(pub).slice(0, 150)}`);
    return 'error';
  }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  if (AGENTS_TO_ADD.length === 0) {
    console.log('\n📭 AGENTS_TO_ADD is empty — nothing to do.');
    console.log('   Add agents to the array at the top of this file, then re-run.\n');
    return;
  }

  console.log(`\n🚀 Processing ${AGENTS_TO_ADD.length} agent(s)...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const agent of AGENTS_TO_ADD) {
    try {
      const result = await createAgent(agent);
      if (result === 'created') created++;
      else if (result === 'skipped') skipped++;
      else errors++;
    } catch (err: any) {
      console.log(`  ❌ ${agent.name}: ${err.message}`);
      errors++;
    }
    // Brief delay to respect Contentful rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);

  if (created > 0) {
    console.log('\n📌 Next steps:');
    console.log('   1. git add scripts/weekly-drop.ts');
    console.log('   2. git commit -m "Weekly drop [DATE]: added X agents"');
    console.log('   3. git push origin main');
    console.log('   4. Clear AGENTS_TO_ADD and commit "chore: clear weekly-drop for next run"');
  }
}

main().catch(console.error);
