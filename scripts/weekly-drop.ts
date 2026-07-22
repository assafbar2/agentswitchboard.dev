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
import { cma, findEntryBySlug } from './lib/cma';

// ─── AGENTS TO ADD — edit this array, run, commit, then clear ────────────────
const _AGENTS_ADDED_2026_06_15: AgentInput[] = [
  {
    name: 'AgentRQ',
    slug: 'agentrq',
    description: 'Human-in-the-loop task manager for AI agents. Agents assign tasks to you; you assign back. Native Claude Code push notifications, MCP supervisor for multi-agent fleets. Apache-2.0.',
    providerName: 'Contextual, Inc.',
    providerUrl: 'https://agentrq.com',
    agentUrl: 'https://agentrq.com',
    categories: ['orchestration'],
    tags: ['human-in-the-loop', 'task-management', 'mcp', 'multi-agent', 'claude-code', 'open-source', 'apache-2.0'],
    authType: 'none',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: true,
    verified: true,
    skills: [
      { id: 'task-assignment', name: 'Task Assignment', description: 'Lets agents create tasks for the human operator and receive task assignments back in real time via MCP.' },
      { id: 'push-notifications', name: 'Push Notifications', description: 'Delivers sub-second agent-to-human notifications natively inside Claude Code sessions with no polling.' },
      { id: 'multi-agent-supervisor', name: 'Multi-Agent Supervisor', description: 'Orchestrates a fleet of agents from a single MCP supervisor endpoint, routing tasks across parallel workspaces.' },
    ],
  },
  {
    name: 'Temporal',
    slug: 'temporal',
    description: 'Durable workflow execution engine that survives crashes, retries automatically, and pauses for human input. Used by OpenAI, NVIDIA, and Salesforce. 20k+ GitHub stars. MIT-licensed.',
    providerName: 'Temporal Technologies',
    providerUrl: 'https://temporal.io',
    agentUrl: 'https://temporal.io',
    categories: ['orchestration'],
    tags: ['durable-execution', 'workflow', 'fault-tolerant', 'open-source', 'mit-license', 'python', 'typescript', 'go'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'durable-workflows', name: 'Durable Workflows', description: 'Runs long-lived agent workflows that auto-resume from the last checkpoint after any crash or infrastructure failure.' },
      { id: 'activity-retries', name: 'Activity Retries', description: 'Wraps API calls and tool executions with configurable retry policies, backoff, and timeout logic.' },
      { id: 'human-in-the-loop', name: 'Human-in-the-Loop', description: 'Pauses workflow execution on a Signal and resumes the moment a human approves or provides input.' },
    ],
  },
  {
    name: 'Hatchet',
    slug: 'hatchet',
    description: 'Durable task orchestration engine for AI agents — parallel workloads, automatic retries, concurrency controls, and built-in OpenTelemetry tracing. MIT-licensed, self-hostable.',
    providerName: 'Hatchet Technologies',
    providerUrl: 'https://hatchet.run',
    agentUrl: 'https://hatchet.run',
    categories: ['orchestration'],
    tags: ['durable-execution', 'task-queue', 'parallel-workloads', 'open-source', 'mit-license', 'opentelemetry', 'python', 'typescript', 'go'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'parallel-execution', name: 'Parallel Execution', description: 'Fans out tasks across workers with configurable concurrency limits and per-user fairness controls.' },
      { id: 'durable-tasks', name: 'Durable Tasks', description: 'Persists every task state transition so failed steps replay exactly from where they stopped.' },
      { id: 'workflow-observability', name: 'Workflow Observability', description: 'Emits OpenTelemetry traces and spans for every task and workflow, searchable with full-text log support.' },
    ],
  },
];
const AGENTS_TO_ADD: AgentInput[] = [
  {
    name: 'Hilt Pay Agent Gateway',
    slug: 'hilt-pay',
    description: 'Gives agents x402 V2 paid-request access on Solana USDC — settlement verification, receipts, entitlements, atomic metering, and webhooks. Zero-custody; ships A2A agent card, MCP, and API.',
    providerName: 'Hilt',
    providerUrl: 'https://www.hilt.so',
    agentUrl: 'https://docs.hilt.so/developers/agent-micropayments',
    categories: ['commerce-payments', 'infrastructure'],
    tags: ['x402', 'a2a', 'solana-usdc', 'agent-payments', 'micropayments', 'zero-custody', 'entitlements'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'paid-request-settlement', name: 'Paid Request Settlement', description: 'Executes x402 V2 paid requests with Solana USDC settlement and verifies payment signatures atomically.' },
      { id: 'receipts-entitlements', name: 'Receipts & Entitlements', description: 'Issues receipts and durable entitlements for every settled payment so access outlives the transaction.' },
      { id: 'atomic-metering', name: 'Atomic Metering', description: 'Meters API usage atomically against prepaid balances and entitlements for pay-per-call agent billing.' },
      { id: 'sandbox-bootstrap', name: 'Sandbox Bootstrap', description: 'Bootstraps a sandbox workspace so agents can test the full payment-to-access flow without real funds.' },
    ],
  },
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

// ── Category ID map ──────────────────────────────────────────────
// NOTE: verify against the live CMS with `npx tsx scripts/cms.ts categories`.

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
  communication:      '7t5V37xtBu02l60r6cKK4d',
  orchestration:      '5ODCjKvQK5N7Fkkt8zfbE0',
};

function catLink(slug: string) {
  return { sys: { type: 'Link', linkType: 'Entry', id: CAT[slug] } };
}

// ── CMA helpers (shared plumbing in scripts/lib/cma.ts) ──────────

async function createAgent(agent: AgentInput): Promise<'created' | 'skipped' | 'error'> {
  // Validate description length
  if (agent.description.length > 200) {
    console.log(`  ❌ ${agent.name}: description too long (${agent.description.length} chars > 200)`);
    return 'error';
  }

  const existing = await findEntryBySlug('agent', agent.slug);
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
