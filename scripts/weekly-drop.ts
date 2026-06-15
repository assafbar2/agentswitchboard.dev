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
  // Paste agents here from either the Weekly Drop or Top 50 Audit prompt.
  // Each run skips agents that already exist. Clear after committing.
];
const _AGENTS_ADDED_2026_06_07: AgentInput[] = [
  {
    name: 'Sequential Thinking MCP',
    slug: 'sequential-thinking-mcp',
    description: 'Enables structured step-by-step reasoning for complex problems, letting AI models break tasks into revisable thought sequences with branching.',
    providerName: 'Anthropic',
    providerUrl: 'https://anthropic.com',
    agentUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    categories: ['code-devtools'],
    tags: ['sequential-reasoning', 'chain-of-thought', 'problem-solving', 'step-by-step', 'mcp-official', 'reasoning'],
    authType: 'none',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'sequential-reasoning', name: 'Sequential Reasoning', description: 'Breaks complex problems into numbered thought steps the model can revise, branch, or extend before arriving at an answer.' },
      { id: 'thought-branching', name: 'Thought Branching', description: 'Creates alternative reasoning paths from any prior thought step, letting models explore multiple approaches in parallel.' },
      { id: 'dynamic-step-count', name: 'Dynamic Step Count', description: 'Adjusts the total number of reasoning steps dynamically as the problem scope becomes clearer during the chain.' },
    ],
  },
  {
    name: 'MiniMax MCP',
    slug: 'minimax-mcp',
    description: 'Official MiniMax AI MCP server — generate speech from text, clone voices, create images and videos, and compose music via a single interface.',
    providerName: 'MiniMax AI',
    providerUrl: 'https://www.minimax.io',
    agentUrl: 'https://github.com/MiniMax-AI/MiniMax-MCP',
    categories: ['content-media'],
    tags: ['text-to-speech', 'voice-cloning', 'image-generation', 'video-generation', 'music-generation', 'mcp-official'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'text-to-speech', name: 'Text to Speech', description: 'Converts text to natural-sounding audio using a library of built-in voices or custom voice profiles.' },
      { id: 'voice-cloning', name: 'Voice Cloning', description: 'Clones a voice from provided audio files and uses it to synthesize new speech in the same vocal style.' },
      { id: 'video-generation', name: 'Video Generation', description: 'Generates short videos from text prompts using the MiniMax-Hailuo model with 6s or 10s duration and HD output.' },
      { id: 'music-generation', name: 'Music Generation', description: 'Composes original music tracks from a text prompt and lyrics using the music-1.5 model for high-quality audio.' },
    ],
  },
  {
    name: 'AgentQL MCP',
    slug: 'agentql-mcp',
    description: 'Extracts structured web data using natural language queries — no XPath or selectors needed. Works via Python/JS SDKs, MCP server, and REST API.',
    providerName: 'TinyFish',
    providerUrl: 'https://agentql.com',
    agentUrl: 'https://agentql.com/integrations',
    categories: ['browser-computer'],
    tags: ['web-scraping', 'data-extraction', 'natural-language', 'playwright', 'structured-data', 'browser-extension', 'rest-api'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'browser-extension'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'structured-extraction', name: 'Structured Extraction', description: 'Queries web page elements using natural language descriptions and returns clean structured JSON — no CSS selectors needed.' },
      { id: 'playwright-integration', name: 'Playwright Integration', description: 'Wraps AgentQL around Playwright browser sessions for Python and JavaScript, enabling AI-powered element interaction.' },
      { id: 'rest-api-extraction', name: 'REST API Extraction', description: 'Fetches and parses public-facing web data from any URL via REST API without a browser session running locally.' },
    ],
  },
  {
    name: 'OneSignal MCP',
    slug: 'onesignal-mcp',
    description: 'Official OneSignal MCP — send push notifications, email, and SMS, manage audience segments, check delivery stats, and update messaging templates.',
    providerName: 'OneSignal',
    providerUrl: 'https://onesignal.com',
    agentUrl: 'https://smithery.ai/server/@onesignal/onesignal',
    categories: ['communication'],
    tags: ['push-notifications', 'email', 'sms', 'audience-segmentation', 'campaign-analytics', 'mcp-official'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: true,
    verified: true,
    skills: [
      { id: 'send-notifications', name: 'Send Notifications', description: 'Sends push notifications, email, and SMS messages to audience segments using OneSignal\'s delivery infrastructure.' },
      { id: 'audience-management', name: 'Audience Management', description: 'Creates, updates, and queries audience segments for targeted messaging based on user attributes and behaviors.' },
      { id: 'campaign-analytics', name: 'Campaign Analytics', description: 'Retrieves delivery stats, open rates, and notification outcomes for sent campaigns across all channels.' },
    ],
  },
  {
    name: 'Gmail MCP',
    slug: 'gmail-mcp',
    description: 'Manages Gmail end-to-end via MCP — send, draft, reply, and search messages, organize with labels, retrieve contacts, and handle attachments.',
    providerName: 'Smithery',
    providerUrl: 'https://smithery.ai',
    agentUrl: 'https://smithery.ai/server/gmail',
    categories: ['communication'],
    tags: ['gmail', 'email', 'google', 'oauth2', 'inbox-management', 'contacts', 'attachments'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'email-management', name: 'Email Management', description: 'Fetches, searches, sends, drafts, and deletes Gmail messages using natural language or Gmail query syntax filters.' },
      { id: 'label-organization', name: 'Label Organization', description: 'Creates, modifies, and applies Gmail labels to messages and threads for inbox organization and filtering.' },
      { id: 'contact-retrieval', name: 'Contact Retrieval', description: 'Looks up and retrieves Google Contacts to autofill email recipients and keep people data in sync with Gmail.' },
    ],
  },
  {
    name: 'YouTube MCP',
    slug: 'youtube-mcp',
    description: 'Manages YouTube via MCP — search videos, retrieve statistics and captions, list channel content and playlists, upload videos, and update metadata.',
    providerName: 'Smithery',
    providerUrl: 'https://smithery.ai',
    agentUrl: 'https://smithery.ai/server/youtube',
    categories: ['content-media'],
    tags: ['youtube', 'video', 'google', 'oauth2', 'captions', 'channel-management', 'video-upload'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'video-search', name: 'Video Search', description: 'Searches YouTube for videos, channels, or playlists using a query and filters by type, publishing date, and results per page.' },
      { id: 'caption-extraction', name: 'Caption Extraction', description: 'Downloads caption tracks from YouTube videos in SRT, SBV, or VTT format for transcript analysis or translation.' },
      { id: 'channel-analytics', name: 'Channel Analytics', description: 'Retrieves subscriber counts, view counts, and video statistics for any YouTube channel by ID or handle.' },
    ],
  },
  {
    name: 'Google Sheets MCP',
    slug: 'google-sheets-mcp',
    description: 'Reads, writes, and formats Google Sheets data via MCP — manage sheets, run formulas, and collaborate on structured spreadsheet data in real time.',
    providerName: 'Smithery',
    providerUrl: 'https://smithery.ai',
    agentUrl: 'https://smithery.ai/server/googlesheets',
    categories: ['data-analytics'],
    tags: ['google-sheets', 'spreadsheet', 'google', 'oauth2', 'formulas', 'data-collaboration', 'structured-data'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'spreadsheet-rw', name: 'Spreadsheet Read/Write', description: 'Reads and writes cell data, rows, and ranges in Google Sheets with support for formatting and formula execution.' },
      { id: 'sheet-management', name: 'Sheet Management', description: 'Creates, renames, and deletes sheets within a Google Sheets document and manages sharing permissions.' },
      { id: 'formula-execution', name: 'Formula Execution', description: 'Runs spreadsheet formulas and retrieves computed values across cells and named ranges in real time.' },
    ],
  },
  {
    name: 'Vercel Grep MCP',
    slug: 'vercel-grep-mcp',
    description: 'Searches millions of public GitHub repositories for real-world code patterns and API usage examples using literal or regex queries. No key needed.',
    providerName: 'Vercel',
    providerUrl: 'https://vercel.com',
    agentUrl: 'https://smithery.ai/server/vercel/grep',
    categories: ['code-devtools'],
    tags: ['code-search', 'github', 'regex', 'pattern-matching', 'api-examples', 'vercel', 'developer-tools'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'code-pattern-search', name: 'Code Pattern Search', description: 'Searches millions of public GitHub repositories for literal code strings or regex patterns across any language.' },
      { id: 'regex-code-search', name: 'Regex Code Search', description: 'Applies full regular expressions including multiline and dotall flags to find complex code patterns in production repos.' },
      { id: 'language-filtered-search', name: 'Language-Filtered Search', description: 'Narrows code searches by programming language, repository name, or file path to get targeted, relevant results.' },
    ],
  },
  {
    name: 'Semantic Scholar MCP',
    slug: 'semantic-scholar-mcp',
    description: 'Searches millions of academic papers on Semantic Scholar and arXiv with citation analysis and full-text PDF extraction. No API key required.',
    providerName: 'Community',
    providerUrl: 'https://www.semanticscholar.org',
    agentUrl: 'https://smithery.ai/server/@hamid-vakilzadeh/mcpsemanticscholar',
    categories: ['research'],
    tags: ['academic-research', 'arxiv', 'pubmed', 'citation-analysis', 'pdf-extraction', 'semantic-scholar', 'literature-review'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'paper-search', name: 'Paper Search', description: 'Searches Semantic Scholar, arXiv, PubMed, bioRxiv, Google Scholar, and IACR for academic papers using natural language.' },
      { id: 'citation-analysis', name: 'Citation Analysis', description: 'Retrieves citation graphs, reference lists, and co-author networks for any academic paper from Semantic Scholar.' },
      { id: 'pdf-extraction', name: 'PDF Extraction', description: 'Downloads and extracts full text from arXiv and open-access PDFs for deep reading without leaving the agent context.' },
    ],
  },
  {
    name: 'Ghidra MCP',
    slug: 'ghidra-mcp',
    description: 'Connects AI to Ghidra for AI-assisted reverse engineering — 110 tools for decompilation, function analysis, disassembly, and symbol management.',
    providerName: 'Community',
    providerUrl: 'https://github.com/bethington/ghidra-mcp',
    agentUrl: 'https://github.com/bethington/ghidra-mcp',
    categories: ['security'],
    tags: ['reverse-engineering', 'ghidra', 'decompilation', 'binary-analysis', 'security-research', 'disassembly'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'binary-decompilation', name: 'Binary Decompilation', description: 'Decompiles binary functions to C-like pseudocode using Ghidra\'s decompiler engine for AI-assisted analysis.' },
      { id: 'function-analysis', name: 'Function Analysis', description: 'Lists, renames, and annotates functions and their call graphs in a loaded Ghidra binary project.' },
      { id: 'symbol-management', name: 'Symbol Management', description: 'Reads and writes Ghidra symbols, labels, namespaces, and data types to structure reverse-engineered binaries.' },
    ],
  },
  {
    name: 'Airtable MCP',
    slug: 'airtable-mcp',
    description: 'Manages Airtable as a database and operations layer for agents — create bases and schema, work with records, and share structured data across teams.',
    providerName: 'Smithery',
    providerUrl: 'https://smithery.ai',
    agentUrl: 'https://smithery.ai/server/airtable',
    categories: ['data-analytics'],
    tags: ['airtable', 'database', 'no-code', 'records', 'oauth2', 'project-management', 'collaboration'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'record-management', name: 'Record Management', description: 'Creates, reads, updates, and deletes Airtable records across bases and tables using natural language field access.' },
      { id: 'base-schema-ops', name: 'Base & Schema Ops', description: 'Creates new Airtable bases, tables, and fields, and retrieves schema definitions for existing workspace structures.' },
      { id: 'view-filtering', name: 'View Filtering', description: 'Queries Airtable views with filter formulas, sorting, and field visibility settings to retrieve targeted record subsets.' },
    ],
  },
  {
    name: 'ClickHouse MCP',
    slug: 'clickhouse-mcp',
    description: 'Official ClickHouse Cloud MCP — run SQL queries, list databases and tables, explore services and backups, inspect usage, and manage ClickPipes.',
    providerName: 'ClickHouse',
    providerUrl: 'https://clickhouse.com',
    agentUrl: 'https://smithery.ai/server/clickhouse',
    categories: ['data-analytics'],
    tags: ['clickhouse', 'sql', 'olap', 'data-warehouse', 'cloud-database', 'analytics', 'mcp-official'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'sql-query', name: 'SQL Query', description: 'Executes read-only SELECT queries against a ClickHouse Cloud service with configurable timeout up to one hour.' },
      { id: 'schema-exploration', name: 'Schema Exploration', description: 'Lists databases and tables with full column metadata across ClickHouse Cloud services in an organization.' },
      { id: 'service-management', name: 'Service Management', description: 'Retrieves service details, backup configurations, cost reports, and ClickPipe status for ClickHouse Cloud orgs.' },
    ],
  },
  {
    name: 'Polymarket MCP',
    slug: 'polymarket-mcp',
    description: 'Discovers and filters Polymarket prediction markets by tags, volume, and liquidity. Analyzes probabilities, market health, and tracks category trends.',
    providerName: 'Community',
    providerUrl: 'https://polymarket.com',
    agentUrl: 'https://smithery.ai/server/@aryankeluskar/polymarket-mcp',
    categories: ['finance'],
    tags: ['polymarket', 'prediction-markets', 'betting-odds', 'probability', 'crypto', 'forecasting', 'defi'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'market-discovery', name: 'Market Discovery', description: 'Searches and filters Polymarket prediction markets by tags, category, volume, and liquidity in real time.' },
      { id: 'market-analysis', name: 'Market Analysis', description: 'Returns current probabilities, market health scores, and recent trade activity for individual Polymarket events.' },
      { id: 'trend-tracking', name: 'Trend Tracking', description: 'Scans Polymarket categories to identify trending markets and compare sentiment shifts across time windows.' },
    ],
  },
  {
    name: 'Hugging Face MCP',
    slug: 'hugging-face-mcp',
    description: 'Discovers AI models, explores datasets, and accesses model documentation and capabilities on Hugging Face — the central hub for open-source ML.',
    providerName: 'Smithery',
    providerUrl: 'https://smithery.ai',
    agentUrl: 'https://smithery.ai/server/hugging-face',
    categories: ['research'],
    tags: ['hugging-face', 'ml-models', 'datasets', 'model-hub', 'open-source', 'machine-learning', 'documentation'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    skills: [
      { id: 'model-discovery', name: 'Model Discovery', description: 'Searches and filters Hugging Face\'s catalog of hundreds of thousands of open-source ML models by task and framework.' },
      { id: 'dataset-exploration', name: 'Dataset Exploration', description: 'Explores Hugging Face datasets including previews, metadata, and download links for ML training pipelines.' },
      { id: 'model-documentation', name: 'Model Documentation', description: 'Fetches model cards, capabilities, limitations, and usage instructions from the Hugging Face model hub.' },
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
  communication:      '7t5V37xtBu02l60r6cKK4d',
  orchestration:      '5ODCjKvQK5N7Fkkt8zfbE0',
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
