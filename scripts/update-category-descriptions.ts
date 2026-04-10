/**
 * Updates all category descriptions with rich, keyword-rich copy.
 * Run: npx tsx scripts/update-category-descriptions.ts
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import * as fs from 'fs';

function readTokenFromEnv(): string {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/CONTENTFUL_MANAGEMENT_TOKEN="([^"]+)"/);
  return match?.[1] ?? process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
}

try {
  execSync('bash scripts/refresh-cma-token.sh', { stdio: 'inherit' });
} catch (e) {
  console.log('⚠️  Token refresh failed, using existing token');
}

const SPACE = process.env.CONTENTFUL_SPACE_ID || '8e4hmp8gwcuv';
let TOKEN = readTokenFromEnv();
const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/master`;

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

async function updateCategoryDescription(slug: string, description: string) {
  const res = await cma(`/entries?content_type=category&fields.slug=${slug}&limit=1`);
  const entry = res.items?.[0];
  if (!entry) { console.log(`  ⚠️  Category not found: ${slug}`); return; }

  const ver = entry.sys.version;
  entry.fields.description = { 'en-US': description };

  const updated = await cma(`/entries/${entry.sys.id}`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(ver) } as any,
    body: JSON.stringify({ fields: entry.fields }),
  });

  if (!updated.sys?.id) {
    console.log(`  ❌ Update failed for ${slug}: ${JSON.stringify(updated).slice(0, 200)}`);
    return;
  }

  const pub = await cma(`/entries/${updated.sys.id}/published`, {
    method: 'PUT',
    headers: { 'X-Contentful-Version': String(updated.sys.version) } as any,
  });

  if (pub.sys?.publishedVersion) {
    console.log(`  ✅ ${slug}`);
  } else {
    console.log(`  ❌ Publish failed for ${slug}: ${JSON.stringify(pub).slice(0, 200)}`);
  }

  await new Promise((r) => setTimeout(r, 300));
}

const CATEGORIES: Record<string, string> = {
  'language':
    'AI translation and language processing agents for global applications. From enterprise-grade document translation to real-time multilingual chat, these agents break language barriers at scale. Essential for any app reaching non-English markets or processing multilingual data pipelines.',

  'data-analytics':
    'AI agents that query, transform, and reason over structured data — from SQL databases to cloud data warehouses. These tools let language models run analytics, generate reports, and surface insights without manual wrangling. Best for BI automation, data quality pipelines, and AI-driven dashboards.',

  'customer-support':
    'AI agents that handle customer inquiries, resolve tickets, and automate support workflows across chat, email, and phone. These tools integrate with your helpdesk to deflect repetitive queries and surface the right answers instantly. The best ones resolve 50%+ of support volume without human intervention.',

  'code-devtools':
    'AI-powered development tools that write, review, debug, and ship code faster. From in-IDE copilots to autonomous coding agents that open PRs, these tools plug directly into developer workflows. Increasingly capable of handling full features end-to-end given a specification.',

  'finance':
    'AI agents for financial data access, payment automation, and expense management. These tools connect your agents to banking APIs, expense systems, and market data — enabling programmatic spend control, reconciliation, and financial reporting without human touchpoints.',

  'sales-marketing':
    'AI agents that research prospects, draft outreach, manage pipelines, and generate marketing content at scale. These tools handle the repetitive parts of go-to-market — account mapping, personalized email sequences, CRM hygiene — so sales teams can focus on closing.',

  'legal':
    'AI agents purpose-built for legal research, contract analysis, and document review. Unlike general-purpose LLMs, these tools are trained on legal corpora and understand jurisdiction, precedent, and contract structure. Used by law firms and in-house teams to accelerate due diligence.',

  'content-media':
    'AI agents for generating, editing, and distributing media — text, image, video, audio, and voice. These tools power content pipelines, creative workflows, and media production at scale. From transcription and speaker diarization to video synthesis, they handle the full content lifecycle.',

  'infrastructure':
    'Foundational AI infrastructure — agent frameworks, LLM gateways, observability platforms, and integration layers. These are the tools production AI applications depend on: rate limiting, cost tracking, tracing, fallbacks, and connecting agents to external APIs. The plumbing of the agentic stack.',

  'research':
    'AI agents for web search, document retrieval, and knowledge synthesis. These tools give agents real-time access to the internet, specialized databases, and document stores — enabling grounded, citation-backed responses. Critical for any agent that needs current or domain-specific information.',

  'scheduling':
    'AI agents for calendar management, meeting scheduling, and workflow automation. These tools understand natural language scheduling requests and coordinate across calendars, time zones, and communication channels — handling the cognitive overhead of keeping complex schedules organized.',

  'security':
    'AI agents for threat detection, access control, vulnerability scanning, and security policy enforcement. From SIEM integrations to agent-level sandboxing and governance layers, these tools protect AI systems and the applications they power. Increasingly essential as agentic workloads expand.',

  'commerce-payments':
    'AI agents powering e-commerce automation, checkout optimization, and payment intelligence. These tools enable agentic shopping experiences, dynamic pricing, inventory sync, and payment routing — all programmatically. Built for AI-native storefronts and the next generation of financial flows.',

  'memory-state':
    'Persistent memory and state management layers for AI agents. These tools store, retrieve, and reason over long-term user context, conversation history, and knowledge across sessions. Without memory, every interaction starts from scratch — these agents give your AI continuity and personalization.',

  'browser-computer':
    'AI agents that control browsers, execute code in sandboxed environments, and interact with websites and desktop apps. These tools extend AI beyond text into the real web — navigating UIs, filling forms, scraping data, and running code securely. The infrastructure layer for autonomous web agents.',

  'vector-databases':
    'Vector databases purpose-built for AI applications — store, index, and search high-dimensional embeddings at scale. These are the retrieval backbone of RAG pipelines, semantic search, and long-term agent memory. Available as managed cloud services or open-source self-hosted deployments.',

  'voice-messaging':
    'AI agents for voice calls, WhatsApp, SMS, and messaging channel automation. These tools handle real-time speech-to-text, turn-taking, TTS, and multi-channel routing — enabling phone agents that sound human and messaging bots that feel native. Critical for customer-facing voice and chat automation.',
};

async function main() {
  console.log('\n🚀 Updating category descriptions...\n');
  for (const [slug, description] of Object.entries(CATEGORIES)) {
    await updateCategoryDescription(slug, description);
  }
  console.log('\n✅ Done!');
}

main().catch(console.error);
