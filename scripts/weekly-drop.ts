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

  // ── Mode A Weekly Drop 2026-04-17 ──────────────────────────────────────────

  {
    name: 'Fastmail MCP',
    slug: 'fastmail-mcp',
    description: 'Official Fastmail MCP server. AI agents read, search, and write email, contacts, and calendar via OAuth — no scraping, no fragile third-party integration.',
    providerName: 'Fastmail',
    providerUrl: 'https://fastmail.com',
    agentUrl: 'https://www.fastmail.com/blog/an-mcp-server-for-fastmail/',
    categories: ['scheduling'],
    tags: ['mcp', 'email', 'calendar', 'contacts', 'oauth', 'fastmail', 'productivity'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'email-read', name: 'Email Read & Search', description: 'Read and search Fastmail inbox, sent mail, and folders with full message content via MCP tools' },
      { id: 'email-compose', name: 'Email Compose', description: 'Compose and send emails on behalf of the authenticated Fastmail user via MCP tool calls' },
      { id: 'calendar-access', name: 'Calendar Access', description: 'Read and create calendar events in Fastmail calendar via OAuth-authenticated MCP connection' },
      { id: 'contacts-mgmt', name: 'Contacts Management', description: 'Search and manage Fastmail contacts including create, update, and lookup operations' },
    ],
  },

  {
    name: 'Cloudflare Agents SDK',
    slug: 'cloudflare-agents-sdk',
    description: 'TypeScript SDK for building stateful AI agents on Cloudflare Durable Objects. Built-in SQL state, WebSocket, task scheduling, MCP client/server, and browser tools.',
    providerName: 'Cloudflare',
    providerUrl: 'https://cloudflare.com',
    agentUrl: 'https://developers.cloudflare.com/agents/',
    categories: ['infrastructure'],
    tags: ['sdk', 'cloudflare', 'durable-objects', 'stateful-agents', 'mcp', 'typescript', 'serverless'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      { id: 'stateful-agents', name: 'Stateful Agents', description: 'Build agents with persistent SQL state in Durable Objects that survives restarts and scales globally' },
      { id: 'mcp-built-in', name: 'MCP Client & Server', description: 'Ship MCP servers and connect to MCP tools from inside your agent with built-in protocol support' },
      { id: 'task-scheduling', name: 'Task Scheduling', description: 'Schedule tasks and crons natively inside your Durable Object agent with zero external dependencies' },
      { id: 'browser-tools', name: 'Browser Tools', description: 'Give your agent browser access for web scraping using Cloudflare Browser Rendering integration' },
      { id: 'deploy-cli', name: 'Deploy via CLI', description: 'Deploy agents globally with npx create-cloudflare and wrangler deploy — no server configuration needed' },
    ],
  },

  {
    name: 'Agent Vault',
    slug: 'agent-vault',
    description: 'Open-source credential proxy for AI agents by Infisical. Agents call APIs without ever seeing secrets — credentials injected at the network layer via HTTPS_PROXY.',
    providerName: 'Infisical',
    providerUrl: 'https://infisical.com',
    agentUrl: 'https://github.com/Infisical/agent-vault',
    categories: ['security'],
    tags: ['credentials', 'secret-management', 'proxy', 'infisical', 'open-source', 'zero-trust', 'ai-agents'],
    authType: 'none',
    accessMethods: ['cli'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'credential-injection', name: 'Credential Injection', description: 'Inject API keys and secrets at the network layer so agents never handle credentials directly' },
      { id: 'proxy-setup', name: 'Proxy Setup', description: 'Configure as HTTPS_PROXY in minutes with a single Go binary — zero code changes to agents required' },
      { id: 'secret-rotation', name: 'Secret Rotation', description: 'Rotate credentials centrally without updating or redeploying any agent or application config' },
      { id: 'audit-trail', name: 'Audit Trail', description: 'Log every credential access with agent identity and timestamp for compliance and debugging' },
    ],
  },

  {
    name: 'SafeWeave',
    slug: 'safeweave',
    description: 'MCP server with 8 parallel security scanners — SAST, secrets, dependencies, IaC, container, DAST, license, and posture. Integrates into Cursor, Claude Code, VS Code in seconds.',
    providerName: 'SafeWeave',
    providerUrl: 'https://safeweave.dev',
    agentUrl: 'https://safeweave.dev',
    categories: ['security'],
    tags: ['mcp', 'sast', 'secrets-detection', 'dependency-audit', 'iac-security', 'container-security', 'devsecops'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'sast-scan', name: 'SAST Scan', description: 'Run static analysis security testing on source code and surface vulnerabilities by severity level' },
      { id: 'secrets-detect', name: 'Secrets Detection', description: 'Detect leaked API keys, tokens, and credentials committed to code using pattern-based scanning' },
      { id: 'dependency-audit', name: 'Dependency Audit', description: 'Audit package dependencies for known CVEs and license compliance issues across major ecosystems' },
      { id: 'iac-scan', name: 'IaC Security Scan', description: 'Scan Terraform, CloudFormation, and Kubernetes configs for misconfigurations and security gaps' },
    ],
  },

  {
    name: 'Kampala',
    slug: 'kampala',
    description: 'YC W26. Watches one human workflow demo and converts any website, mobile, or desktop app into a stable REST API — no browser automation, no selectors, no LLM calls per action.',
    providerName: 'Zatanna',
    providerUrl: 'https://zatanna.ai',
    agentUrl: 'https://zatanna.ai',
    categories: ['browser-computer'],
    tags: ['website-to-api', 'workflow-capture', 'yc-w26', 'api-extraction', 'computer-use-alternative', 'deterministic'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'workflow-capture', name: 'Workflow Capture', description: 'Record one human demo of any website workflow to generate a stable, replayable API endpoint' },
      { id: 'stable-api', name: 'Stable API Generation', description: 'Convert observed UI interactions into a deterministic REST API that survives website UI changes' },
      { id: 'zero-llm-runtime', name: 'Zero LLM at Runtime', description: 'Execute captured workflows without LLM inference per step — zero token cost at runtime execution' },
    ],
  },

  {
    name: 'GAIA by AMD',
    slug: 'gaia-amd',
    description: "AMD's open-source Python/C++ framework for AI agents running fully locally on AMD NPU/GPU. Includes MCP integration, RAG pipeline, speech-to-speech voice, and multi-agent support.",
    providerName: 'AMD',
    providerUrl: 'https://amd.com',
    agentUrl: 'https://amd-gaia.ai',
    categories: ['infrastructure'],
    tags: ['amd', 'local-inference', 'open-source', 'python', 'mcp', 'voice-agent', 'rag', 'npu'],
    authType: 'none',
    accessMethods: ['api', 'mcp', 'cli'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'local-inference', name: 'Local Inference', description: 'Run LLM inference entirely on AMD NPU, GPU, or CPU hardware with no cloud API calls required' },
      { id: 'mcp-integration', name: 'MCP Integration', description: 'Connect GAIA agents to any MCP server for tool use without internet-dependent API calls' },
      { id: 'rag-pipeline', name: 'RAG Pipeline', description: 'Build retrieval-augmented generation pipelines over local documents with embedded vector search' },
      { id: 'voice-agent', name: 'Voice Agent', description: 'Deploy speech-to-speech voice agents running entirely on-device using AMD neural processing units' },
    ],
  },

  {
    name: 'Darkbloom',
    slug: 'darkbloom',
    description: 'Decentralized inference on idle Apple Silicon Macs. OpenAI-compatible API, end-to-end encrypted, hardware-attested privacy — up to 70% cheaper than centralized cloud inference.',
    providerName: 'Darkbloom',
    providerUrl: 'https://darkbloom.dev',
    agentUrl: 'https://darkbloom.dev',
    categories: ['infrastructure'],
    tags: ['inference', 'decentralized', 'apple-silicon', 'openai-compatible', 'privacy', 'end-to-end-encrypted', 'low-cost'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'openai-compat', name: 'OpenAI-Compatible API', description: 'Drop in Darkbloom as your base URL — works with any OpenAI SDK client without code changes' },
      { id: 'e2e-encrypt', name: 'E2E Encryption', description: 'Route inference through end-to-end encrypted channels so no node sees plaintext prompts or responses' },
      { id: 'hardware-attest', name: 'Hardware Attestation', description: 'Verify inference runs on real Apple Silicon with hardware-level attestation before sending data' },
    ],
  },

  {
    name: 'Spectrum',
    slug: 'spectrum-photon',
    description: 'npm SDK connecting AI agents to iMessage, WhatsApp, Telegram, Slack, Discord, and Instagram via a single unified API — no per-platform integration code required.',
    providerName: 'Photon',
    providerUrl: 'https://photon.codes',
    agentUrl: 'https://photon.codes/spectrum',
    categories: ['voice-messaging'],
    tags: ['messaging', 'whatsapp', 'telegram', 'imessage', 'slack', 'discord', 'unified-api', 'npm'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'unified-messaging', name: 'Unified Messaging API', description: 'Send and receive messages across 6 platforms with one SDK and one consistent message format' },
      { id: 'agent-deploy', name: 'Agent Deployment', description: 'Deploy any AI agent to WhatsApp, Telegram, iMessage, Slack, Discord, or Instagram in minutes' },
      { id: 'webhook-events', name: 'Webhook Events', description: 'Receive incoming messages across all platforms as unified webhook events for agent processing' },
    ],
  },

  {
    name: 'Gondola MCP',
    slug: 'gondola-mcp',
    description: 'Free remote MCP server for hotel search and booking. AI agents search, compare, and book hotels across cash and loyalty points rates via Model Context Protocol.',
    providerName: 'Gondola',
    providerUrl: 'https://gondola.ai',
    agentUrl: 'https://www.gondola.ai/mcp',
    categories: ['commerce-payments'],
    tags: ['mcp', 'hotel-search', 'travel', 'points-rates', 'booking', 'free-tier', 'remote-mcp'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'hotel-search', name: 'Hotel Search', description: 'Search hotels by location, dates, and guest count across both cash and loyalty points rate options' },
      { id: 'rate-compare', name: 'Rate Comparison', description: 'Compare cash prices and points redemption rates side-by-side to identify the best value booking' },
      { id: 'booking', name: 'Hotel Booking', description: 'Initiate hotel bookings for cash and points stays via MCP tool calls from any AI agent' },
    ],
  },

  {
    name: 'Tiingo MCP',
    slug: 'tiingo-mcp',
    description: 'Python MCP server exposing Tiingo financial data API — real-time and historical stock prices, company fundamentals, and financial news searchable by AI agents.',
    providerName: 'Tiingo',
    providerUrl: 'https://tiingo.com',
    agentUrl: 'https://github.com/wshobson/tiingo-mcp',
    categories: ['finance'],
    tags: ['mcp', 'financial-data', 'stocks', 'fundamentals', 'financial-news', 'market-data', 'python'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'stock-prices', name: 'Stock Prices', description: 'Retrieve real-time and historical stock price data for any US-listed ticker symbol via MCP' },
      { id: 'fundamentals', name: 'Company Fundamentals', description: 'Fetch financial fundamentals including revenue, EPS, P/E ratio, and balance sheet metrics per ticker' },
      { id: 'financial-news', name: 'Financial News', description: 'Search and retrieve financial news articles filtered by ticker, date range, and keyword query' },
    ],
  },

  {
    name: 'Maki',
    slug: 'maki',
    description: 'Rust coding agent CLI with tree-sitter code indexing, sandboxed Python execution, and multi-tier subagents. Benchmarks show ~40% token reduction vs competing coding agents.',
    providerName: 'Maki',
    providerUrl: 'https://maki.sh',
    agentUrl: 'https://maki.sh',
    categories: ['code-devtools'],
    tags: ['coding-agent', 'rust', 'cli', 'tree-sitter', 'token-efficient', 'sandboxed-execution', 'subagents'],
    authType: 'apiKey',
    accessMethods: ['cli'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'tree-sitter-index', name: 'Tree-Sitter Indexing', description: 'Index codebases with tree-sitter for precise, token-efficient context selection before each edit' },
      { id: 'sandboxed-exec', name: 'Sandboxed Execution', description: 'Run Python code in isolated sandboxes during agent tasks without exposing the host environment' },
      { id: 'multi-tier', name: 'Multi-Tier Subagents', description: 'Delegate subtasks to specialized subagents that run in parallel and report structured results back' },
    ],
  },

  {
    name: 'Stash',
    slug: 'stash-memory',
    description: 'Open-source self-hosted memory layer for AI agents. Gives any agent persistent, semantic memory across sessions — model-agnostic, deployable on your own infrastructure.',
    providerName: 'Stash OSS',
    providerUrl: 'https://alash3al.github.io/stash',
    agentUrl: 'https://alash3al.github.io/stash',
    categories: ['memory-state'],
    tags: ['memory-layer', 'open-source', 'self-hosted', 'persistent-memory', 'semantic-recall', 'model-agnostic'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'persist-memory', name: 'Persist Memory', description: 'Store agent memories across sessions with automatic expiration controls and priority scoring' },
      { id: 'semantic-recall', name: 'Semantic Recall', description: 'Retrieve relevant past memories by semantic similarity rather than exact keyword matching alone' },
      { id: 'self-host', name: 'Self-Hosted Deploy', description: 'Deploy on your own infrastructure for full data ownership with no external memory service dependency' },
    ],
  },

  {
    name: 'Mac Control MCP',
    slug: 'mac-control-mcp',
    description: 'Native Swift MCP server with 63 tools for full macOS automation — accessibility tree, Safari/Chrome control, screen capture, OCR, keyboard/mouse, Spotlight, and clipboard.',
    providerName: 'AdelElo',
    providerUrl: 'https://github.com/AdelElo13/mac-control-mcp',
    agentUrl: 'https://github.com/AdelElo13/mac-control-mcp',
    categories: ['browser-computer'],
    tags: ['mcp', 'macos', 'accessibility-tree', 'safari', 'chrome', 'ocr', 'screen-capture', 'automation'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'accessibility-tree', name: 'Accessibility Tree', description: 'Read the full macOS accessibility tree to navigate and interact with any desktop application via MCP' },
      { id: 'browser-control', name: 'Browser Control', description: 'Control Safari and Chrome natively — navigate, click, type, and extract content without Playwright' },
      { id: 'screen-ocr', name: 'Screen Capture & OCR', description: 'Capture screenshots and extract text from any screen region using native macOS OCR engine' },
      { id: 'system-automation', name: 'System Automation', description: 'Send keyboard shortcuts, mouse clicks, manage clipboard, and trigger Spotlight via MCP tools' },
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
