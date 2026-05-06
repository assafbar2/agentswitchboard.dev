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
  {
    name: 'Google Workspace MCP',
    slug: 'google-workspace-mcp',
    description: 'MCP server giving AI agents full control over 12 Google services — Gmail, Drive, Calendar, Docs, Sheets, Slides, Forms, Chat, Tasks, Contacts, Apps Script, and Search.',
    providerName: 'taylorwilsdon',
    providerUrl: 'https://github.com/taylorwilsdon',
    agentUrl: 'https://github.com/taylorwilsdon/google_workspace_mcp',
    categories: ['scheduling', 'infrastructure'],
    tags: ['google-workspace', 'gmail', 'google-drive', 'google-calendar', 'google-docs', 'google-sheets', 'mcp-server'],
    authType: 'oauth2',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'gmail-management',
        name: 'Gmail Management',
        description: 'Send, draft, reply, forward, and bulk-modify Gmail messages and threads with full label and attachment support.',
      },
      {
        id: 'drive-operations',
        name: 'Drive Operations',
        description: 'Upload, organize, search, and share Google Drive files and folders with fine-grained permission control.',
      },
      {
        id: 'calendar-management',
        name: 'Calendar Management',
        description: 'Create, read, update, and delete Google Calendar events and manage availability across multiple calendars.',
      },
      {
        id: 'docs-sheets-slides',
        name: 'Docs Sheets Slides',
        description: 'Read and write Google Docs, Sheets, and Slides — including formulas, cell ranges, and slide content.',
      },
    ],
  },
  {
    name: 'Linkup',
    slug: 'linkup',
    description: 'Production-grade web search API for AI — sourced, cited answers with full-text snippets from trusted sources. REST API, Python/Node SDKs, and MCP server for agent workflows.',
    providerName: 'Linkup Platform',
    providerUrl: 'https://linkup.so',
    agentUrl: 'https://docs.linkup.so',
    categories: ['research'],
    tags: ['web-search', 'search-api', 'real-time-search', 'citations', 'grounding', 'rag', 'llm-search'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'web-search',
        name: 'Web Search',
        description: 'Search the web and return sourced, cited results with full-text snippets tuned for LLM consumption.',
      },
      {
        id: 'deep-research',
        name: 'Deep Research',
        description: 'Run in-depth research queries that synthesize comprehensive answers from multiple trusted sources with citations.',
      },
      {
        id: 'url-fetch',
        name: 'URL Fetch',
        description: 'Retrieve and extract clean text content from any web page URL for ingestion into agent context windows.',
      },
    ],
  },
  {
    name: 'MaxKB',
    slug: 'maxkb',
    description: 'Open-source enterprise RAG platform for building AI agents. Upload docs, auto-vectorize, and orchestrate multi-step workflows with MCP tool-use and a visual workflow engine.',
    providerName: '1Panel',
    providerUrl: 'https://1panel.cn',
    agentUrl: 'https://maxkb.cn',
    categories: ['research', 'infrastructure'],
    tags: ['rag', 'knowledge-base', 'vector-search', 'workflow-engine', 'mcp-tools', 'document-ingestion', 'enterprise-ai'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'document-ingestion',
        name: 'Document Ingestion',
        description: 'Upload documents or crawl web pages and automatically split, vectorize, and index content for retrieval.',
      },
      {
        id: 'rag-query',
        name: 'RAG Query',
        description: 'Query a knowledge base with natural language and receive grounded answers with cited source references.',
      },
      {
        id: 'workflow-orchestration',
        name: 'Workflow Orchestration',
        description: 'Build multi-step AI agent workflows with a visual engine, MCP tool-use, and custom function library nodes.',
      },
      {
        id: 'rest-api-access',
        name: 'REST API Access',
        description: 'Integrate MaxKB knowledge bases and agents into external applications via a documented REST API.',
      },
    ],
  },
  {
    name: 'Reddit MCP Buddy',
    slug: 'reddit-mcp-buddy',
    description: 'MCP server for Reddit — search subreddits, retrieve posts and comment threads, analyze user activity, and post content. No API key required for read access.',
    providerName: 'karanb192',
    providerUrl: 'https://github.com/karanb192',
    agentUrl: 'https://github.com/karanb192/reddit-mcp-buddy',
    categories: ['research', 'data-analytics'],
    tags: ['reddit', 'social-media', 'community-research', 'subreddit-search', 'mcp-server', 'content-retrieval', 'user-analysis'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'subreddit-search',
        name: 'Subreddit Search',
        description: 'Search across subreddits by keyword and return ranked posts with scores, comment counts, and metadata.',
      },
      {
        id: 'post-retrieval',
        name: 'Post Retrieval',
        description: 'Retrieve Reddit posts and full comment threads with nested replies, author info, and vote counts.',
      },
      {
        id: 'user-analysis',
        name: 'User Analysis',
        description: 'Analyze Reddit user profiles, post history, and activity patterns for research and monitoring use cases.',
      },
      {
        id: 'content-posting',
        name: 'Content Posting',
        description: 'Post new submissions and comments to subreddits using authenticated or rate-limited anonymous access tiers.',
      },
    ],
  },
  {
    name: 'Agent TARS',
    slug: 'agent-tars',
    description: "ByteDance's multimodal AI agent for desktop and browser automation — controls GUIs, browsers, and shell via vision and MCP tools. Available as npm CLI and desktop app.",
    providerName: 'ByteDance',
    providerUrl: 'https://bytedance.com',
    agentUrl: 'https://github.com/bytedance/UI-TARS-desktop',
    categories: ['browser-computer', 'infrastructure'],
    tags: ['computer-use', 'gui-agent', 'multimodal', 'desktop-automation', 'mcp-tools', 'browser-control', 'bytedance'],
    authType: 'none',
    accessMethods: ['cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'gui-control',
        name: 'GUI Control',
        description: 'Control desktop application interfaces using vision-based element detection, clicking, and keyboard input.',
      },
      {
        id: 'browser-agent',
        name: 'Browser Agent',
        description: 'Navigate websites, fill forms, click elements, and extract data from web pages autonomously via the browser.',
      },
      {
        id: 'shell-execution',
        name: 'Shell Execution',
        description: 'Execute shell commands and scripts as part of multi-step agent workflows with streamed output support.',
      },
      {
        id: 'mcp-tool-integration',
        name: 'MCP Tool Integration',
        description: 'Connect to local or remote MCP servers and invoke their tools as steps in multi-tool agent pipelines.',
      },
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
