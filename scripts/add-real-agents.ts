/**
 * Add real agents: AgentMail and here.now
 * Run: npx tsx scripts/add-real-agents.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID!;
const MGMT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
const ENV_ID = 'master';
const BASE = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENV_ID}`;

async function cma(p: string, options: { method?: string; body?: any } = {}): Promise<any> {
  const { method = 'GET', body } = options;
  const url = p.startsWith('http') ? p : `${BASE}${p}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${MGMT_TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    console.error(`CMA ${method} ${p} → ${res.status}`, JSON.stringify(data, null, 2));
  }
  return data;
}

async function searchEntries(contentTypeId: string, query: string): Promise<any> {
  return cma(`/entries?content_type=${contentTypeId}&fields.slug=${query}`);
}

async function findCategoryId(slug: string): Promise<string | null> {
  const result = await searchEntries('category', slug);
  return result?.items?.[0]?.sys?.id ?? null;
}

async function createAndPublish(fields: any) {
  // Check if already exists
  const existing = await searchEntries('agent', fields.slug['en-US']);
  if (existing?.items?.length > 0) {
    console.log(`⏭  Agent "${fields.name['en-US']}" already exists, skipping.`);
    return;
  }

  const url = `${BASE}/entries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MGMT_TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      'X-Contentful-Content-Type': 'agent',
    },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();

  if (!res.ok) {
    // Might have been created by the first call - check
    if (res.status === 409) {
      console.log(`Agent "${fields.name['en-US']}" already exists.`);
      return;
    }
    console.error(`Failed to create ${fields.name['en-US']}:`, res.status, JSON.stringify(data, null, 2));
    return;
  }

  console.log(`✅ Created "${fields.name['en-US']}" (${data.sys.id})`);

  // Publish
  const pubRes = await fetch(`${BASE}/entries/${data.sys.id}/published`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${MGMT_TOKEN}`,
      'X-Contentful-Version': String(data.sys.version),
    },
  });

  if (pubRes.ok) {
    console.log(`✅ Published "${fields.name['en-US']}"`);
  } else {
    const err = await pubRes.json();
    console.error(`Failed to publish:`, err);
  }
}

async function main() {
  console.log('🔍 Looking up category IDs...');

  const infraId = await findCategoryId('infrastructure');
  const codeId = await findCategoryId('code-devtools');
  const contentId = await findCategoryId('content-media');

  console.log(`  infrastructure: ${infraId}`);
  console.log(`  code-devtools: ${codeId}`);
  console.log(`  content-media: ${contentId}`);

  // ── AgentMail ──────────────────────────────────────────
  const agentmailCategories: any[] = [];
  if (infraId) agentmailCategories.push({ sys: { type: 'Link', linkType: 'Entry', id: infraId } });
  if (codeId) agentmailCategories.push({ sys: { type: 'Link', linkType: 'Entry', id: codeId } });

  const agentmailFields = {
    name: { 'en-US': 'AgentMail' },
    slug: { 'en-US': 'agentmail' },
    description: { 'en-US': 'Email inbox API built for AI agents. Create, send, receive, search, and manage email programmatically with SDKs for Python, TypeScript, and Go. Backed by Y Combinator.' },
    providerName: { 'en-US': 'AgentMail' },
    providerUrl: { 'en-US': 'https://agentmail.to' },
    agentUrl: { 'en-US': 'https://agentmail.to' },
    categories: { 'en-US': agentmailCategories },
    tags: { 'en-US': ['email', 'api', 'mcp', 'y-combinator', 'websocket', 'real-time'] },
    skills: {
      'en-US': [
        { id: 'inbox-management', name: 'Inbox Management', description: 'Create, list, update, and delete email inboxes via API.' },
        { id: 'send-receive', name: 'Send & Receive Email', description: 'Send, receive, reply, reply-all, and forward emails programmatically.' },
        { id: 'semantic-search', name: 'Semantic Search', description: 'Search emails by meaning, not just keywords.' },
        { id: 'structured-extraction', name: 'Structured Data Extraction', description: 'Extract structured data from email content automatically.' },
        { id: 'thread-management', name: 'Thread Management', description: 'Group messages into conversation threads with labels and workflow tracking.' },
        { id: 'attachments', name: 'Attachments', description: 'Send and download file attachments on messages.' },
      ],
    },
    authType: { 'en-US': 'apiKey' },
    supportsStreaming: { 'en-US': true },
    supportsPushNotifications: { 'en-US': true },
    status: { 'en-US': 'published' },
    featured: { 'en-US': true },
    featuredUntil: { 'en-US': '2026-12-31' },
    verified: { 'en-US': true },
    tier: { 'en-US': 'free' },
    discoveredBy: { 'en-US': 'manual' },
    sponsorLabel: { 'en-US': '⭐ Editor\'s Pick' },
  };

  await createAndPublish(agentmailFields);

  // ── here.now ───────────────────────────────────────────
  const herenowCategories: any[] = [];
  if (infraId) herenowCategories.push({ sys: { type: 'Link', linkType: 'Entry', id: infraId } });
  if (codeId) herenowCategories.push({ sys: { type: 'Link', linkType: 'Entry', id: codeId } });
  if (contentId) herenowCategories.push({ sys: { type: 'Link', linkType: 'Entry', id: contentId } });

  const herenowFields = {
    name: { 'en-US': 'here.now' },
    slug: { 'en-US': 'here-now' },
    description: { 'en-US': 'Instant, free web hosting for AI agents. Publish static sites, files, and folders to a live URL in seconds via REST API. Powered by Cloudflare\'s edge network with custom domains and password protection.' },
    providerName: { 'en-US': 'here.now' },
    providerUrl: { 'en-US': 'http://here.now' },
    agentUrl: { 'en-US': 'http://here.now' },
    categories: { 'en-US': herenowCategories },
    tags: { 'en-US': ['hosting', 'static-sites', 'deploy', 'cloudflare', 'free', 'api'] },
    skills: {
      'en-US': [
        { id: 'publish-site', name: 'Publish Site', description: 'Deploy static files and folders to a live URL in seconds with presigned uploads.' },
        { id: 'incremental-deploy', name: 'Incremental Deploy', description: 'SHA-256 hash-based change detection — only changed files are re-uploaded.' },
        { id: 'custom-domains', name: 'Custom Domains', description: 'Connect custom domains with CNAME/ALIAS/TXT records.' },
        { id: 'password-protection', name: 'Password Protection', description: 'Server-side enforced password protection for published sites.' },
        { id: 'site-management', name: 'Site Management', description: 'List, update metadata, duplicate, and delete published sites.' },
      ],
    },
    authType: { 'en-US': 'bearer' },
    supportsStreaming: { 'en-US': false },
    supportsPushNotifications: { 'en-US': false },
    status: { 'en-US': 'published' },
    featured: { 'en-US': true },
    featuredUntil: { 'en-US': '2026-12-31' },
    verified: { 'en-US': true },
    tier: { 'en-US': 'free' },
    discoveredBy: { 'en-US': 'manual' },
    sponsorLabel: { 'en-US': '⭐ Editor\'s Pick' },
  };

  await createAndPublish(herenowFields);

  console.log('\n🎉 Done!');
}

main().catch(console.error);
