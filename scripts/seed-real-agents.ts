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
];

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Seeding ${agents.length} real agents...\n`);

  // Update existing entries with accessMethods
  console.log('── Updating existing agents with accessMethods ──');
  await updateAccessMethods('agentmail', ['api', 'mcp', 'cli']);
  await updateAccessMethods('here-now', ['api']);

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

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}`);
}

main().catch(console.error);
