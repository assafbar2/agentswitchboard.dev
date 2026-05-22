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
  // ── Mode B — Established tools missing from directory (May 22, 2026) ─────────

  // Code agents & VS Code extensions
  {
    name: 'Cline',
    slug: 'cline',
    description: 'Runs autonomous coding tasks in VS Code — edits files, executes terminal commands, and browses the web with user approval at each step.',
    providerName: 'Cline',
    providerUrl: 'https://cline.bot/',
    agentUrl: 'https://cline.bot/',
    categories: ['code-devtools'],
    tags: ['vscode', 'coding-agent', 'open-source', 'autonomous', 'apache-2.0'],
    authType: 'apiKey',
    accessMethods: ['browser-extension'],
  },
  {
    name: 'Roo Code',
    slug: 'roo-code',
    description: 'Gives VS Code a full AI dev team via structured modes (Code, Architect, Ask, Debug) with file system access, terminal control, and multi-step workflows.',
    providerName: 'Roo Code',
    providerUrl: 'https://www.roocode.com/',
    agentUrl: 'https://www.roocode.com/',
    categories: ['code-devtools'],
    tags: ['vscode', 'coding-agent', 'open-source', 'multi-mode', 'autonomous'],
    authType: 'apiKey',
    accessMethods: ['browser-extension'],
  },
  {
    name: 'Goose',
    slug: 'goose',
    description: 'Runs autonomously on your machine to execute commands, debug errors, orchestrate multi-step workflows, and build projects from scratch.',
    providerName: 'Block',
    providerUrl: 'https://block.xyz/',
    agentUrl: 'https://github.com/block/goose',
    categories: ['code-devtools'],
    tags: ['open-source', 'coding-agent', 'cli', 'apache-2.0', 'local-agent'],
    authType: 'apiKey',
    accessMethods: ['cli'],
  },
  {
    name: 'Devin',
    slug: 'devin',
    description: 'Autonomously plans, writes, tests, and ships production code end-to-end with its own shell, code editor, and browser in a sandboxed environment.',
    providerName: 'Cognition AI',
    providerUrl: 'https://cognition.ai/',
    agentUrl: 'https://devin.ai/',
    categories: ['code-devtools'],
    tags: ['coding-agent', 'autonomous', 'software-engineer', 'enterprise'],
    authType: 'bearer',
    accessMethods: ['api', 'browser-extension'],
  },

  // Agent frameworks
  {
    name: 'Mastra',
    slug: 'mastra',
    description: 'Builds production-ready AI agents, workflows, and RAG pipelines in TypeScript with a unified model router across 100+ providers.',
    providerName: 'Mastra AI',
    providerUrl: 'https://mastra.ai/',
    agentUrl: 'https://mastra.ai/',
    categories: ['code-devtools'],
    tags: ['typescript', 'rag', 'workflows', 'open-source', 'yc-w25'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
  },
  {
    name: 'smolagents',
    slug: 'smolagents',
    description: 'Builds lightweight code-first AI agents in ~1,000 lines of Python, executing Python snippets for 30% fewer LLM calls than JSON-based alternatives.',
    providerName: 'Hugging Face',
    providerUrl: 'https://huggingface.co/',
    agentUrl: 'https://github.com/huggingface/smolagents',
    categories: ['code-devtools'],
    tags: ['open-source', 'python', 'code-agents', 'huggingface', 'apache-2.0'],
    authType: 'none',
    accessMethods: ['api'],
  },
  {
    name: 'DSPy',
    slug: 'dspy',
    description: 'Programs LLMs using declarative signatures that compile into optimized prompts and fine-tuned weights automatically, replacing manual prompt engineering.',
    providerName: 'Stanford NLP',
    providerUrl: 'https://nlp.stanford.edu/',
    agentUrl: 'https://dspy.ai/',
    categories: ['code-devtools'],
    tags: ['open-source', 'python', 'prompt-optimization', 'stanford', 'rag'],
    authType: 'none',
    accessMethods: ['api'],
  },
  {
    name: 'Semantic Kernel',
    slug: 'semantic-kernel',
    description: 'Orchestrates AI agents and multi-agent workflows in C#, Python, and Java with plugin-based architecture, built-in memory management, and process framework.',
    providerName: 'Microsoft',
    providerUrl: 'https://microsoft.com/',
    agentUrl: 'https://learn.microsoft.com/en-us/semantic-kernel/overview/',
    categories: ['code-devtools'],
    tags: ['microsoft', 'open-source', 'dotnet', 'python', 'multi-agent'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },
  {
    name: 'Rivet',
    slug: 'rivet',
    description: 'Designs, debugs, and deploys complex LLM workflows visually with a node-based graph editor, real-time data flow tracking, and nested graph reuse.',
    providerName: 'Ironclad',
    providerUrl: 'https://ironcladapp.com/',
    agentUrl: 'https://rivet.ironcladapp.com/',
    categories: ['code-devtools'],
    tags: ['visual-programming', 'open-source', 'workflow-builder', 'typescript', 'no-code'],
    authType: 'none',
    accessMethods: ['cli'],
  },

  // Data / RAG
  {
    name: 'Haystack',
    slug: 'haystack',
    description: 'Builds production RAG pipelines and agentic workflows with modular components, explicit retrieval control, and multimodal support across 60+ integrations.',
    providerName: 'deepset',
    providerUrl: 'https://www.deepset.ai/',
    agentUrl: 'https://haystack.deepset.ai/',
    categories: ['data-analytics'],
    tags: ['rag', 'open-source', 'python', 'pipelines', 'retrieval'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },
  {
    name: 'Unstructured',
    slug: 'unstructured',
    description: 'Transforms PDFs, spreadsheets, emails, and 65+ file types into structured, chunked data ready for RAG pipelines and LLM ingestion at scale.',
    providerName: 'Unstructured.io',
    providerUrl: 'https://unstructured.io/',
    agentUrl: 'https://unstructured.io/',
    categories: ['data-analytics'],
    tags: ['document-parsing', 'etl', 'rag', 'open-source', 'multimodal'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
  },
  {
    name: 'Weaviate',
    slug: 'weaviate',
    description: 'Stores objects and vectors together, combining semantic search with structured filtering for scalable, cloud-native AI application backends.',
    providerName: 'Weaviate',
    providerUrl: 'https://weaviate.io/',
    agentUrl: 'https://weaviate.io/',
    categories: ['vector-databases'],
    tags: ['vector-database', 'open-source', 'rag', 'semantic-search', 'cloud-native'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
  },

  // Browser / computer use
  {
    name: 'Skyvern',
    slug: 'skyvern',
    description: 'Automates browser-based workflows using computer vision and LLMs — handles logins, form fills, CAPTCHA solving, and structured data extraction at scale.',
    providerName: 'Skyvern AI',
    providerUrl: 'https://www.skyvern.com/',
    agentUrl: 'https://www.skyvern.com/',
    categories: ['browser-computer'],
    tags: ['browser-automation', 'computer-vision', 'open-source', 'yc', 'soc2'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },
  {
    name: 'Stagehand',
    slug: 'stagehand',
    description: 'Provides an AI-native browser automation SDK combining atomic act/extract/observe primitives with an LLM for resilient, self-healing web workflows.',
    providerName: 'Browserbase',
    providerUrl: 'https://www.browserbase.com/',
    agentUrl: 'https://github.com/browserbase/stagehand',
    categories: ['browser-computer'],
    tags: ['browser-automation', 'open-source', 'typescript', 'playwright', 'sdk'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },

  // Voice
  {
    name: 'Bland AI',
    slug: 'bland-ai',
    description: 'Deploys enterprise AI phone agents that handle inbound and outbound calls in 40+ languages with SOC2, HIPAA, and PCI DSS compliance built in.',
    providerName: 'Bland',
    providerUrl: 'https://www.bland.ai/',
    agentUrl: 'https://www.bland.ai/',
    categories: ['voice-messaging'],
    tags: ['voice-agent', 'phone-calls', 'enterprise', 'hipaa', 'soc2'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },
  {
    name: 'Retell AI',
    slug: 'retell-ai',
    description: 'Builds, tests, deploys, and monitors natural-sounding AI voice agents with ~600ms latency for scheduling, support, and administrative phone workflows.',
    providerName: 'Retell AI',
    providerUrl: 'https://www.retellai.com/',
    agentUrl: 'https://www.retellai.com/',
    categories: ['voice-messaging'],
    tags: ['voice-agent', 'phone-calls', 'hipaa', 'soc2', 'real-time'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },

  // Sales / marketing
  {
    name: 'Artisan AI',
    slug: 'artisan-ai',
    description: 'Deploys Ava, an AI BDR that sources leads from 250M+ B2B contacts, sends personalized multi-channel sequences, handles replies, and books meetings.',
    providerName: 'Artisan',
    providerUrl: 'https://www.artisan.co/',
    agentUrl: 'https://www.artisan.co/',
    categories: ['sales-marketing'],
    tags: ['sdr', 'outbound', 'lead-generation', 'b2b', 'sales-automation'],
    authType: 'oauth2',
    accessMethods: ['api'],
  },
  {
    name: '11x AI',
    slug: '11x-ai',
    description: 'Provides AI digital workers Alice (outbound SDR) and Julian (inbound) that run 24/7 to prospect, personalize outreach, and book meetings autonomously.',
    providerName: '11x',
    providerUrl: 'https://www.11x.ai/',
    agentUrl: 'https://www.11x.ai/',
    categories: ['sales-marketing'],
    tags: ['digital-workers', 'sdr', 'sales-automation', 'outbound', 'b2b'],
    authType: 'bearer',
    accessMethods: ['api'],
  },

  // Security
  {
    name: 'Semgrep',
    slug: 'semgrep',
    description: 'Scans source code with AI-assisted SAST, SCA, and secrets detection, finding 8x more true positives with 50% less noise than standalone foundation models.',
    providerName: 'Semgrep',
    providerUrl: 'https://semgrep.dev/',
    agentUrl: 'https://semgrep.dev/',
    categories: ['security'],
    tags: ['sast', 'security', 'open-source', 'code-review', 'supply-chain'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
  },
  {
    name: 'Socket Security',
    slug: 'socket-security',
    description: 'Detects malicious and risky packages in npm, PyPI, and open-source dependencies before install using static analysis and AI-powered behavioral detection.',
    providerName: 'Socket',
    providerUrl: 'https://socket.dev/',
    agentUrl: 'https://socket.dev/',
    categories: ['security'],
    tags: ['supply-chain', 'security', 'npm', 'pypi', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'browser-extension'],
  },

  // ── Mode A — New / updated May 13–22, 2026 ───────────────────────────────────
  {
    name: 'Notion Workers',
    slug: 'notion-workers',
    description: 'Hosts custom code Workers in a secure sandbox and connects external AI agents like Claude and Codex into Notion workspaces via a developer API.',
    providerName: 'Notion',
    providerUrl: 'https://notion.com/',
    agentUrl: 'https://developers.notion.com/',
    categories: ['infrastructure'],
    tags: ['workspace', 'workers', 'agent-api', 'serverless', 'notion', 'developer-platform'],
    authType: 'oauth2',
    accessMethods: ['api'],
  },
  {
    name: 'WSO2 Agent Manager',
    slug: 'wso2-agent-manager',
    description: 'Governs, secures, and scales enterprise AI agents across frameworks with zero-trust runtime, OpenTelemetry observability, and policy enforcement.',
    providerName: 'WSO2',
    providerUrl: 'https://wso2.com/',
    agentUrl: 'https://wso2.com/solutions/ai/',
    categories: ['infrastructure'],
    tags: ['governance', 'enterprise', 'agent-orchestration', 'open-source', 'kubernetes', 'mcp'],
    authType: 'oauth2',
    accessMethods: ['api'],
  },
  {
    name: 'Fabric RTI MCP',
    slug: 'fabric-rti-mcp',
    description: 'Bridges AI agents to Microsoft Fabric Real-Time Intelligence for natural-language KQL queries against Eventhouse and Azure Data Explorer streams.',
    providerName: 'Microsoft',
    providerUrl: 'https://microsoft.com/',
    agentUrl: 'https://github.com/microsoft/fabric-rti-mcp',
    categories: ['data-analytics'],
    tags: ['microsoft', 'fabric', 'real-time-intelligence', 'kql', 'mcp-server', 'azure'],
    authType: 'bearer',
    accessMethods: ['mcp'],
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
