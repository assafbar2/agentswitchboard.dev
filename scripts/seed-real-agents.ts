/**
 * Seed script: adds ~60 real A2A/agent-related products to Contentful
 * and updates existing entries (AgentMail, here.now) with accessMethods.
 *
 * Run: npx tsx scripts/seed-real-agents.ts
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import * as fs from 'fs';

function readTokenFromEnv(): string {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/CONTENTFUL_MANAGEMENT_TOKEN="([^"]+)"/);
  return match?.[1] ?? process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
}

// Refresh the CMA token before starting
try {
  execSync('bash scripts/refresh-cma-token.sh', { stdio: 'inherit' });
  process.env.CONTENTFUL_MANAGEMENT_TOKEN = readTokenFromEnv();
} catch (e) {
  console.log('⚠️  Token refresh failed, using existing token');
}

const SPACE = process.env.CONTENTFUL_SPACE_ID || '8e4hmp8gwcuv';
let TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/master`;
console.log(`Using space: ${SPACE}, token starts: ${TOKEN?.slice(0, 15)}...`);

// Track token age — refresh if older than 7 minutes
let tokenCreatedAt = Date.now();
async function refreshTokenIfNeeded() {
  if (Date.now() - tokenCreatedAt > 7 * 60 * 1000) {
    console.log('  🔄 Refreshing token...');
    try {
      execSync('bash scripts/refresh-cma-token.sh', { stdio: 'pipe' });
      TOKEN = readTokenFromEnv();
      tokenCreatedAt = Date.now();
      console.log('  ✅ Token refreshed');
    } catch (e) {
      console.log('  ⚠️  Token refresh failed mid-run');
    }
  }
}

// ── Category IDs ─────────────────────────────────────────────────
const CAT: Record<string, string> = {
  language: '7inqvMgFf4dh13bC79cFhU',
  'data-analytics': '3d0ys6UDI0FjTrgw4v5wv8',
  'customer-support': '53qEOctvvj7B7iPGjkgLw0',
  'code-devtools': 'Wx5Z0jaccw9a94lsbfKTX',
  finance: '4l9ucrmQTUoipatNlXCqeP',
  'sales-marketing': '14ULrKtnQZyzO792Km8BnZ',
  legal: '2EiPFKj4bl1l93XXc9pnny',
  'content-media': '2bHczM99CVsDHN44Y4NmX8',
  infrastructure: '4DWCugnTmIRlLsaYa5WjZR',
  research: '22Kd21qgJwkPaMhgYGUfTO',
  scheduling: '4UuA4GGBTNK9FENwYQSMxe',
  security: 'ZcI8XfUcXNjfAhGvki2zi',
  'commerce-payments': '44nVoPNVZXunRtMumItZfO',
  'memory-state':      'ydaYTlRXXas53G3kbr65i',
  'browser-computer':  '6g6TPbURSB52Z2scsiUGxN',
  'vector-databases':  '1rQCIuLKfXhq2efEUDtQ8C',
  'voice-messaging':   '2pV8SRrEcdoS7Rjodj490d',
};

function catLink(slug: string) {
  return { sys: { type: 'Link', linkType: 'Entry', id: CAT[slug] } };
}

// ── Helpers ──────────────────────────────────────────────────────
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

async function createAgent(agent: any) {
  await refreshTokenIfNeeded();

  const existing = await findEntry(agent.slug);
  if (existing) {
    console.log(`  ⏭  ${agent.name} (${agent.slug}) already exists`);
    return existing;
  }

  const fields: any = {
    name: { 'en-US': agent.name },
    slug: { 'en-US': agent.slug },
    description: { 'en-US': agent.description },
    providerName: { 'en-US': agent.providerName },
    providerUrl: { 'en-US': agent.providerUrl },
    agentUrl: { 'en-US': agent.agentUrl },
    categories: { 'en-US': agent.categories.map((c: string) => catLink(c)) },
    tags: { 'en-US': agent.tags || [] },
    authType: { 'en-US': agent.authType || 'apiKey' },
    status: { 'en-US': 'published' },
    featured: { 'en-US': agent.featured || false },
    verified: { 'en-US': agent.verified || false },
    tier: { 'en-US': agent.tier || 'free' },
    discoveredBy: { 'en-US': 'manual' },
    accessMethods: { 'en-US': agent.accessMethods || [] },
    supportsStreaming: { 'en-US': agent.supportsStreaming || false },
    supportsPushNotifications: { 'en-US': agent.supportsPushNotifications || false },
  };

  if (agent.skills) {
    fields.skills = { 'en-US': agent.skills };
  }

  const entry = await cma('/entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': 'agent' } as any,
    body: JSON.stringify({ fields }),
  });

  if (entry.sys?.id && !entry.sys?.type?.includes('Error')) {
    // Publish
    const pubResult = await cma(`/entries/${entry.sys.id}/published`, {
      method: 'PUT',
      headers: { 'X-Contentful-Version': String(entry.sys.version) } as any,
    });
    if (pubResult.sys?.publishedVersion) {
      console.log(`  ✅ ${agent.name}`);
    } else {
      console.log(`  ⚠️  ${agent.name} created but publish failed: ${JSON.stringify(pubResult).slice(0, 150)}`);
    }
  } else {
    console.log(`  ❌ ${agent.name}: ${JSON.stringify(entry).slice(0, 300)}`);
  }
  return entry;
}

async function updateAccessMethods(slug: string, methods: string[]) {
  const entry = await findEntry(slug);
  if (!entry) { console.log(`  ⚠️  ${slug} not found`); return; }

  const ver = entry.sys.version;
  entry.fields.accessMethods = { 'en-US': methods };

  const updated = await cma(`/entries/${entry.sys.id}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(ver) } as any,
    body: JSON.stringify({ fields: entry.fields }),
  });

  if (updated.sys?.id) {
    await cma(`/entries/${updated.sys.id}/published`, {
      method: 'PUT',
      headers: { 'X-Contentful-Version': String(updated.sys.version) } as any,
    });
    console.log(`  🔄 Updated ${slug} access methods: ${methods.join(', ')}`);
  }
}

async function updateCategory(slug: string, categorySlug: string) {
  await refreshTokenIfNeeded();
  const entry = await findEntry(slug);
  if (!entry) { console.log(`  ⚠️  ${slug} not found`); return; }

  const categoryId = CAT[categorySlug];
  if (!categoryId) { console.log(`  ⚠️  Category ${categorySlug} not in CAT map yet`); return; }

  const ver = entry.sys.version;
  entry.fields.categories = { 'en-US': [{ sys: { type: 'Link', linkType: 'Entry', id: categoryId } }] };

  const updated = await cma(`/entries/${entry.sys.id}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(ver) } as any,
    body: JSON.stringify({ fields: entry.fields }),
  });

  if (updated.sys?.id) {
    await cma(`/entries/${updated.sys.id}/published`, {
      method: 'PUT',
      headers: { 'X-Contentful-Version': String(updated.sys.version) } as any,
    });
    console.log(`  🔄 Moved ${slug} → ${categorySlug}`);
  } else {
    console.log(`  ❌ Failed to update category for ${slug}: ${JSON.stringify(updated).slice(0, 200)}`);
  }
}

async function createCategory(cat: {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
}): Promise<string> {
  await refreshTokenIfNeeded();
  // Check if it already exists
  const existing = await cma(`/entries?content_type=category&fields.slug=${cat.slug}&limit=1`);
  if (existing.items?.[0]) {
    const id = existing.items[0].sys.id;
    console.log(`  ⏭  Category "${cat.name}" already exists (${id})`);
    return id;
  }
  const entry = await cma('/entries', {
    method: 'POST',
    headers: { 'X-Contentful-Content-Type': 'category' } as any,
    body: JSON.stringify({
      fields: {
        name: { 'en-US': cat.name },
        slug: { 'en-US': cat.slug },
        description: { 'en-US': cat.description },
        icon: { 'en-US': cat.icon },
        sortOrder: { 'en-US': cat.sortOrder },
      },
    }),
  });
  if (!entry.sys?.id || entry.sys?.type?.includes('Error')) {
    console.log(`  ❌ Category "${cat.name}": ${JSON.stringify(entry).slice(0, 300)}`);
    return '';
  }
  const pub = await cma(`/entries/${entry.sys.id}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) } as any,
  });
  if (pub.sys?.publishedVersion) {
    console.log(`  ✅ Category "${cat.name}" created (${entry.sys.id})`);
  } else {
    console.log(`  ⚠️  Category "${cat.name}" created but publish failed`);
  }
  return entry.sys.id;
}

// ── Agent data ──────────────────────────────────────────────────
const agents = [
  // ── Language & Translation ──
  {
    name: 'DeepL API',
    slug: 'deepl-api',
    description: 'Neural machine translation API supporting 30+ languages with document translation, glossary support, and formality controls.',
    providerName: 'DeepL',
    providerUrl: 'https://deepl.com',
    agentUrl: 'https://developers.deepl.com/docs',
    categories: ['language'],
    tags: ['translation', 'nlp', 'localization'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    verified: true,
  },
  {
    name: 'Google Cloud Translation',
    slug: 'google-cloud-translation',
    description: 'Google\'s translation API offering real-time translation across 100+ languages with AutoML custom model training.',
    providerName: 'Google',
    providerUrl: 'https://cloud.google.com',
    agentUrl: 'https://cloud.google.com/translate',
    categories: ['language'],
    tags: ['translation', 'google-cloud', 'nlp'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    verified: true,
  },
  {
    name: 'Azure AI Translator',
    slug: 'azure-ai-translator',
    description: 'Microsoft\'s cloud translation service with real-time text translation, document translation, and custom terminology support.',
    providerName: 'Microsoft',
    providerUrl: 'https://azure.microsoft.com',
    agentUrl: 'https://azure.microsoft.com/en-us/products/ai-services/ai-translator',
    categories: ['language'],
    tags: ['translation', 'azure', 'nlp'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    verified: true,
  },

  // ── Data & Analytics ──
  {
    name: 'Snowflake Cortex',
    slug: 'snowflake-cortex',
    description: 'AI-powered analytics layer on Snowflake enabling natural language queries, automated insights, and LLM-driven data transformations.',
    providerName: 'Snowflake',
    providerUrl: 'https://snowflake.com',
    agentUrl: 'https://www.snowflake.com/en/data-cloud/cortex/',
    categories: ['data-analytics'],
    tags: ['analytics', 'sql', 'data-warehouse'],
    authType: 'oauth2',
    accessMethods: ['api', 'cli'],
    verified: true,
  },
  {
    name: 'Databricks AI',
    slug: 'databricks-ai',
    description: 'Unified analytics platform with AI/ML capabilities, featuring Mosaic AI for building compound AI systems on your lakehouse data.',
    providerName: 'Databricks',
    providerUrl: 'https://databricks.com',
    agentUrl: 'https://www.databricks.com/product/machine-learning',
    categories: ['data-analytics'],
    tags: ['analytics', 'ml', 'lakehouse'],
    authType: 'bearer',
    accessMethods: ['api', 'cli'],
    verified: true,
  },
  {
    name: 'Hex',
    slug: 'hex',
    description: 'Collaborative analytics platform with AI-assisted SQL, Python notebooks, and Magic AI that writes queries from natural language.',
    providerName: 'Hex',
    providerUrl: 'https://hex.tech',
    agentUrl: 'https://hex.tech/product/magic-ai/',
    categories: ['data-analytics'],
    tags: ['analytics', 'notebooks', 'sql'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },
  {
    name: 'Firebolt',
    slug: 'firebolt',
    description: 'Cloud data warehouse engineered for sub-second analytics with AI-optimized indexing and query acceleration.',
    providerName: 'Firebolt',
    providerUrl: 'https://firebolt.io',
    agentUrl: 'https://www.firebolt.io/',
    categories: ['data-analytics'],
    tags: ['analytics', 'sql', 'data-warehouse'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
  },

  // ── Customer Support ──
  {
    name: 'Intercom Fin',
    slug: 'intercom-fin',
    description: 'AI-first customer service agent that resolves 50%+ of support volume instantly using your help center and conversation history.',
    providerName: 'Intercom',
    providerUrl: 'https://intercom.com',
    agentUrl: 'https://www.intercom.com/fin',
    categories: ['customer-support'],
    tags: ['support', 'chatbot', 'ai-agent'],
    authType: 'bearer',
    accessMethods: ['api', 'mcp'],
    featured: true,
    verified: true,
  },
  {
    name: 'Zendesk AI',
    slug: 'zendesk-ai',
    description: 'AI-powered customer service with autonomous agents, intelligent triage, and agent copilot built into the Zendesk platform.',
    providerName: 'Zendesk',
    providerUrl: 'https://zendesk.com',
    agentUrl: 'https://www.zendesk.com/service/ai/',
    categories: ['customer-support'],
    tags: ['support', 'ticketing', 'ai-agent'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp'],
    verified: true,
  },
  {
    name: 'Ada',
    slug: 'ada',
    description: 'AI-powered customer service automation platform resolving complex inquiries across channels with reasoning-based AI agents.',
    providerName: 'Ada',
    providerUrl: 'https://ada.cx',
    agentUrl: 'https://www.ada.cx/',
    categories: ['customer-support'],
    tags: ['support', 'automation', 'ai-agent'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },
  {
    name: 'Freshdesk Freddy AI',
    slug: 'freshdesk-freddy',
    description: 'AI assistant for Freshdesk that auto-triages tickets, suggests responses, and resolves common issues with self-service bots.',
    providerName: 'Freshworks',
    providerUrl: 'https://freshworks.com',
    agentUrl: 'https://www.freshworks.com/freshdesk/',
    categories: ['customer-support'],
    tags: ['support', 'ticketing', 'automation'],
    authType: 'apiKey',
    accessMethods: ['api'],
  },

  // ── Code & DevTools ──
  {
    name: 'Stripe Agent Toolkit',
    slug: 'stripe-agent-toolkit',
    description: 'Official Stripe toolkit for AI agents — enables LLMs to create charges, manage subscriptions, issue refunds, and read financial data via function calling.',
    providerName: 'Stripe',
    providerUrl: 'https://stripe.com',
    agentUrl: 'https://docs.stripe.com/agents',
    categories: ['code-devtools', 'finance'],
    tags: ['payments', 'api', 'agent-toolkit'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    featured: true,
    verified: true,
  },
  {
    name: 'GitHub Copilot',
    slug: 'github-copilot',
    description: 'AI pair programmer that suggests code completions, generates functions, writes tests, and now supports agentic coding via Copilot Agent mode.',
    providerName: 'GitHub',
    providerUrl: 'https://github.com',
    agentUrl: 'https://github.com/features/copilot',
    categories: ['code-devtools'],
    tags: ['code-completion', 'ai-assistant', 'ide'],
    authType: 'oauth2',
    accessMethods: ['api', 'cli', 'browser-extension'],
    featured: true,
    verified: true,
  },
  {
    name: 'Cursor',
    slug: 'cursor',
    description: 'AI-native code editor built on VS Code with deep AI integration — multi-file edits, codebase-aware chat, and autonomous coding.',
    providerName: 'Anysphere',
    providerUrl: 'https://cursor.com',
    agentUrl: 'https://cursor.com',
    categories: ['code-devtools'],
    tags: ['ide', 'code-editor', 'ai-assistant'],
    authType: 'apiKey',
    accessMethods: ['cli'],
    verified: true,
  },
  {
    name: 'Codeium / Windsurf',
    slug: 'codeium-windsurf',
    description: 'AI code acceleration platform with Windsurf Editor, offering agentic flows, multi-file edits, and Cascade for autonomous coding.',
    providerName: 'Codeium',
    providerUrl: 'https://codeium.com',
    agentUrl: 'https://codeium.com/windsurf',
    categories: ['code-devtools'],
    tags: ['ide', 'code-completion', 'ai-assistant'],
    authType: 'apiKey',
    accessMethods: ['api', 'browser-extension'],
  },
  {
    name: 'Sentry AI',
    slug: 'sentry-ai',
    description: 'Error monitoring with AI-powered issue grouping, root cause analysis, and automated fix suggestions for production applications.',
    providerName: 'Sentry',
    providerUrl: 'https://sentry.io',
    agentUrl: 'https://sentry.io/for/ai/',
    categories: ['code-devtools', 'infrastructure'],
    tags: ['monitoring', 'debugging', 'error-tracking'],
    authType: 'bearer',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Linear',
    slug: 'linear',
    description: 'Streamlined issue tracking with AI-powered auto-labeling, duplicate detection, and AI project assistant for software teams.',
    providerName: 'Linear',
    providerUrl: 'https://linear.app',
    agentUrl: 'https://linear.app',
    categories: ['code-devtools', 'scheduling'],
    tags: ['project-management', 'issue-tracking', 'ai'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp'],
    verified: true,
  },

  // ── Finance & Accounting ──
  {
    name: 'Plaid',
    slug: 'plaid',
    description: 'Financial data connectivity platform enabling apps to connect with bank accounts, verify identity, and access transaction data.',
    providerName: 'Plaid',
    providerUrl: 'https://plaid.com',
    agentUrl: 'https://plaid.com/docs/',
    categories: ['finance'],
    tags: ['banking', 'fintech', 'data'],
    authType: 'apiKey',
    accessMethods: ['api'],
    verified: true,
  },
  {
    name: 'Ramp Intelligence',
    slug: 'ramp-intelligence',
    description: 'AI-powered corporate card and expense management with automated receipt matching, spend insights, and policy enforcement.',
    providerName: 'Ramp',
    providerUrl: 'https://ramp.com',
    agentUrl: 'https://ramp.com/intelligence',
    categories: ['finance'],
    tags: ['expense-management', 'corporate-card', 'ai'],
    authType: 'oauth2',
    accessMethods: ['api'],
    verified: true,
  },
  {
    name: 'Brex AI',
    slug: 'brex-ai',
    description: 'AI-powered spend management platform with automated expense categorization, receipt matching, and financial controls.',
    providerName: 'Brex',
    providerUrl: 'https://brex.com',
    agentUrl: 'https://www.brex.com/',
    categories: ['finance'],
    tags: ['expense-management', 'fintech', 'ai'],
    authType: 'oauth2',
    accessMethods: ['api'],
  },

  // ── Sales & Marketing ──
  {
    name: 'Apollo.io',
    slug: 'apollo-io',
    description: 'Sales intelligence and engagement platform with AI-powered prospecting, lead scoring, and automated outreach sequences.',
    providerName: 'Apollo.io',
    providerUrl: 'https://apollo.io',
    agentUrl: 'https://www.apollo.io/',
    categories: ['sales-marketing'],
    tags: ['sales', 'prospecting', 'outreach'],
    authType: 'apiKey',
    accessMethods: ['api', 'browser-extension'],
    verified: true,
  },
  {
    name: 'Clay',
    slug: 'clay',
    description: 'Data enrichment and outbound automation platform that combines 100+ data providers with AI for personalized outreach at scale.',
    providerName: 'Clay',
    providerUrl: 'https://clay.com',
    agentUrl: 'https://www.clay.com/',
    categories: ['sales-marketing', 'data-analytics'],
    tags: ['enrichment', 'outbound', 'automation'],
    authType: 'apiKey',
    accessMethods: ['api'],
    verified: true,
  },
  {
    name: 'HubSpot Breeze',
    slug: 'hubspot-breeze',
    description: 'AI companion across the HubSpot platform — Breeze Copilot for CRM tasks, Breeze Agents for autonomous work, and Breeze Intelligence for data enrichment.',
    providerName: 'HubSpot',
    providerUrl: 'https://hubspot.com',
    agentUrl: 'https://www.hubspot.com/products/artificial-intelligence',
    categories: ['sales-marketing', 'customer-support'],
    tags: ['crm', 'marketing', 'ai-agent'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'cli', 'browser-extension'],
    verified: true,
  },
  {
    name: 'Jasper',
    slug: 'jasper',
    description: 'Enterprise AI marketing platform generating on-brand content, campaigns, and copy powered by company knowledge and style guides.',
    providerName: 'Jasper',
    providerUrl: 'https://jasper.ai',
    agentUrl: 'https://www.jasper.ai/',
    categories: ['sales-marketing', 'content-media'],
    tags: ['content', 'copywriting', 'marketing'],
    authType: 'apiKey',
    accessMethods: ['api', 'browser-extension'],
  },

  // ── Legal & Compliance ──
  {
    name: 'Harvey AI',
    slug: 'harvey-ai',
    description: 'AI legal assistant for law firms — drafts contracts, analyzes legal documents, performs due diligence, and provides research assistance.',
    providerName: 'Harvey',
    providerUrl: 'https://harvey.ai',
    agentUrl: 'https://www.harvey.ai/',
    categories: ['legal'],
    tags: ['legal', 'contracts', 'ai-assistant'],
    authType: 'apiKey',
    accessMethods: ['api'],
    verified: true,
  },
  {
    name: 'Ironclad AI',
    slug: 'ironclad-ai',
    description: 'AI-powered contract lifecycle management with smart redlining, clause extraction, and automated contract review workflows.',
    providerName: 'Ironclad',
    providerUrl: 'https://ironcladapp.com',
    agentUrl: 'https://ironcladapp.com/product/ai/',
    categories: ['legal'],
    tags: ['contracts', 'clm', 'ai'],
    authType: 'oauth2',
    accessMethods: ['api'],
  },
  {
    name: 'Casetext / CoCounsel',
    slug: 'casetext-cocounsel',
    description: 'AI legal research assistant by Thomson Reuters that reviews documents, drafts memos, analyzes contracts, and finds relevant case law.',
    providerName: 'Thomson Reuters',
    providerUrl: 'https://thomsonreuters.com',
    agentUrl: 'https://casetext.com/cocounsel/',
    categories: ['legal', 'research'],
    tags: ['legal-research', 'ai-assistant', 'documents'],
    authType: 'apiKey',
    accessMethods: ['api'],
    verified: true,
  },

  // ── Content & Media ──
  {
    name: 'ElevenLabs',
    slug: 'elevenlabs',
    description: 'AI voice synthesis platform generating realistic speech, voice cloning, and multilingual audio from text with emotional control.',
    providerName: 'ElevenLabs',
    providerUrl: 'https://elevenlabs.io',
    agentUrl: 'https://elevenlabs.io/docs/api-reference',
    categories: ['content-media'],
    tags: ['voice', 'tts', 'audio'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    verified: true,
  },
  {
    name: 'Diarize',
    slug: 'diarize-io',
    description: 'Speaker diarization API for YouTube videos. Auto-identifies and labels each speaker, exports clean transcripts in TXT, SRT, and VTT formats.',
    providerName: 'Diarize',
    providerUrl: 'https://diarize.io',
    agentUrl: 'https://diarize.io',
    categories: ['content-media'],
    tags: ['transcription', 'speaker-diarization', 'youtube', 'video-processing', 'srt', 'vtt', 'accessibility'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'speaker-diarization', name: 'Speaker Diarization', description: 'Automatically identifies and labels individual speakers throughout a YouTube video transcript' },
      { id: 'multi-format-export', name: 'Multi-Format Export', description: 'Export transcripts as TXT, SRT, or VTT for publishing, accessibility, and caption workflows' },
      { id: 'ai-correction', name: 'AI Transcript Correction', description: 'Post-processes raw transcripts with AI to produce clean, publication-ready text' },
      { id: 'job-tracking', name: 'Job Status Tracking', description: 'Poll job state through CREATED → DOWNLOADING → TRANSCRIBING → CORRECTING → COMPLETED pipeline' },
      { id: 'smart-dedup', name: 'Smart Deduplication', description: 'Detects previously processed videos and skips redundant transcription to save quota' },
    ],
  },
  {
    name: 'Runway ML',
    slug: 'runway-ml',
    description: 'AI-powered creative tools for video generation, image editing, and motion design — includes Gen-3 Alpha for text-to-video.',
    providerName: 'Runway',
    providerUrl: 'https://runwayml.com',
    agentUrl: 'https://runwayml.com/',
    categories: ['content-media'],
    tags: ['video', 'generative-ai', 'creative'],
    authType: 'apiKey',
    accessMethods: ['api'],
    verified: true,
  },
  {
    name: 'Replicate',
    slug: 'replicate',
    description: 'Run open-source AI models in the cloud — image generation, language models, video, audio via simple API calls.',
    providerName: 'Replicate',
    providerUrl: 'https://replicate.com',
    agentUrl: 'https://replicate.com/docs',
    categories: ['content-media', 'infrastructure'],
    tags: ['ml-models', 'inference', 'api'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    verified: true,
  },
  {
    name: 'Midjourney',
    slug: 'midjourney',
    description: 'AI image generation lab producing high-quality art and imagery from text prompts, known for exceptional aesthetic quality.',
    providerName: 'Midjourney',
    providerUrl: 'https://midjourney.com',
    agentUrl: 'https://midjourney.com/',
    categories: ['content-media'],
    tags: ['image-generation', 'art', 'creative'],
    authType: 'none',
    accessMethods: ['api'],
  },

  // ── Infrastructure & Ops ──
  {
    name: 'Vercel AI SDK',
    slug: 'vercel-ai-sdk',
    description: 'TypeScript toolkit for building AI applications with React Server Components, streaming, tool calling, and multi-provider LLM support.',
    providerName: 'Vercel',
    providerUrl: 'https://vercel.com',
    agentUrl: 'https://sdk.vercel.ai',
    categories: ['infrastructure', 'code-devtools'],
    tags: ['ai-sdk', 'streaming', 'typescript'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    featured: true,
    verified: true,
  },
  {
    name: 'Datadog LLM Observability',
    slug: 'datadog-llm-observability',
    description: 'End-to-end monitoring for LLM applications — trace prompts, evaluate responses, track costs, and debug AI pipelines in production.',
    providerName: 'Datadog',
    providerUrl: 'https://datadoghq.com',
    agentUrl: 'https://www.datadoghq.com/product/llm-observability/',
    categories: ['infrastructure'],
    tags: ['monitoring', 'observability', 'llm'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'PagerDuty AIOps',
    slug: 'pagerduty-aiops',
    description: 'Intelligent incident management with AI-powered event correlation, noise reduction, and automated incident response.',
    providerName: 'PagerDuty',
    providerUrl: 'https://pagerduty.com',
    agentUrl: 'https://www.pagerduty.com/platform/aiops/',
    categories: ['infrastructure'],
    tags: ['incident-management', 'aiops', 'monitoring'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Pulumi AI',
    slug: 'pulumi-ai',
    description: 'Infrastructure as code with AI — generate cloud infrastructure definitions from natural language using Pulumi\'s multi-language SDK.',
    providerName: 'Pulumi',
    providerUrl: 'https://pulumi.com',
    agentUrl: 'https://www.pulumi.com/ai/',
    categories: ['infrastructure'],
    tags: ['iac', 'cloud', 'devops'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'CrewAI',
    slug: 'crewai',
    description: 'Multi-agent orchestration framework for building teams of AI agents that collaborate, delegate, and solve complex tasks together.',
    providerName: 'CrewAI',
    providerUrl: 'https://crewai.com',
    agentUrl: 'https://www.crewai.com/',
    categories: ['infrastructure', 'code-devtools'],
    tags: ['multi-agent', 'orchestration', 'framework'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'LangChain / LangSmith',
    slug: 'langchain-langsmith',
    description: 'Framework for building LLM applications with chains, agents, and tool use — plus LangSmith for tracing, evaluation, and monitoring.',
    providerName: 'LangChain',
    providerUrl: 'https://langchain.com',
    agentUrl: 'https://www.langchain.com/',
    categories: ['infrastructure', 'code-devtools'],
    tags: ['framework', 'agents', 'llm'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },

  // ── Research & Knowledge ──
  {
    name: 'Perplexity Sonar',
    slug: 'perplexity-sonar',
    description: 'AI search API delivering grounded, cited answers with real-time web access — power your apps with Perplexity\'s search intelligence.',
    providerName: 'Perplexity',
    providerUrl: 'https://perplexity.ai',
    agentUrl: 'https://docs.perplexity.ai/',
    categories: ['research'],
    tags: ['search', 'ai', 'web'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    featured: true,
    verified: true,
  },
  {
    name: 'Exa AI',
    slug: 'exa-ai',
    description: 'Neural search engine API that understands meaning — find similar pages, search by content type, and get clean extracted text.',
    providerName: 'Exa',
    providerUrl: 'https://exa.ai',
    agentUrl: 'https://docs.exa.ai/',
    categories: ['research'],
    tags: ['search', 'embeddings', 'web'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    verified: true,
  },
  {
    name: 'Tavily',
    slug: 'tavily',
    description: 'Search API built specifically for AI agents — optimized for LLM consumption with structured results, content extraction, and answer generation.',
    providerName: 'Tavily',
    providerUrl: 'https://tavily.com',
    agentUrl: 'https://docs.tavily.com/',
    categories: ['research'],
    tags: ['search', 'ai-agents', 'web'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    verified: true,
  },
  {
    name: 'You.com Search API',
    slug: 'you-com-search-api',
    description: 'Programmable AI search with web, news, and RAG endpoints — grounded answers with citations for AI applications.',
    providerName: 'You.com',
    providerUrl: 'https://you.com',
    agentUrl: 'https://documentation.you.com/',
    categories: ['research'],
    tags: ['search', 'rag', 'web'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
  },
  {
    name: 'Glean',
    slug: 'glean',
    description: 'Enterprise AI search and knowledge management — connects all your company apps and surfaces answers with AI-powered work assistant.',
    providerName: 'Glean',
    providerUrl: 'https://glean.com',
    agentUrl: 'https://www.glean.com/',
    categories: ['research'],
    tags: ['enterprise-search', 'knowledge', 'ai'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'browser-extension'],
    verified: true,
  },
  {
    name: 'Firecrawl',
    slug: 'firecrawl',
    description: 'Turn websites into LLM-ready data — crawl, scrape, and convert web pages to clean markdown for AI consumption.',
    providerName: 'Firecrawl',
    providerUrl: 'https://firecrawl.dev',
    agentUrl: 'https://docs.firecrawl.dev/',
    categories: ['research', 'data-analytics'],
    tags: ['web-scraping', 'crawling', 'data-extraction'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },

  // ── Scheduling & Workflow ──
  {
    name: 'Zapier',
    slug: 'zapier',
    description: 'Automation platform connecting 7,000+ apps with AI-powered workflow builder, natural language automation, and agent capabilities.',
    providerName: 'Zapier',
    providerUrl: 'https://zapier.com',
    agentUrl: 'https://zapier.com/',
    categories: ['scheduling'],
    tags: ['automation', 'integration', 'workflow'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'browser-extension'],
    featured: true,
    verified: true,
  },
  {
    name: 'Make',
    slug: 'make',
    description: 'Visual automation platform for building complex workflows with branching, error handling, and AI-powered scenario generation.',
    providerName: 'Make',
    providerUrl: 'https://make.com',
    agentUrl: 'https://www.make.com/',
    categories: ['scheduling'],
    tags: ['automation', 'integration', 'visual'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Cal.com',
    slug: 'cal-com',
    description: 'Open-source scheduling infrastructure with AI scheduling assistant, round-robin routing, and extensive API for calendar automation.',
    providerName: 'Cal.com',
    providerUrl: 'https://cal.com',
    agentUrl: 'https://cal.com/',
    categories: ['scheduling'],
    tags: ['calendar', 'scheduling', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'n8n',
    slug: 'n8n',
    description: 'Open-source workflow automation with AI agent capabilities — build complex multi-step automations with 400+ integrations.',
    providerName: 'n8n',
    providerUrl: 'https://n8n.io',
    agentUrl: 'https://n8n.io/',
    categories: ['scheduling', 'infrastructure'],
    tags: ['automation', 'workflow', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Reclaim AI',
    slug: 'reclaim-ai',
    description: 'AI scheduling assistant that automatically finds optimal times for tasks, habits, and meetings across your team\'s calendars.',
    providerName: 'Reclaim AI',
    providerUrl: 'https://reclaim.ai',
    agentUrl: 'https://reclaim.ai/',
    categories: ['scheduling'],
    tags: ['calendar', 'time-management', 'ai'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'browser-extension'],
  },

  // ── Security ──
  {
    name: 'Snyk',
    slug: 'snyk',
    description: 'Developer security platform with AI-powered vulnerability detection, fix suggestions, and automated security testing across code, dependencies, and containers.',
    providerName: 'Snyk',
    providerUrl: 'https://snyk.io',
    agentUrl: 'https://snyk.io/',
    categories: ['security', 'code-devtools'],
    tags: ['security', 'vulnerabilities', 'devsecops'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'CrowdStrike Charlotte AI',
    slug: 'crowdstrike-charlotte-ai',
    description: 'Generative AI security analyst that investigates threats, provides attack summaries, and recommends remediation across the Falcon platform.',
    providerName: 'CrowdStrike',
    providerUrl: 'https://crowdstrike.com',
    agentUrl: 'https://www.crowdstrike.com/platform/charlotte-ai/',
    categories: ['security'],
    tags: ['cybersecurity', 'threat-detection', 'ai'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    verified: true,
  },
  {
    name: 'Stytch',
    slug: 'stytch',
    description: 'Authentication and identity platform with passwordless login, session management, and fraud detection APIs for modern applications.',
    providerName: 'Stytch',
    providerUrl: 'https://stytch.com',
    agentUrl: 'https://stytch.com/docs',
    categories: ['security'],
    tags: ['auth', 'identity', 'passwordless'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Descope',
    slug: 'descope',
    description: 'Drag-and-drop authentication platform with visual workflow builder for auth flows, MFA, and user management.',
    providerName: 'Descope',
    providerUrl: 'https://descope.com',
    agentUrl: 'https://www.descope.com/',
    categories: ['security'],
    tags: ['auth', 'identity', 'no-code'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
  },

  // ── Big Company Platforms ──
  {
    name: 'OpenAI Agents SDK',
    slug: 'openai-agents-sdk',
    description: 'Python framework for building multi-agent systems with handoffs, guardrails, and tool use — the official OpenAI agent orchestration toolkit.',
    providerName: 'OpenAI',
    providerUrl: 'https://openai.com',
    agentUrl: 'https://github.com/openai/openai-agents-python',
    categories: ['infrastructure', 'code-devtools'],
    tags: ['agents', 'framework', 'openai'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    featured: true,
    verified: true,
  },
  {
    name: 'Claude MCP',
    slug: 'claude-mcp',
    description: 'Anthropic\'s Model Context Protocol — open standard for connecting AI models to tools, data sources, and services with universal compatibility.',
    providerName: 'Anthropic',
    providerUrl: 'https://anthropic.com',
    agentUrl: 'https://modelcontextprotocol.io',
    categories: ['infrastructure', 'code-devtools'],
    tags: ['mcp', 'protocol', 'tools'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    featured: true,
    verified: true,
  },
  {
    name: 'Vertex AI Agent Builder',
    slug: 'vertex-ai-agent-builder',
    description: 'Google Cloud\'s platform for building AI agents with grounding, tool use, and multi-turn conversation — supports A2A protocol natively.',
    providerName: 'Google Cloud',
    providerUrl: 'https://cloud.google.com',
    agentUrl: 'https://cloud.google.com/products/agent-builder',
    categories: ['infrastructure'],
    tags: ['google-cloud', 'agents', 'a2a'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Azure AI Foundry',
    slug: 'azure-ai-foundry',
    description: 'Microsoft\'s unified platform for building, evaluating, and deploying AI agents with access to OpenAI and open-source models.',
    providerName: 'Microsoft',
    providerUrl: 'https://azure.microsoft.com',
    agentUrl: 'https://ai.azure.com',
    categories: ['infrastructure'],
    tags: ['azure', 'agents', 'enterprise'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Copilot Studio',
    slug: 'copilot-studio',
    description: 'Microsoft\'s low-code platform for building custom AI copilots and agents with enterprise connectors, knowledge grounding, and MCP support.',
    providerName: 'Microsoft',
    providerUrl: 'https://microsoft.com',
    agentUrl: 'https://www.microsoft.com/en-us/microsoft-copilot/microsoft-copilot-studio',
    categories: ['infrastructure', 'scheduling'],
    tags: ['copilot', 'low-code', 'enterprise'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp'],
    verified: true,
  },
  {
    name: 'Salesforce Agentforce',
    slug: 'salesforce-agentforce',
    description: 'Autonomous AI agents for CRM — handle sales, service, marketing, and commerce tasks with built-in Salesforce data access and guardrails.',
    providerName: 'Salesforce',
    providerUrl: 'https://salesforce.com',
    agentUrl: 'https://www.salesforce.com/agentforce/',
    categories: ['sales-marketing', 'customer-support'],
    tags: ['crm', 'agents', 'enterprise'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Twilio ConversationRelay',
    slug: 'twilio-conversationrelay',
    description: 'Real-time voice AI framework connecting LLMs to phone calls — build conversational AI agents over Twilio\'s voice infrastructure.',
    providerName: 'Twilio',
    providerUrl: 'https://twilio.com',
    agentUrl: 'https://www.twilio.com/docs/voice/conversationrelay',
    categories: ['customer-support', 'infrastructure'],
    tags: ['voice', 'telephony', 'conversational-ai'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },
  {
    name: 'Atlassian Rovo',
    slug: 'atlassian-rovo',
    description: 'AI teammate for Atlassian products — searches across Jira, Confluence, and connected apps to find answers and automate tasks.',
    providerName: 'Atlassian',
    providerUrl: 'https://atlassian.com',
    agentUrl: 'https://www.atlassian.com/software/rovo',
    categories: ['scheduling', 'research'],
    tags: ['productivity', 'search', 'enterprise'],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'cli'],
    verified: true,
  },

  // ── Week of March 23–30, 2026 ─────────────────────────────────
  {
    name: 'Google Colab MCP Server',
    slug: 'google-colab-mcp',
    description:
      'Official MCP server for Google Colab. Lets AI agents create, execute, and manage GPU-accelerated Jupyter notebooks via Model Context Protocol — no browser needed.',
    providerName: 'Google',
    providerUrl: 'https://developers.google.com',
    agentUrl: 'https://github.com/googlecolab/colab-mcp',
    categories: ['code-devtools'],
    tags: [
      'notebook-automation', 'cloud-compute', 'python-execution',
      'data-analysis', 'jupyter', 'gpu-access', 'mcp-protocol', 'open-source',
    ],
    authType: 'oauth2',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Create and manage Jupyter notebooks programmatically from any MCP-compatible AI agent or coding assistant',
      'Execute Python code cells in Google\'s GPU/TPU-accelerated cloud runtime without browser interaction',
      'Install and manage Python package dependencies dynamically within a running Colab session',
      'Run end-to-end data analysis pipelines and return structured results back to the orchestrating agent',
      'Automate multi-step ML experiments and chain notebook outputs into downstream workflow automation',
    ],
  },
  {
    name: 'NVIDIA NemoClaw',
    slug: 'nvidia-nemoclaw',
    description:
      'Open-source security runtime for multi-agent AI. Enforces policy-based access control, sandboxes kernel interactions, and privacy-routes sensitive data for enterprise local inference.',
    providerName: 'NVIDIA',
    providerUrl: 'https://nvidia.com',
    agentUrl: 'https://www.nvidia.com/en-us/ai/nemoclaw/',
    categories: ['security'],
    tags: [
      'enterprise-security', 'agent-governance', 'privacy-first',
      'policy-enforcement', 'local-inference', 'sandboxing', 'open-source', 'openclaw',
    ],
    authType: 'none',
    accessMethods: ['cli'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Enforce policy-based access control at the agent boundary, restricting which tools and data each agent can reach',
      'Sandbox kernel-level interactions to prevent privilege escalation and contain runaway agents',
      'Route sensitive data through privacy-preserving channels so PII never reaches untrusted model endpoints',
      'Orchestrate trust levels across multi-agent hierarchies with per-agent permission scopes and audit trails',
      'Detect and alert on anomalous agent behavior patterns using real-time threat fingerprinting',
    ],
  },
  {
    name: 'Shopify Agentic Storefronts',
    slug: 'shopify-agentic-storefronts',
    description:
      'Shopify\'s A2A-compatible layer for agentic commerce. AI agents browse catalogs, configure products, and initiate checkout. Full storefront exposed as an agent API with real-time inventory sync.',
    providerName: 'Shopify',
    providerUrl: 'https://shopify.com',
    agentUrl: 'https://shopify.dev/docs/agents',
    categories: ['commerce-payments'],
    tags: [
      'e-commerce', 'agentic-commerce', 'checkout-automation', 'a2a-protocol',
      'multi-channel', 'inventory-sync', 'conversational-commerce', 'shopify',
    ],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: true,
    supportsPushNotifications: true,
    featured: true,
    verified: true,
    skills: [
      'Syndicate product catalogs across web, mobile, voice, and social channels through a single unified agent API',
      'Generate dynamic checkout sessions with real-time pricing, discount codes, and upsell recommendations',
      'Sync inventory levels in real-time so agents never surface out-of-stock products or stale pricing',
      'Link shopper identities across sessions for personalized, context-aware purchasing experiences',
      'Push real-time order status updates and delivery notifications to agents and end-users',
    ],
  },
  {
    name: 'Rox AI',
    slug: 'rox-ai',
    description:
      'Autonomous revenue platform deploying swarms of AI sales agents across account mapping, outreach, and CRM hygiene to surface the right opportunity. Backed by a $50M Series B.',
    providerName: 'Rox',
    providerUrl: 'https://rox.com',
    agentUrl: 'https://rox.com',
    categories: ['sales-marketing'],
    tags: [
      'sales-automation', 'account-intelligence', 'agent-swarm', 'crm-automation',
      'outbound', 'b2b-sales', 'intent-signals', 'revenue-intelligence',
    ],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Deploy coordinated swarms of specialized sales agents that cover prospecting, research, outreach, and CRM update tasks simultaneously',
      'Build deep account intelligence by aggregating news, job postings, funding events, and product signals into a unified account brief',
      'Generate hyper-personalized outreach sequences tailored to each prospect\'s role, company context, and recent trigger events',
      'Automate CRM data entry, contact enrichment, and pipeline hygiene so sales reps work only on active opportunities',
      'Prepare AI-generated meeting briefings with talking points, objection handles, and competitive context before every call',
    ],
  },
  {
    name: 'Oracle AI Database 26ai',
    slug: 'oracle-ai-database-26ai',
    description:
      'World\'s first AI-native database with agents running inside the kernel. Features no-code Agent Factory, unified vector search, multi-modal RAG, and identity-aware access control.',
    providerName: 'Oracle',
    providerUrl: 'https://oracle.com/database',
    agentUrl: 'https://www.oracle.com/database/agent-factory/',
    categories: ['infrastructure'],
    tags: [
      'in-database-ai', 'agent-factory', 'vector-search', 'enterprise-database',
      'multi-modal-rag', 'oracle', 'no-code-agents', 'autonomous-database',
    ],
    authType: 'oauth2',
    accessMethods: ['api', 'mcp', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: true,
    featured: true,
    verified: true,
    skills: [
      'Execute AI agents inside the database kernel, co-located with data for sub-millisecond decision latency',
      'Build production-ready agents visually with no-code Agent Factory — drag-and-drop tools, prompts, and data connectors',
      'Query structured and unstructured data with unified vector search for multi-modal Retrieval Augmented Generation',
      'Run multi-modal RAG pipelines over text, images, and documents stored natively in the database',
      'Enforce identity-aware access control so each agent only operates on explicitly authorized data sets',
    ],
  },
  {
    name: 'Wonderful',
    slug: 'wonderful-ai',
    description:
      'Enterprise voice AI platform with pre-trained agents for phone, chat, and email. Covers 40+ languages, integrates with Salesforce, SAP, and ServiceNow, with seamless escalation to human agents.',
    providerName: 'Wonderful AI',
    providerUrl: 'https://wonderful.ai',
    agentUrl: 'https://wonderful.ai/product',
    categories: ['customer-support'],
    tags: [
      'voice-ai', 'conversational-ai', 'multilingual', 'enterprise-cx',
      'chat-automation', 'email-automation', 'crm-integration', 'global-deployment',
    ],
    authType: 'oauth2',
    accessMethods: ['api'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Deploy production-ready voice agents across inbound and outbound phone channels with natural, low-latency conversation',
      'Unify chat and email support into a single agent layer that maintains full conversation context across channels',
      'Serve customers in 40+ languages and regional dialects with automatic language detection and localization',
      'Integrate natively with Salesforce, SAP, and ServiceNow to read and write CRM data during live interactions',
      'Escalate complex cases to human agents with complete conversation history and intent summary handed off instantly',
    ],
  },

  // ── Memory & State ──
  {
    name: 'Mem0',
    slug: 'mem0',
    description: 'Persistent memory layer for AI agents and LLMs. Stores, searches, and retrieves user and session memories across frameworks. SDKs for Python and JS, managed or self-hosted.',
    providerName: 'Mem0',
    providerUrl: 'https://mem0.ai',
    agentUrl: 'https://docs.mem0.ai',
    categories: ['memory-state'],
    tags: ['memory', 'rag', 'personalization', 'stateful-agents', 'python', 'javascript', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Store and retrieve persistent user and session memories across agent frameworks',
      'Semantic memory search to surface relevant context from past interactions',
      'Share memory across multi-agent pipelines with fine-grained access controls',
      'Learn and update user preferences automatically from conversation history',
      'Monitor memory usage and search analytics via built-in dashboard',
    ],
  },
  {
    name: 'Zep',
    slug: 'zep',
    description: 'Long-term memory store for AI assistants. Extracts and indexes facts, entities, and summaries from conversations. Fast hybrid search combines semantic and full-text retrieval.',
    providerName: 'Zep',
    providerUrl: 'https://getzep.com',
    agentUrl: 'https://docs.getzep.com',
    categories: ['memory-state'],
    tags: ['memory', 'long-term-memory', 'llm', 'conversation-history', 'knowledge-graph'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Auto-extract facts, entities, and summaries from raw conversation transcripts',
      'Track entity relationships and state changes across long multi-session interactions',
      'Temporal memory management that weights recency and relevance for retrieval',
      'Hybrid search combining dense semantic vectors and full-text BM25 scoring',
      'Retrieve cross-session context in a single API call for any user or thread',
    ],
  },
  {
    name: 'Letta',
    slug: 'letta',
    description: 'Stateful agent framework with built-in memory. Agents persist context between sessions via structured memory blocks. Formerly MemGPT. Self-hosted or managed cloud.',
    providerName: 'Letta',
    providerUrl: 'https://letta.ai',
    agentUrl: 'https://docs.letta.ai',
    categories: ['memory-state'],
    tags: ['memory', 'stateful-agents', 'memgpt', 'open-source', 'self-hosted', 'python', 'orchestration'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Persist agent state between sessions using structured in-context memory blocks',
      'Dynamically edit and archive memory to maintain coherent long-horizon agent behavior',
      'Orchestrate multi-agent pipelines where agents pass typed memory between each other',
      'Execute tool calls with full persistence of tool outputs across sessions',
      'Deploy self-hosted or cloud agents with consistent stateful behavior at scale',
    ],
  },
  {
    name: 'Honcho',
    slug: 'honcho',
    description: 'User state management platform for AI apps. Stores user context, preferences, and interaction history to enable personalized multi-session AI experiences.',
    providerName: 'Honcho',
    providerUrl: 'https://honcho.dev',
    agentUrl: 'https://docs.honcho.dev',
    categories: ['memory-state'],
    tags: ['memory', 'user-state', 'personalization', 'multi-session', 'python'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      'Persist user session state and conversation context across app restarts',
      'Track evolving user preferences learned from interaction history',
      'Share user context across multiple AI applications from one platform',
      'Link user identity across sessions and devices for unified personalization',
      'Store arbitrary personalization metadata alongside structured session records',
    ],
  },
  {
    name: 'Supermemory',
    slug: 'supermemory',
    description: 'Memory API for AI applications. Store and retrieve user memories, bookmarks, and knowledge with semantic search. One unified API for personal and enterprise memory.',
    providerName: 'Supermemory',
    providerUrl: 'https://supermemory.ai',
    agentUrl: 'https://docs.supermemory.ai',
    categories: ['memory-state'],
    tags: ['memory', 'knowledge-base', 'rag', 'semantic-search', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      'Ingest memories from any source via a unified memory ingestion pipeline',
      'Semantic retrieval of relevant memories ranked by context similarity',
      'Build shared knowledge bases accessible across teams and agent instances',
      'Store multiple content formats including text, URLs, and structured data',
      'Collaborate on shared memory spaces with role-based access control',
    ],
  },

  // ── Browser & Computer Use ──
  {
    name: 'Browserbase',
    slug: 'browserbase',
    description: 'Managed headless browser infrastructure for AI agents. Run Playwright or Puppeteer at scale with built-in proxies, CAPTCHA solving, and session management.',
    providerName: 'Browserbase',
    providerUrl: 'https://browserbase.com',
    agentUrl: 'https://docs.browserbase.com',
    categories: ['browser-computer'],
    tags: ['browser-automation', 'headless-browser', 'playwright', 'puppeteer', 'web-scraping', 'ai-agents'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Spin up managed headless browser sessions with Playwright or Puppeteer in seconds',
      'Rotate residential proxies automatically to avoid blocks on target websites',
      'Solve CAPTCHAs and handle bot-detection challenges on behalf of agents',
      'Scrape and interact with web pages at scale with parallel session management',
      'Maintain persistent browser state including cookies and local storage across runs',
    ],
  },
  {
    name: 'Steel',
    slug: 'steel',
    description: 'Open-source headless browser infrastructure for AI agents. Deploy managed browser sessions with built-in proxies and auth handling. Self-hosted or cloud.',
    providerName: 'Steel',
    providerUrl: 'https://steel.dev',
    agentUrl: 'https://docs.steel.dev',
    categories: ['browser-computer'],
    tags: ['browser-automation', 'headless-browser', 'open-source', 'self-hosted', 'web-agents'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      'Launch managed browser sessions for AI agents via a simple REST API',
      'Route requests through rotating proxy pools to bypass geo and rate limits',
      'Persist cookies and authentication tokens across browser sessions',
      'Bypass browser fingerprinting with randomized session profiles',
      'Orchestrate multiple concurrent browser sessions with unified session management',
    ],
  },
  {
    name: 'E2B',
    slug: 'e2b',
    description: 'Secure cloud sandboxes for AI agents to run code. Supports Python, JS, and shell. Persistent filesystem, network access, and sub-100ms cold starts.',
    providerName: 'E2B',
    providerUrl: 'https://e2b.dev',
    agentUrl: 'https://e2b.dev/docs',
    categories: ['browser-computer'],
    tags: ['code-execution', 'sandbox', 'python', 'javascript', 'code-interpreter', 'cloud-compute'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Provision isolated cloud sandboxes for executing AI-generated code safely',
      'Persist filesystem state across agent steps within a single sandbox session',
      'Run Python, JavaScript, shell, and arbitrary language runtimes in each sandbox',
      'Support long-running agent workloads with up to 24-hour sandbox lifetimes',
      'Integrate as an OpenAI code interpreter drop-in or with any LLM framework',
    ],
  },
  {
    name: 'Daytona',
    slug: 'daytona',
    description: 'Secure compute platform for AI-generated code. Provisions isolated dev environments with git integration. Built for running untrusted agent-generated code safely.',
    providerName: 'Daytona',
    providerUrl: 'https://daytona.io',
    agentUrl: 'https://www.daytona.io/docs',
    categories: ['browser-computer'],
    tags: ['sandbox', 'dev-environments', 'ai-agents', 'git', 'open-source', 'compute'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      'Provision isolated development workspaces for agent-generated code in seconds',
      'Clone and manage git repositories inside secure sandboxed environments',
      'Run multi-language runtimes including Python, Node.js, Go, and Rust safely',
      'Execute untrusted AI code with network and filesystem isolation per workspace',
      'Expose IDE server endpoints for agent-driven code editing and execution',
    ],
  },
  {
    name: 'Playwright MCP',
    slug: 'playwright-mcp',
    description: 'Official Microsoft MCP server for browser automation. Agents navigate pages and interact with elements via accessibility snapshots — no vision model required.',
    providerName: 'Microsoft',
    providerUrl: 'https://microsoft.com',
    agentUrl: 'https://github.com/microsoft/playwright-mcp',
    categories: ['browser-computer'],
    tags: ['browser-automation', 'playwright', 'accessibility-tree', 'mcp-server', 'microsoft', 'open-source', 'no-vision'],
    authType: 'none',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      { id: 'accessibility-snapshots', name: 'Accessibility Snapshots', description: 'Generates structured accessibility trees of any page so agents navigate without screenshots' },
      { id: 'page-navigation', name: 'Page Navigation', description: 'Navigate URLs, follow links, go back/forward, and control browser history programmatically' },
      { id: 'element-interaction', name: 'Element Interaction', description: 'Click, type, focus, hover, and select elements using stable accessibility selectors' },
      { id: 'form-automation', name: 'Form Automation', description: 'Fill and submit forms, handle dropdowns, checkboxes, and file uploads without vision' },
      { id: 'network-monitoring', name: 'Network Monitoring', description: 'Inspect network requests and responses during agent-driven browser sessions' },
    ],
  },
  {
    name: 'Browser Use',
    slug: 'browser-use',
    description: 'Open-source Python library for AI browser automation. Control any website with natural language; cloud adds stealth browsers, proxies, and CAPTCHA solving.',
    providerName: 'Browser Use',
    providerUrl: 'https://browser-use.com',
    agentUrl: 'https://browser-use.com',
    categories: ['browser-computer'],
    tags: ['browser-automation', 'web-scraping', 'open-source', 'python', 'stealth', 'captcha', 'playwright'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      { id: 'nl-control', name: 'Natural Language Control', description: 'Instruct AI agents to navigate and interact with any website using plain English commands' },
      { id: 'stealth-browser', name: 'Stealth Browser', description: 'Anti-detection headless browsers with CAPTCHA solving and rotating proxies across 195+ countries' },
      { id: 'web-to-api', name: 'Web-to-API', description: 'Convert any website into a reliable programmatic API endpoint for agent consumption' },
      { id: 'vision-extraction', name: 'Vision & Extraction', description: 'Extract structured data from pages using computer vision and DOM analysis' },
      { id: 'multi-tab', name: 'Multi-Tab Orchestration', description: 'Manage multiple browser tabs and sessions simultaneously for complex agent workflows' },
    ],
  },

  // ── Vector Databases ──
  {
    name: 'Pinecone',
    slug: 'pinecone',
    description: 'Fully managed vector database for AI applications. Store and search billions of high-dimensional embeddings with low latency. Serverless and pod-based deployments.',
    providerName: 'Pinecone',
    providerUrl: 'https://pinecone.io',
    agentUrl: 'https://docs.pinecone.io',
    categories: ['vector-databases'],
    tags: ['vector-database', 'embeddings', 'rag', 'semantic-search', 'serverless', 'managed'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Store and index billions of high-dimensional embedding vectors with sub-second query latency',
      'Perform approximate nearest-neighbor search with configurable recall and speed trade-offs',
      'Upsert vectors in real-time with immediate consistency for live knowledge bases',
      'Filter search results by structured metadata alongside vector similarity scoring',
      'Combine dense and sparse vectors in a single query for hybrid retrieval pipelines',
    ],
  },
  {
    name: 'Qdrant',
    slug: 'qdrant',
    description: 'High-performance open-source vector database. Supports dense, sparse, and multi-vector search. On-premise or cloud. Rust-built for production-scale RAG pipelines.',
    providerName: 'Qdrant',
    providerUrl: 'https://qdrant.tech',
    agentUrl: 'https://qdrant.tech/documentation',
    categories: ['vector-databases'],
    tags: ['vector-database', 'open-source', 'rag', 'embeddings', 'rust', 'self-hosted', 'semantic-search'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Index and query dense vectors with HNSW for high-recall approximate search',
      'Support sparse vectors for keyword-style retrieval alongside semantic dense search',
      'Apply complex payload filters to narrow search results without re-ranking overhead',
      'Use named multi-vector collections for image, text, and code embedding co-search',
      'Quantize vectors to reduce memory footprint by up to 32x with minimal recall loss',
    ],
  },
  {
    name: 'ChromaDB',
    slug: 'chromadb',
    description: 'Open-source embedding database for local and cloud AI apps. Simple API for storing, querying, and filtering embeddings. First choice for RAG prototyping.',
    providerName: 'Chroma',
    providerUrl: 'https://trychroma.com',
    agentUrl: 'https://docs.trychroma.com',
    categories: ['vector-databases'],
    tags: ['vector-database', 'open-source', 'embeddings', 'rag', 'python', 'local-first'],
    authType: 'none',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Store embedding vectors with associated documents and metadata in local collections',
      'Query collections by embedding similarity with built-in distance function support',
      'Filter results by metadata fields using a Pythonic where clause syntax',
      'Embed documents automatically using built-in or custom embedding functions',
      'Deploy locally for prototyping or switch to cloud-hosted Chroma for production',
    ],
  },

  // ── Voice & Messaging ──
  {
    name: 'Vapi',
    slug: 'vapi',
    description: 'Voice AI platform for building production phone agents. Handles real-time STT, TTS, turn-taking, and LLM orchestration. Scalable to millions of concurrent calls.',
    providerName: 'Vapi',
    providerUrl: 'https://vapi.ai',
    agentUrl: 'https://docs.vapi.ai',
    categories: ['voice-messaging'],
    tags: ['voice-ai', 'phone-agents', 'stt', 'tts', 'real-time', 'conversational-ai', 'telephony'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: true,
    featured: true,
    verified: true,
    skills: [
      'Build production voice agents for inbound and outbound phone calls with sub-500ms latency',
      'Clone custom voices or choose from dozens of built-in TTS providers per call',
      'Record, transcribe, and analyze every call with structured JSON summaries',
      'Route calls to different LLMs and prompts based on caller intent and context',
      'Launch outbound call campaigns targeting thousands of numbers with parallel dialing',
    ],
  },
  {
    name: 'Kapso',
    slug: 'kapso',
    description: 'WhatsApp AI agent platform. Build and deploy conversational agents on WhatsApp Business API with no-code flows, LLM integration, and CRM connectors.',
    providerName: 'Kapso',
    providerUrl: 'https://kapso.io',
    agentUrl: 'https://kapso.io/docs',
    categories: ['voice-messaging'],
    tags: ['whatsapp', 'conversational-ai', 'messaging', 'no-code', 'crm', 'customer-engagement'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      'Deploy AI agents on WhatsApp Business API with official Meta compliance',
      'Build conversation flows visually without code using a drag-and-drop flow editor',
      'Power agent responses with any LLM via configurable prompts and retrieval',
      'Sync customer data bi-directionally with connected CRM platforms',
      'Serve agents in multiple languages with automatic language detection',
    ],
  },

  // ── Infrastructure: Observability & Tooling ──
  {
    name: 'AgentOps',
    slug: 'agentops',
    description: 'Observability platform purpose-built for AI agents. Track agent sessions, LLM calls, tool use, and costs. Integrates with LangChain, CrewAI, AutoGen, and OpenAI.',
    providerName: 'AgentOps',
    providerUrl: 'https://agentops.ai',
    agentUrl: 'https://docs.agentops.ai',
    categories: ['infrastructure'],
    tags: ['observability', 'monitoring', 'llm-tracing', 'agent-debugging', 'langchain', 'crewai', 'python'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Record full agent sessions including every LLM call, tool use, and state transition',
      'Track token usage and costs per agent run across all major LLM providers',
      'Monitor tool execution timing and failures to diagnose agent bottlenecks',
      'Replay any agent session step-by-step for debugging and root cause analysis',
      'Integrate with LangChain, CrewAI, AutoGen, and OpenAI SDK in two lines of code',
    ],
  },
  {
    name: 'Langfuse',
    slug: 'langfuse',
    description: 'Open-source LLM observability and analytics. Trace, evaluate, and debug LLM apps with prompt versioning, score tracking, and a full analytics dashboard.',
    providerName: 'Langfuse',
    providerUrl: 'https://langfuse.com',
    agentUrl: 'https://langfuse.com/docs',
    categories: ['infrastructure'],
    tags: ['observability', 'open-source', 'llm-tracing', 'prompt-management', 'evaluation', 'self-hosted'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Trace every LLM call and chain step with full input/output capture and latency',
      'Version and manage prompts with a/b testing and rollback across environments',
      'Score traces with custom evaluation rubrics to track quality over time',
      'Analyze user session funnels, latency distributions, and token cost trends',
      'Self-host on any infrastructure or use Langfuse Cloud with zero configuration',
    ],
  },
  {
    name: 'Portkey',
    slug: 'portkey',
    description: 'AI gateway with unified API for 200+ LLMs, plus observability, caching, fallbacks, and cost management. Drop-in replacement for the OpenAI SDK.',
    providerName: 'Portkey',
    providerUrl: 'https://portkey.ai',
    agentUrl: 'https://portkey.ai/docs',
    categories: ['infrastructure'],
    tags: ['ai-gateway', 'observability', 'llm-routing', 'cost-management', 'openai-compatible', 'caching'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    featured: true,
    verified: true,
    skills: [
      'Route requests across 200+ LLMs with a single unified OpenAI-compatible API',
      'Fail over to backup models automatically when primary providers return errors',
      'Cache identical prompts semantically to cut costs and reduce latency',
      'Track per-model costs, latency, and error rates in a real-time analytics dashboard',
      'Manage prompts centrally with version control and per-environment overrides',
    ],
  },
  {
    name: 'Composio',
    slug: 'composio',
    description: 'Tool integration platform for AI agents. 250+ pre-built integrations with GitHub, Slack, Salesforce, and more. Handles OAuth, rate limits, and action execution.',
    providerName: 'Composio',
    providerUrl: 'https://composio.dev',
    agentUrl: 'https://docs.composio.dev',
    categories: ['infrastructure'],
    tags: ['tool-integration', 'saas-tools', 'oauth', 'langchain', 'crewai', 'github', 'slack', 'automation'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Connect AI agents to 250+ SaaS tools with pre-built action and trigger schemas',
      'Manage OAuth 2.0 flows and token refresh for every connected integration automatically',
      'Execute actions on third-party services on behalf of authenticated users securely',
      'Generate tool schemas compatible with LangChain, CrewAI, and OpenAI function calling',
      'Share tool connections across agents in a multi-agent pipeline with unified auth',
    ],
  },
  {
    name: 'Nango',
    slug: 'nango',
    description: 'Open-source OAuth and API integration platform. 300+ pre-built integrations. Handles token refresh, rate limits, and webhooks for any API your agents call.',
    providerName: 'Nango',
    providerUrl: 'https://nango.dev',
    agentUrl: 'https://docs.nango.dev',
    categories: ['infrastructure'],
    tags: ['oauth', 'api-integrations', 'open-source', 'self-hosted', 'token-management', 'webhooks'],
    authType: 'oauth2',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      'Handle OAuth 2.0 and API key flows for 300+ providers without writing auth code',
      'Refresh tokens automatically before expiry so agent calls never fail mid-run',
      'Normalize webhooks from any provider into a consistent format for your pipeline',
      'Store credentials securely with per-user and per-connection isolation',
      'Monitor integration health with per-connection error logs and retry metrics',
    ],
  },

  // ── Research / Knowledge ──
  {
    name: 'Ragie',
    slug: 'ragie',
    description: 'Retrieval API for AI applications. Ingest PDFs, web pages, and files, then query with semantic search. Built-in chunking, embedding, and reranking pipeline.',
    providerName: 'Ragie',
    providerUrl: 'https://ragie.ai',
    agentUrl: 'https://docs.ragie.ai',
    categories: ['research'],
    tags: ['retrieval', 'rag', 'knowledge-base', 'semantic-search', 'document-ai', 'embeddings'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: true,
    verified: true,
    skills: [
      'Ingest PDFs, DOCX, web pages, and 20+ file types into a managed retrieval pipeline',
      'Chunk and embed documents automatically with state-of-the-art embedding models',
      'Rerank candidate passages by relevance before returning results to your agent',
      'Support multi-format documents including images with vision-based extraction',
      'Sync document sources in real-time so your knowledge base stays up to date',
    ],
  },

  // ── Sales & Marketing ──
  {
    name: 'monid.ai',
    slug: 'monid-ai',
    description: 'AI agent platform for social media monitoring and engagement. Tracks brand mentions, analyzes sentiment, and drafts AI-powered responses across channels.',
    providerName: 'monid.ai',
    providerUrl: 'https://monid.ai',
    agentUrl: 'https://monid.ai',
    categories: ['sales-marketing'],
    tags: ['social-media', 'monitoring', 'sentiment-analysis', 'brand-management', 'marketing-automation'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: false,
    skills: [
      'Monitor brand mentions and keywords across major social media platforms in real time',
      'Analyze sentiment and tone of social content with AI-powered classification',
      'Draft contextual response suggestions for social media engagement',
      'Track competitor activity and share-of-voice across platforms',
      'Aggregate engagement analytics into a unified social performance dashboard',
    ],
  },

  // ── Mode B Top-50 Audit — 2026-04-13 ──────────────────────────

  // ── Research / Knowledge ──
  {
    name: 'Jina Reader',
    slug: 'jina-reader',
    description: 'Web reader and search API for AI pipelines. Converts any URL to clean markdown, runs grounded search, and powers RAG at scale — no browser automation needed.',
    providerName: 'Jina AI',
    providerUrl: 'https://jina.ai',
    agentUrl: 'https://jina.ai/reader',
    categories: ['research'],
    tags: ['web-scraping', 'rag', 'markdown-conversion', 'search-grounding', 'reader-api', 'embeddings'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'url-reader', name: 'URL to Markdown', description: 'Convert any URL into clean, LLM-ready markdown in one API call, removing ads, nav, and boilerplate' },
      { id: 'grounded-search', name: 'Grounded Search', description: 'Run search queries with real-time web grounding to reduce LLM hallucinations in answers' },
      { id: 'batch-crawl', name: 'Batch Crawl', description: 'Crawl entire sites or URL lists in parallel and return structured markdown output for pipelines' },
      { id: 'embed-rerank', name: 'Embed & Rerank', description: 'Generate embeddings and rerank passages with Jina Embeddings v3 and Reranker v2 APIs' },
      { id: 'mcp-access', name: 'MCP Integration', description: 'Access Reader and Search via Model Context Protocol for Claude and MCP-compatible agents' },
    ],
  },
  {
    name: 'GPT Researcher',
    slug: 'gpt-researcher',
    description: 'Autonomous deep-research agent that plans queries, browses the web in parallel, and produces cited research reports in minutes. Supports API and MCP integration.',
    providerName: 'Assaf Elovic',
    providerUrl: 'https://gptr.dev',
    agentUrl: 'https://docs.gptr.dev',
    categories: ['research'],
    tags: ['autonomous-research', 'web-search', 'report-generation', 'mcp', 'open-source', 'deep-research'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'research-plan', name: 'Research Planning', description: 'Decompose a research question into parallel sub-queries for comprehensive web coverage' },
      { id: 'parallel-browse', name: 'Parallel Browsing', description: 'Browse multiple sources simultaneously and extract relevant content for synthesis' },
      { id: 'report-gen', name: 'Report Generation', description: 'Produce structured, cited research reports in markdown with sources and inline references' },
      { id: 'source-filter', name: 'Source Filtering', description: 'Filter and rank sources by relevance, recency, and credibility before including in report' },
      { id: 'mcp-tool', name: 'MCP Tool', description: 'Expose the deep-research workflow as an MCP tool for use inside Claude and other agents' },
    ],
  },
  {
    name: 'LlamaIndex',
    slug: 'llamaindex',
    description: 'Data framework and cloud platform for LLM apps over private data. Offers parsing, indexing, retrieval, agent workflows, and evaluation across 160+ data sources.',
    providerName: 'LlamaIndex',
    providerUrl: 'https://llamaindex.ai',
    agentUrl: 'https://docs.llamaindex.ai',
    categories: ['research'],
    tags: ['rag', 'data-connectors', 'llm-applications', 'retrieval', 'indexing', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'data-ingestion', name: 'Data Ingestion', description: 'Load and parse 160+ data source types including PDFs, databases, APIs, and web pages' },
      { id: 'vector-indexing', name: 'Vector Indexing', description: 'Index documents into vector stores with configurable chunking and embedding strategies' },
      { id: 'query-engine', name: 'Query Engine', description: 'Run semantic search and sub-question decomposition over indexed data with one API call' },
      { id: 'agent-tools', name: 'Agent Tools', description: 'Wrap retrieval pipelines as LLM tools for use in ReAct and function-calling agent loops' },
      { id: 'rag-eval', name: 'RAG Evaluation', description: 'Evaluate faithfulness, relevancy, and correctness of retrieval-augmented generation pipelines' },
    ],
  },
  {
    name: 'Brave Search MCP',
    slug: 'brave-search-mcp',
    description: 'Brave Search MCP server. Gives AI agents privacy-preserving web and local search with an independent index — no Google dependency, no tracking, structured results.',
    providerName: 'Brave',
    providerUrl: 'https://brave.com',
    agentUrl: 'https://brave.com/search/api/',
    categories: ['research'],
    tags: ['mcp', 'search', 'web-search', 'privacy', 'independent-index', 'local-search'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'web-search', name: 'Web Search', description: 'Run web searches against Brave\'s independent index and return ranked, structured results' },
      { id: 'local-search', name: 'Local Search', description: 'Search for nearby businesses and places with location-aware results and business details' },
      { id: 'news-search', name: 'News Search', description: 'Retrieve recent news articles filtered by topic with publication date and source metadata' },
      { id: 'image-search', name: 'Image Search', description: 'Search for images with structured metadata including dimensions, source URL, and description' },
      { id: 'mcp-native', name: 'MCP Native', description: 'Works out of the box with Claude Desktop and any MCP client via the official Brave MCP server' },
    ],
  },

  // ── Infrastructure / Orchestration ──
  {
    name: 'Dify',
    slug: 'dify',
    description: 'Open-source LLM app and agent development platform. Build, test, and deploy RAG pipelines, chatbots, and multi-agent workflows via visual canvas and REST API.',
    providerName: 'LF AI & Data Foundation',
    providerUrl: 'https://dify.ai',
    agentUrl: 'https://docs.dify.ai',
    categories: ['infrastructure'],
    tags: ['llm-orchestration', 'rag', 'open-source', 'multi-agent', 'visual-builder', 'self-hosted'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'visual-canvas', name: 'Visual Canvas', description: 'Build agent workflows visually with drag-and-drop canvas — no code required for basic flows' },
      { id: 'rag-pipeline', name: 'RAG Pipeline', description: 'Ingest, chunk, and embed documents into a managed knowledge base with built-in retrieval' },
      { id: 'rest-api', name: 'REST API', description: 'Deploy any workflow as a REST API endpoint callable from external agents and applications' },
      { id: 'multi-model', name: 'Multi-Model Support', description: 'Switch between OpenAI, Claude, Llama, and 100+ models without changing app logic' },
      { id: 'mcp-server', name: 'MCP Server', description: 'Expose Dify workflows as MCP tools for Claude Desktop and MCP-compatible clients' },
    ],
  },
  {
    name: 'MetaGPT',
    slug: 'metagpt',
    description: 'Multi-agent framework where AI agents role-play as engineers, PMs, and QA to collectively produce software from a single natural language prompt via structured workflows.',
    providerName: 'DeepWisdom',
    providerUrl: 'https://deepwisdom.ai',
    agentUrl: 'https://docs.deepwisdom.ai',
    categories: ['infrastructure'],
    tags: ['multi-agent', 'software-engineering', 'role-playing', 'open-source', 'python', 'autonomous-coding'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'role-assignment', name: 'Role Assignment', description: 'Assign specialized agent roles — engineer, PM, QA — collaborating via structured message passing' },
      { id: 'code-generation', name: 'Code Generation', description: 'Generate full codebases from natural language including tests, docs, and CI configuration' },
      { id: 'software-planning', name: 'Software Planning', description: 'Produce PRD, system design, and task breakdown automatically before writing any code' },
      { id: 'incremental-dev', name: 'Incremental Dev', description: 'Iteratively add features to existing codebases with change-aware context management' },
      { id: 'cli-runner', name: 'CLI Runner', description: 'Run multi-agent software development sessions from the terminal with a single command' },
    ],
  },
  {
    name: 'AutoGen',
    slug: 'autogen',
    description: "Microsoft's open-source multi-agent framework. Supports conversational, autonomous, and human-in-the-loop agent patterns in Python and TypeScript with event-driven orchestration.",
    providerName: 'Microsoft',
    providerUrl: 'https://microsoft.com',
    agentUrl: 'https://microsoft.github.io/autogen/',
    categories: ['infrastructure'],
    tags: ['multi-agent', 'python', 'typescript', 'open-source', 'conversational-agents', 'human-in-the-loop'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'conversable-agents', name: 'Conversable Agents', description: 'Define agents that converse, negotiate, and pass structured results between each other' },
      { id: 'human-in-loop', name: 'Human-in-the-Loop', description: 'Inject human feedback at configurable checkpoints in multi-step agentic pipelines' },
      { id: 'group-chat', name: 'Group Chat', description: 'Orchestrate multiple agents in a group chat with dynamic speaker selection strategies' },
      { id: 'code-execution', name: 'Code Execution', description: 'Execute LLM-generated code in sandboxed environments with Docker or local Python runtime' },
      { id: 'event-driven', name: 'Event-Driven Mode', description: 'Build async, event-driven agent systems with AutoGen\'s actor-model runtime' },
    ],
  },
  {
    name: 'Flowise',
    slug: 'flowise',
    description: 'Open-source drag-and-drop UI for building LLM flows and AI agents. Deploy as a self-hosted server with REST API for integrating chains and agent workflows into apps.',
    providerName: 'FlowiseAI',
    providerUrl: 'https://flowiseai.com',
    agentUrl: 'https://docs.flowiseai.com',
    categories: ['infrastructure'],
    tags: ['visual-builder', 'open-source', 'llm-flows', 'self-hosted', 'no-code', 'agent-builder'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'drag-drop-build', name: 'Drag-Drop Builder', description: 'Assemble LLM chains and agent flows visually by connecting nodes in a browser canvas' },
      { id: 'rest-export', name: 'REST Export', description: 'Expose any built flow as a REST API endpoint consumable by external apps and agents' },
      { id: 'tool-agents', name: 'Tool Agents', description: 'Build ReAct agents with custom tools, retrievers, and external API calls in the UI' },
      { id: 'self-host', name: 'Self-Hostable', description: 'Deploy on any server with Docker — full data control, no vendor lock-in, open-source license' },
      { id: 'embeddings', name: 'Vector Stores & Embeddings', description: 'Connect to Pinecone, Chroma, Qdrant, and 10+ vector stores for RAG pipelines' },
    ],
  },
  {
    name: 'AWS MCP Suite',
    slug: 'aws-mcp',
    description: 'Official AWS Labs MCP servers — 15+ servers for S3, Lambda, DynamoDB, CDK, Bedrock, and more. Lets AI agents manage cloud infrastructure via Model Context Protocol.',
    providerName: 'AWS Labs',
    providerUrl: 'https://aws.amazon.com',
    agentUrl: 'https://github.com/awslabs/mcp',
    categories: ['infrastructure'],
    tags: ['mcp', 'aws', 's3', 'lambda', 'bedrock', 'cloud-infrastructure'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 's3-ops', name: 'S3 Operations', description: 'List, read, write, and delete S3 objects and buckets from any MCP-compatible AI agent' },
      { id: 'lambda-invoke', name: 'Lambda Invoke', description: 'Invoke AWS Lambda functions with custom payloads and retrieve structured results' },
      { id: 'bedrock-models', name: 'Bedrock Models', description: 'Call Amazon Bedrock foundation models including Claude, Titan, and Llama via MCP tools' },
      { id: 'cdk-deploy', name: 'CDK Deploy', description: 'Synthesize and deploy AWS CDK stacks programmatically from an AI agent workflow' },
      { id: 'dynamodb-query', name: 'DynamoDB Query', description: 'Read and write DynamoDB tables with query, scan, and put-item operations via MCP' },
    ],
  },
  {
    name: 'Cloudflare MCP',
    slug: 'cloudflare-mcp',
    description: 'Official Cloudflare MCP server suite. Lets AI agents manage Workers, KV storage, D1 databases, R2 buckets, and deploy edge functions programmatically.',
    providerName: 'Cloudflare',
    providerUrl: 'https://cloudflare.com',
    agentUrl: 'https://developers.cloudflare.com/mcp-server/',
    categories: ['infrastructure'],
    tags: ['mcp', 'cloudflare-workers', 'edge-computing', 'kv-storage', 'd1-database', 'serverless'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'workers-deploy', name: 'Workers Deploy', description: 'Create, update, and deploy Cloudflare Workers scripts from an AI agent via MCP' },
      { id: 'kv-store', name: 'KV Storage', description: 'Read and write key-value pairs in Cloudflare KV namespaces with TTL support' },
      { id: 'd1-query', name: 'D1 Database', description: 'Execute SQL queries against Cloudflare D1 SQLite databases from any MCP-compatible agent' },
      { id: 'r2-objects', name: 'R2 Object Storage', description: 'Upload, download, and list objects in Cloudflare R2 buckets via MCP tools' },
      { id: 'pages-deploy', name: 'Pages Deployment', description: 'Trigger Cloudflare Pages deployments and manage project settings programmatically' },
    ],
  },

  // ── Code & DevTools ──
  {
    name: 'Context7',
    slug: 'context7',
    description: 'MCP server that injects current, version-specific library docs and code examples into your LLM context — eliminating outdated training data from coding assistants.',
    providerName: 'Upstash',
    providerUrl: 'https://upstash.com',
    agentUrl: 'https://context7.com',
    categories: ['code-devtools'],
    tags: ['mcp', 'documentation', 'library-docs', 'llm-context', 'coding-assistant', 'real-time-docs'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'resolve-library', name: 'Library Resolution', description: 'Resolve a library name to its canonical documentation source ID automatically' },
      { id: 'fetch-docs', name: 'Fetch Docs', description: 'Retrieve up-to-date library documentation filtered to a specific version string' },
      { id: 'topic-search', name: 'Topic Search', description: 'Search within a library\'s docs for a specific function, class, or programming concept' },
      { id: 'multi-library', name: 'Multi-Library Context', description: 'Inject docs from multiple libraries into a single LLM context for cross-library tasks' },
      { id: 'mcp-native', name: 'MCP Native', description: 'Works out of the box with Claude Desktop, Cursor, Windsurf, and any MCP-compatible IDE' },
    ],
  },
  {
    name: 'GitHub MCP',
    slug: 'github-mcp',
    description: 'Official GitHub MCP server. Gives AI agents read/write access to repositories, issues, pull requests, code search, and GitHub Actions via Model Context Protocol.',
    providerName: 'GitHub',
    providerUrl: 'https://github.com',
    agentUrl: 'https://github.com/github/github-mcp-server',
    categories: ['code-devtools'],
    tags: ['mcp', 'github', 'code-review', 'issues', 'pull-requests', 'repository-management'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'repo-ops', name: 'Repository Ops', description: 'Create, clone, search, and manage GitHub repositories including branch and commit operations' },
      { id: 'issue-mgmt', name: 'Issue Management', description: 'Create, update, label, assign, and close GitHub issues with full metadata control' },
      { id: 'pr-review', name: 'PR Review', description: 'Open pull requests, add review comments, request changes, and merge via MCP tools' },
      { id: 'code-search', name: 'Code Search', description: 'Search across GitHub repositories with keyword, language, and path filters' },
      { id: 'actions-trigger', name: 'Actions Trigger', description: 'Trigger GitHub Actions workflows and retrieve run logs from an AI agent' },
    ],
  },

  // ── Data & Analytics ──
  {
    name: 'MindsDB',
    slug: 'mindsdb',
    description: 'AI-SQL layer that brings machine learning and AI agents into databases. Query predictions with SQL, build AI tables, and connect 200+ data sources via MCP and REST API.',
    providerName: 'MindsDB',
    providerUrl: 'https://mindsdb.com',
    agentUrl: 'https://docs.mindsdb.com',
    categories: ['data-analytics'],
    tags: ['sql', 'machine-learning', 'data-integration', 'ai-tables', 'mcp', 'predictive-queries'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'ai-tables', name: 'AI Tables', description: 'Define AI models as SQL tables and query predictions with standard SELECT statements' },
      { id: 'data-sources', name: '200+ Data Sources', description: 'Connect to databases, SaaS apps, and APIs as SQL data sources without ETL pipelines' },
      { id: 'mcp-server', name: 'MCP Server', description: 'Expose your MindsDB instance as an MCP tool for Claude and other AI agents to query' },
      { id: 'fine-tune', name: 'Fine-Tuning', description: 'Fine-tune foundation models on your own data using SQL FINETUNE commands' },
      { id: 'knowledge-base', name: 'Knowledge Bases', description: 'Create semantic search knowledge bases from any connected data source via SQL' },
    ],
  },

  // ── Vector Databases ──
  {
    name: 'Supabase MCP',
    slug: 'supabase-mcp',
    description: 'Official Supabase MCP server. Lets AI agents manage Postgres databases, run queries, handle migrations, store pgvector embeddings, and control Supabase projects end-to-end.',
    providerName: 'Supabase',
    providerUrl: 'https://supabase.com',
    agentUrl: 'https://supabase.com/docs/guides/ai/mcp',
    categories: ['vector-databases'],
    tags: ['mcp', 'postgres', 'vector-store', 'pgvector', 'database-management', 'supabase'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'postgres-query', name: 'Postgres Query', description: 'Execute arbitrary SQL queries against Supabase Postgres from any MCP-compatible agent' },
      { id: 'schema-mgmt', name: 'Schema Management', description: 'Create tables, run migrations, and inspect schema metadata via MCP tools' },
      { id: 'pgvector-store', name: 'pgvector Store', description: 'Store and query vector embeddings in Postgres with pgvector similarity search' },
      { id: 'storage-ops', name: 'Storage Operations', description: 'Upload, download, and manage files in Supabase Storage buckets from an AI agent' },
      { id: 'edge-functions', name: 'Edge Functions', description: 'Deploy and invoke Supabase Edge Functions programmatically from agent workflows' },
    ],
  },

  // ── Browser & Computer Use ──
  {
    name: 'Scrapling',
    slug: 'scrapling',
    description: 'High-performance Python web scraping library with anti-bot bypass, async support, and smart element auto-matching — faster than Playwright with no browser overhead.',
    providerName: 'Scrapling OSS',
    providerUrl: 'https://github.com/D4Vinci/Scrapling',
    agentUrl: 'https://github.com/D4Vinci/Scrapling',
    categories: ['browser-computer'],
    tags: ['web-scraping', 'python', 'anti-bot', 'async', 'html-parsing', 'element-matching'],
    authType: 'none',
    accessMethods: ['api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'anti-bot', name: 'Anti-Bot Bypass', description: 'Bypass bot detection systems including Cloudflare, DataDome, and browser fingerprinting' },
      { id: 'auto-match', name: 'Auto Element Matching', description: 'Automatically re-match CSS selectors after page structure changes without manual updates' },
      { id: 'async-scrape', name: 'Async Scraping', description: 'Scrape multiple URLs concurrently with asyncio for high-throughput data collection' },
      { id: 'no-browser', name: 'No Browser Overhead', description: 'Extract data without launching a browser — faster and lower memory than Playwright' },
      { id: 'structured-parse', name: 'Structured Parsing', description: 'Parse HTML into typed Python objects with CSS and XPath selector support' },
    ],
  },
  {
    name: 'Desktop Commander MCP',
    slug: 'desktop-commander-mcp',
    description: 'MCP server for full desktop control. Lets AI agents execute shell commands, manage files, edit code with diff patches, and run long processes with live output streaming.',
    providerName: 'wonderwhy-er',
    providerUrl: 'https://github.com/wonderwhy-er/DesktopCommanderMCP',
    agentUrl: 'https://github.com/wonderwhy-er/DesktopCommanderMCP',
    categories: ['browser-computer'],
    tags: ['mcp', 'shell-commands', 'file-management', 'desktop-control', 'terminal', 'diff-patching'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'shell-exec', name: 'Shell Execution', description: 'Execute any shell command and stream live stdout/stderr output back to the AI agent' },
      { id: 'file-ops', name: 'File Operations', description: 'Read, write, move, and delete files and directories on the local filesystem via MCP' },
      { id: 'diff-edit', name: 'Diff Patching', description: 'Apply targeted code edits as diff patches without rewriting entire files' },
      { id: 'process-mgmt', name: 'Process Management', description: 'Start long-running processes, monitor output, and terminate when complete' },
      { id: 'search-files', name: 'File Search', description: 'Search file contents with ripgrep and list directory trees for codebase navigation' },
    ],
  },

  // ── Scheduling / Automation ──
  {
    name: 'Notion MCP',
    slug: 'notion-mcp',
    description: 'Official Notion MCP server. Lets AI agents search, read, create, and update Notion pages, databases, and blocks via Model Context Protocol — full workspace access.',
    providerName: 'Notion',
    providerUrl: 'https://notion.so',
    agentUrl: 'https://developers.notion.com/docs/mcp',
    categories: ['scheduling'],
    tags: ['mcp', 'notion', 'knowledge-management', 'pages', 'databases', 'workspace'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'page-search', name: 'Page Search', description: 'Search across Notion workspace pages and databases with keyword and filter queries' },
      { id: 'page-create', name: 'Page Create', description: 'Create new Notion pages with rich content blocks including text, tables, and embeds' },
      { id: 'db-query', name: 'Database Query', description: 'Query Notion databases with filters, sorts, and property projections via MCP' },
      { id: 'block-edit', name: 'Block Editing', description: 'Append, update, and delete content blocks within any Notion page programmatically' },
      { id: 'property-update', name: 'Property Update', description: 'Update database item properties including relations, selects, dates, and formulas' },
    ],
  },
  {
    name: 'Trigger.dev',
    slug: 'trigger-dev',
    description: 'Open-source background jobs and workflow engine for AI apps. Run long tasks, cron jobs, and multi-step agent pipelines with resilient retries and MCP integration.',
    providerName: 'Trigger.dev',
    providerUrl: 'https://trigger.dev',
    agentUrl: 'https://trigger.dev/docs',
    categories: ['scheduling'],
    tags: ['background-jobs', 'cron', 'workflow-engine', 'open-source', 'mcp', 'long-running-tasks'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'api', 'cli'],
    supportsStreaming: true,
    featured: false,
    verified: true,
    skills: [
      { id: 'background-jobs', name: 'Background Jobs', description: 'Run long-running tasks in the background without timeout constraints or serverless cold starts' },
      { id: 'cron-schedule', name: 'Cron Scheduling', description: 'Schedule recurring tasks with cron expressions and one-off delayed executions' },
      { id: 'retry-recovery', name: 'Retry & Recovery', description: 'Automatically retry failed steps with configurable backoff and resume from checkpoint' },
      { id: 'realtime-logs', name: 'Realtime Logs', description: 'Stream live task logs and status updates to the Trigger.dev dashboard or your app' },
      { id: 'mcp-trigger', name: 'MCP Trigger', description: 'Trigger jobs and query run status from Claude and other MCP-compatible AI agents' },
    ],
  },
  {
    name: 'Pipedream MCP',
    slug: 'pipedream-mcp',
    description: "Pipedream's MCP server exposes 2,400+ app integrations as tools for AI agents — connect Slack, GitHub, databases, and APIs without writing integration code.",
    providerName: 'Pipedream',
    providerUrl: 'https://pipedream.com',
    agentUrl: 'https://pipedream.com/docs/mcp',
    categories: ['scheduling'],
    tags: ['mcp', 'integrations', 'workflow-automation', 'api-connectors', 'multi-app', 'no-code'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'app-integrations', name: 'App Integrations', description: 'Access 2,400+ pre-built app integrations as MCP tools with managed OAuth credentials' },
      { id: 'workflow-trigger', name: 'Workflow Trigger', description: 'Trigger Pipedream workflows from an AI agent and receive structured step results' },
      { id: 'data-transform', name: 'Data Transform', description: 'Run data transformation steps between API calls without writing glue code' },
      { id: 'event-sources', name: 'Event Sources', description: 'Subscribe to real-time event streams from apps like GitHub, Stripe, and Slack' },
      { id: 'credential-mgmt', name: 'Credential Management', description: 'Reuse stored OAuth tokens and API keys across workflows without re-authenticating' },
    ],
  },
  {
    name: 'Activepieces',
    slug: 'activepieces',
    description: 'Open-source workflow automation platform with MCP server, 280+ connectors, and REST API. Self-hostable alternative to Zapier for building AI-triggered automations.',
    providerName: 'Activepieces',
    providerUrl: 'https://activepieces.com',
    agentUrl: 'https://www.activepieces.com/docs/developers/mcp',
    categories: ['scheduling'],
    tags: ['workflow-automation', 'open-source', 'mcp', 'self-hosted', 'no-code', 'connectors'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'flow-builder', name: 'Flow Builder', description: 'Build multi-step automation flows visually with 280+ app connectors and conditional logic' },
      { id: 'mcp-expose', name: 'MCP Expose', description: 'Expose any Activepieces flow as an MCP tool callable from Claude and AI agents' },
      { id: 'rest-trigger', name: 'REST Trigger', description: 'Trigger flows via REST API and receive structured output from completed runs' },
      { id: 'self-host', name: 'Self-Hostable', description: 'Deploy on your own infrastructure with Docker — full data ownership and open-source license' },
      { id: 'webhook-events', name: 'Webhook Events', description: 'Receive webhooks from any app and route them into automation flows in real time' },
    ],
  },
  {
    name: 'Inbox Zero',
    slug: 'inbox-zero',
    description: 'Open-source AI email management tool with MCP server. Automates bulk unsubscribing, smart archiving, reply drafting, and rule-based inbox cleanup via AI.',
    providerName: 'Elie Steinbock',
    providerUrl: 'https://getinboxzero.com',
    agentUrl: 'https://getinboxzero.com/mcp',
    categories: ['scheduling'],
    tags: ['mcp', 'email-management', 'inbox-cleanup', 'unsubscribe', 'gmail', 'ai-replies'],
    authType: 'oauth2',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    featured: false,
    verified: true,
    skills: [
      { id: 'bulk-unsubscribe', name: 'Bulk Unsubscribe', description: 'Identify and unsubscribe from newsletters and marketing emails in bulk with one action' },
      { id: 'smart-archive', name: 'Smart Archive', description: 'Archive emails automatically based on AI-classified categories and user-defined rules' },
      { id: 'reply-draft', name: 'Reply Drafting', description: 'Draft context-aware email replies using AI with your writing style and prior thread' },
      { id: 'rule-engine', name: 'Rule Engine', description: 'Create natural language rules that automatically label, archive, or forward incoming mail' },
      { id: 'mcp-control', name: 'MCP Control', description: 'Manage your inbox programmatically from Claude and MCP-compatible agents via Inbox Zero MCP' },
    ],
  },
];

async function updateDescriptionAndPublish(slug: string, newDescription: string) {
  await refreshTokenIfNeeded();
  const entry = await findEntry(slug);
  if (!entry) { console.log(`  ⚠️  ${slug} not found`); return; }

  // Update description field
  entry.fields.description = { 'en-US': newDescription };
  const updated = await cma(`/entries/${entry.sys.id}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(entry.sys.version) } as any,
    body: JSON.stringify({ fields: entry.fields }),
  });
  if (!updated.sys?.id) {
    console.log(`  ❌ Update failed for ${slug}: ${JSON.stringify(updated).slice(0, 200)}`);
    return;
  }

  // Publish
  const pub = await cma(`/entries/${updated.sys.id}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(updated.sys.version) } as any,
  });
  if (pub.sys?.publishedVersion) {
    console.log(`  ✅ Updated & published: ${slug}`);
  } else {
    console.log(`  ❌ Publish failed for ${slug}: ${JSON.stringify(pub).slice(0, 200)}`);
  }
}

async function updateMultipleFields(slug: string, patch: Record<string, any>) {
  await refreshTokenIfNeeded();
  const entry = await findEntry(slug);
  if (!entry) { console.log(`  ⚠️  ${slug} not found`); return; }
  const ver = entry.sys.version;
  for (const [key, val] of Object.entries(patch)) {
    entry.fields[key] = { 'en-US': val };
  }
  const updated = await cma(`/entries/${entry.sys.id}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(ver) } as any,
    body: JSON.stringify({ fields: entry.fields }),
  });
  if (updated.sys?.id) {
    await cma(`/entries/${updated.sys.id}/published`, {
      method: 'PUT',
      headers: { 'X-Contentful-Version': String(updated.sys.version) } as any,
    });
    console.log(`  🔄 Updated ${slug}: ${Object.keys(patch).join(', ')}`);
  } else {
    console.log(`  ❌ Update failed for ${slug}: ${JSON.stringify(updated).slice(0, 200)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Seeding ${agents.length} real agents...\n`);

  // ── Create new categories ────────────────────────────────────
  console.log('── Creating new categories ──');
  const commerceId = await createCategory({
    name: 'Commerce & Payments',
    slug: 'commerce-payments',
    description:
      'AI agents powering the next generation of e-commerce, checkout automation, and payment intelligence. From agentic storefronts that let AI shop on your behalf to payment orchestration layers that route transactions intelligently, this category covers the full commerce stack.',
    icon: 'ShoppingCart',
    sortOrder: 13,
  });
  if (commerceId) CAT['commerce-payments'] = commerceId;

  const memoryId = await createCategory({
    name: 'Memory & State',
    slug: 'memory-state',
    description: 'Persistent memory and state management layers for AI agents. Store, retrieve, and reason over long-term user context, preferences, and knowledge across sessions.',
    icon: 'Brain',
    sortOrder: 14,
  });
  if (memoryId) CAT['memory-state'] = memoryId;

  const browserId = await createCategory({
    name: 'Browser & Computer Use',
    slug: 'browser-computer',
    description: 'Headless browser infrastructure and secure code execution sandboxes for AI agents. Run agents that browse the web, interact with UIs, and execute code safely.',
    icon: 'Monitor',
    sortOrder: 15,
  });
  if (browserId) CAT['browser-computer'] = browserId;

  const vectorId = await createCategory({
    name: 'Vector Databases',
    slug: 'vector-databases',
    description: 'High-performance vector stores for AI-native search and retrieval. Store embeddings, power semantic search, and build production RAG pipelines at any scale.',
    icon: 'Database',
    sortOrder: 16,
  });
  if (vectorId) CAT['vector-databases'] = vectorId;

  const voiceId = await createCategory({
    name: 'Voice & Messaging',
    slug: 'voice-messaging',
    description: 'AI platforms for voice calls, phone agents, and conversational messaging across WhatsApp, SMS, and email. Build agents that talk, listen, and message at scale.',
    icon: 'Phone',
    sortOrder: 17,
  });
  if (voiceId) CAT['voice-messaging'] = voiceId;

  // Move here.now to the Browser & Computer Use category
  console.log('\n── Moving here.now → browser-computer ──');
  await updateCategory('here-now', 'browser-computer');

  // Fix drafts from previous runs: update descriptions + publish
  console.log('\n── Fixing & publishing stuck drafts ──');
  await updateDescriptionAndPublish(
    'google-colab-mcp',
    'Official MCP server for Google Colab. Lets AI agents create, execute, and manage GPU-accelerated Jupyter notebooks via Model Context Protocol — no browser needed.',
  );
  await updateDescriptionAndPublish(
    'nvidia-nemoclaw',
    'Open-source security runtime for multi-agent AI. Enforces policy-based access control, sandboxes kernel interactions, and privacy-routes sensitive data for enterprise local inference.',
  );
  await updateDescriptionAndPublish(
    'shopify-agentic-storefronts',
    "Shopify's A2A-compatible layer for agentic commerce. AI agents browse catalogs, configure products, and initiate checkout. Full storefront exposed as an agent API with real-time inventory sync.",
  );
  await updateDescriptionAndPublish(
    'rox-ai',
    'Autonomous revenue platform deploying swarms of AI sales agents across account mapping, outreach, and CRM hygiene to surface the right opportunity. Backed by a $50M Series B.',
  );
  await updateDescriptionAndPublish(
    'oracle-ai-database-26ai',
    "World's first AI-native database with agents running inside the kernel. Features no-code Agent Factory, unified vector search, multi-modal RAG, and identity-aware access control.",
  );

  // Update existing entries with accessMethods
  console.log('\n── Updating existing agents with accessMethods ──');
  await updateAccessMethods('agentmail', ['api', 'mcp', 'cli']);
  await updateAccessMethods('here-now', ['api']);

  // Refresh Intercom Fin with CLI access method, updated skills and URL
  console.log('\n── Refreshing Intercom Fin (CLI added) ──');
  await updateMultipleFields('intercom-fin', {
    description: 'AI customer service agent and CLI. Resolves 50%+ of support volume; Fin CLI lets AI agents configure, publish, and manage Intercom from the terminal.',
    accessMethods: ['api', 'mcp', 'cli'],
    agentUrl: 'https://fin.ai/cli',
    skills: [
      { id: 'cli-setup', name: 'CLI Setup & Config', description: 'Zero-config terminal setup for Intercom helpdesk via npm install -g @intercom/cli' },
      { id: 'content-import', name: 'Content Import', description: 'Import articles and help content into Intercom from the terminal in one command' },
      { id: 'auto-resolution', name: 'Auto Resolution', description: 'Resolves 50%+ of support tickets instantly using help center and conversation history' },
      { id: 'multi-channel', name: 'Multi-Channel Support', description: 'Handles customer queries across live chat, email, phone, and social from one agent' },
      { id: 'deploy-publish', name: 'Deploy & Publish', description: 'Deploys Fin live and publishes Intercom Messenger config changes via CLI commands' },
    ],
  });

  console.log('\n── Creating new agents ──');
  let created = 0;
  let skipped = 0;

  for (const agent of agents) {
    try {
      const result = await createAgent(agent);
      if (result?.sys?.type === 'Entry' || result?.sys?.id) {
        created++;
      } else {
        skipped++;
      }
    } catch (err: any) {
      console.log(`  ❌ ${agent.name}: ${err.message}`);
      skipped++;
    }
    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Mode B audit — add MCP to existing agents ────────────────
  console.log('\n── Mode B: updating accessMethods for sentry-ai, linear, n8n ──');
  const sentryEntry = await findEntry('sentry-ai');
  if (sentryEntry) {
    const sentryMethods: string[] = sentryEntry.fields.accessMethods?.['en-US'] ?? [];
    if (!sentryMethods.includes('mcp')) {
      await updateMultipleFields('sentry-ai', { accessMethods: [...sentryMethods, 'mcp'] });
    } else {
      console.log('  ⏭  sentry-ai already has mcp');
    }
  } else {
    console.log('  ⚠️  sentry-ai not found');
  }

  const linearEntry = await findEntry('linear');
  if (linearEntry) {
    const linearMethods: string[] = linearEntry.fields.accessMethods?.['en-US'] ?? [];
    if (!linearMethods.includes('mcp')) {
      await updateMultipleFields('linear', { accessMethods: [...linearMethods, 'mcp'] });
    } else {
      console.log('  ⏭  linear already has mcp');
    }
  } else {
    console.log('  ⚠️  linear not found');
  }

  const n8nEntry = await findEntry('n8n');
  if (n8nEntry) {
    const n8nMethods: string[] = n8nEntry.fields.accessMethods?.['en-US'] ?? [];
    if (!n8nMethods.includes('mcp')) {
      await updateMultipleFields('n8n', { accessMethods: [...n8nMethods, 'mcp'] });
    } else {
      console.log('  ⏭  n8n already has mcp');
    }
  } else {
    console.log('  ⚠️  n8n not found');
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
}

main().catch(console.error);
