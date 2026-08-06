/**
 * Weekly Drop — canonical script for adding new agents discovered via Mode A or Mode B.
 *
 * GIT-AS-CMS: agents are files in content/agents/<slug>.json. This script
 * writes those files — publishing happens when the commit deploys.
 *
 * Usage:
 *   1. Paste agents into AGENTS_TO_ADD below
 *   2. npx tsx scripts/weekly-drop.ts        (writes content/agents/*.json)
 *   3. npx tsx scripts/validate-content.ts   (CI runs this too)
 *   4. Commit content/ + this file: "Weekly drop [DATE]: added [x] agents"
 *   5. Clear AGENTS_TO_ADD, commit: "chore: clear weekly-drop after [DATE] run"
 *
 * Skills format: { id, name (2-4 words), description (80-150 chars, verb-first) }
 * Description hard limit: 200 chars
 * Access methods: 'api' | 'mcp' | 'cli' | 'browser-extension'
 * Auth types: 'apiKey' | 'oauth2' | 'bearer' | 'none'
 * Valid category slugs: content/categories.json (or `npx tsx scripts/cms.ts categories`)
 */

import * as fs from 'fs';
import * as path from 'path';
import { appendChangelog } from './lib/changelog';

// ─── AGENTS TO ADD — edit this array, run, commit, then clear ────────────────
const _AGENTS_ADDED_2026_06_15_SENTRY: AgentInput[] = [
  {
    name: 'Sentry MCP',
    slug: 'sentry-mcp',
    description: 'Official Sentry remote MCP server — pull issues, traces, and AI root-cause analysis into any coding agent. Works with Claude Code, Cursor, VS Code, Codex, Gemini CLI, and more.',
    providerName: 'Sentry',
    providerUrl: 'https://sentry.io',
    agentUrl: 'https://mcp.sentry.dev',
    categories: ['code-devtools', 'infrastructure'],
    tags: ['error-monitoring', 'debugging', 'traces', 'root-cause-analysis', 'sentry', 'oauth2', 'remote-mcp'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'issue-lookup', name: 'Issue Lookup', description: 'Fetches Sentry issues by URL, ID, or query, returning full error details, stack traces, and event context.' },
      { id: 'trace-analysis', name: 'Trace Analysis', description: 'Retrieves distributed traces and span data to identify performance bottlenecks and error propagation paths.' },
      { id: 'root-cause-analysis', name: 'Root Cause Analysis', description: "Runs Sentry's Seer AI engine on an issue to pinpoint the root cause and surface suggested fixes." },
    ],
  },
];
const AGENTS_TO_ADD: AgentInput[] = [
  // Paste agents here from the Weekly Drop prompt.
  // Each run skips agents whose content/agents/<slug>.json already exists.
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
  wellKnownUrl?: string;
  skills?: AgentSkill[];
}

const CONTENT = path.resolve(process.cwd(), 'content');

function validCategorySlugs(): Set<string> {
  const cats = JSON.parse(fs.readFileSync(path.join(CONTENT, 'categories.json'), 'utf8'));
  return new Set(cats.map((c: { slug: string }) => c.slug));
}

function createAgent(agent: AgentInput, catSlugs: Set<string>): 'created' | 'skipped' | 'error' {
  if (agent.description.length > 200) {
    console.log(`  ❌ ${agent.name}: description too long (${agent.description.length} chars > 200)`);
    return 'error';
  }
  const badCats = agent.categories.filter((c) => !catSlugs.has(c));
  if (badCats.length) {
    console.log(`  ❌ ${agent.name}: unknown categories: ${badCats.join(', ')}`);
    return 'error';
  }

  const file = path.join(CONTENT, 'agents', `${agent.slug}.json`);
  if (fs.existsSync(file)) {
    console.log(`  ⏭  ${agent.name} (${agent.slug}) already exists`);
    return 'skipped';
  }

  const now = new Date().toISOString();
  const record = {
    id: agent.slug,
    name: agent.name,
    slug: agent.slug,
    description: agent.description,
    providerName: agent.providerName,
    providerUrl: agent.providerUrl,
    agentUrl: agent.agentUrl,
    wellKnownUrl: agent.wellKnownUrl ?? undefined,
    categories: agent.categories,
    tags: agent.tags ?? [],
    skills: agent.skills ?? [],
    authType: agent.authType ?? 'apiKey',
    supportsStreaming: agent.supportsStreaming ?? false,
    supportsPushNotifications: agent.supportsPushNotifications ?? false,
    status: 'published',
    featured: agent.featured ?? false,
    verified: agent.verified ?? false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: agent.accessMethods ?? [],
    createdAt: now,
    updatedAt: now,
  };

  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
  appendChangelog({ action: 'added', slug: agent.slug, name: agent.name });
  console.log(`  ✅ ${agent.name}`);
  return 'created';
}

function main() {
  if (AGENTS_TO_ADD.length === 0) {
    console.log('\n📭 AGENTS_TO_ADD is empty — nothing to do.');
    console.log('   Add agents to the array at the top of this file, then re-run.\n');
    return;
  }

  console.log(`\n🚀 Processing ${AGENTS_TO_ADD.length} agent(s)...\n`);
  const catSlugs = validCategorySlugs();

  let created = 0, skipped = 0, errors = 0;
  for (const agent of AGENTS_TO_ADD) {
    const result = createAgent(agent, catSlugs);
    if (result === 'created') created++;
    else if (result === 'skipped') skipped++;
    else errors++;
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
  if (created > 0) {
    console.log('\n📌 Next steps:');
    console.log('   1. npx tsx scripts/validate-content.ts');
    console.log('   2. git add content/ scripts/weekly-drop.ts');
    console.log('   3. git commit -m "Weekly drop [DATE]: added X agents" && git push');
    console.log('   4. Clear AGENTS_TO_ADD and commit "chore: clear weekly-drop after [DATE] run"');
  }
}

main();
