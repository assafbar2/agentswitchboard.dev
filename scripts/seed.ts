/**
 * Seed script for Agent Switchboard
 *
 * Creates content types + seed data in Contentful.
 * Run: npx tsx scripts/seed.ts
 *
 * Requires CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN in .env.local
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID!;
const MGMT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN!;
const ENV_ID = 'master';
const BASE = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENV_ID}`;

if (!SPACE_ID || !MGMT_TOKEN) {
  console.error('Missing CONTENTFUL_SPACE_ID or CONTENTFUL_MANAGEMENT_TOKEN in .env.local');
  process.exit(1);
}

// ── Raw HTTP helper (bypasses SDK permission issues) ────────────────

async function cma(path: string, options: { method?: string; body?: any } = {}): Promise<any> {
  const { method = 'GET', body } = options;
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${MGMT_TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CMA ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function cmaPut(path: string, body: any, version?: number): Promise<any> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${MGMT_TOKEN}`,
    'Content-Type': 'application/vnd.contentful.management.v1+json',
  };
  if (version !== undefined) {
    headers['X-Contentful-Version'] = String(version);
  }
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CMA PUT ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

// ── Content Type Definitions ────────────────────────────────────────

const CATEGORY_CONTENT_TYPE = {
  name: 'Category',
  displayField: 'name',
  fields: [
    { id: 'name', name: 'Name', type: 'Symbol', required: true },
    {
      id: 'slug',
      name: 'Slug',
      type: 'Symbol',
      required: true,
      validations: [{ unique: true }, { regexp: { pattern: '^[a-z0-9-]+$' } }],
    },
    { id: 'description', name: 'Description', type: 'Text', required: false },
    { id: 'icon', name: 'Icon', type: 'Symbol', required: false },
    { id: 'sortOrder', name: 'Sort Order', type: 'Integer', required: false },
  ],
};

const AGENT_CONTENT_TYPE = {
  name: 'Agent',
  displayField: 'name',
  fields: [
    { id: 'name', name: 'Name', type: 'Symbol', required: true },
    {
      id: 'slug',
      name: 'Slug',
      type: 'Symbol',
      required: true,
      validations: [{ unique: true }, { regexp: { pattern: '^[a-z0-9-]+$' } }],
    },
    {
      id: 'description',
      name: 'Description',
      type: 'Symbol',
      required: true,
      validations: [{ size: { max: 200 } }],
    },
    { id: 'longDescription', name: 'Long Description', type: 'RichText', required: false },
    { id: 'providerName', name: 'Provider Name', type: 'Symbol', required: true },
    { id: 'providerUrl', name: 'Provider URL', type: 'Symbol', required: true },
    { id: 'version', name: 'Version', type: 'Symbol', required: false },
    { id: 'agentUrl', name: 'Agent URL', type: 'Symbol', required: true },
    { id: 'wellKnownUrl', name: 'Well-Known URL', type: 'Symbol', required: false },
    { id: 'agentCardJson', name: 'Agent Card JSON', type: 'Text', required: false },
    {
      id: 'categories',
      name: 'Categories',
      type: 'Array',
      required: true,
      items: {
        type: 'Link',
        linkType: 'Entry',
        validations: [{ linkContentType: ['category'] }],
      },
    },
    {
      id: 'tags',
      name: 'Tags',
      type: 'Array',
      required: false,
      items: { type: 'Symbol' },
    },
    { id: 'skills', name: 'Skills', type: 'Object', required: false },
    {
      id: 'authType',
      name: 'Auth Type',
      type: 'Symbol',
      required: false,
      validations: [{ in: ['apiKey', 'oauth2', 'bearer', 'none'] }],
    },
    { id: 'authInstructions', name: 'Auth Instructions', type: 'RichText', required: false },
    { id: 'integrationGuide', name: 'Integration Guide', type: 'RichText', required: false },
    { id: 'supportsStreaming', name: 'Supports Streaming', type: 'Boolean', required: false },
    { id: 'supportsPushNotifications', name: 'Supports Push Notifications', type: 'Boolean', required: false },
    { id: 'iconUrl', name: 'Icon URL', type: 'Symbol', required: false },
    {
      id: 'status',
      name: 'Status',
      type: 'Symbol',
      required: true,
      validations: [{ in: ['published', 'draft', 'archived'] }],
    },
    { id: 'featured', name: 'Featured', type: 'Boolean', required: false },
    { id: 'featuredUntil', name: 'Featured Until', type: 'Date', required: false },
    { id: 'verified', name: 'Verified', type: 'Boolean', required: false },
    { id: 'referralUrl', name: 'Referral URL', type: 'Symbol', required: false },
    { id: 'sponsorLabel', name: 'Sponsor Label', type: 'Symbol', required: false },
    {
      id: 'tier',
      name: 'Tier',
      type: 'Symbol',
      required: false,
      validations: [{ in: ['free', 'premium'] }],
    },
    {
      id: 'discoveredBy',
      name: 'Discovered By',
      type: 'Symbol',
      required: false,
      validations: [{ in: ['manual', 'worker'] }],
    },
    { id: 'workerSource', name: 'Worker Source', type: 'Symbol', required: false },
  ],
};

const SITE_SETTINGS_CONTENT_TYPE = {
  name: 'Site Settings',
  displayField: 'siteName',
  fields: [
    { id: 'siteName', name: 'Site Name', type: 'Symbol', required: true },
    { id: 'tagline', name: 'Tagline', type: 'Symbol', required: true },
    { id: 'heroSubtitle', name: 'Hero Subtitle', type: 'Text', required: false },
    { id: 'footerText', name: 'Footer Text', type: 'Symbol', required: false },
    { id: 'advertiseUrl', name: 'Advertise URL', type: 'Symbol', required: false },
    { id: 'premiumPriceMonthly', name: 'Premium Price Monthly', type: 'Number', required: false },
    { id: 'premiumCheckoutUrl', name: 'Premium Checkout URL', type: 'Symbol', required: false },
  ],
};

// ── Seed Data ───────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Language & Translation', slug: 'language', icon: 'Languages', sortOrder: 1 },
  { name: 'Data & Analytics', slug: 'data-analytics', icon: 'BarChart3', sortOrder: 2 },
  { name: 'Customer Support', slug: 'customer-support', icon: 'Headphones', sortOrder: 3 },
  { name: 'Code & DevTools', slug: 'code-devtools', icon: 'Code2', sortOrder: 4 },
  { name: 'Finance & Accounting', slug: 'finance', icon: 'DollarSign', sortOrder: 5 },
  { name: 'Sales & Marketing', slug: 'sales-marketing', icon: 'TrendingUp', sortOrder: 6 },
  { name: 'Legal & Compliance', slug: 'legal', icon: 'Scale', sortOrder: 7 },
  { name: 'Content & Media', slug: 'content-media', icon: 'Image', sortOrder: 8 },
  { name: 'Infrastructure & Ops', slug: 'infrastructure', icon: 'Server', sortOrder: 9 },
  { name: 'Research & Knowledge', slug: 'research', icon: 'BookOpen', sortOrder: 10 },
  { name: 'Scheduling & Workflow', slug: 'scheduling', icon: 'Calendar', sortOrder: 11 },
  { name: 'Security', slug: 'security', icon: 'Shield', sortOrder: 12 },
];

function richText(paragraphs: string[]) {
  return {
    nodeType: 'document' as const,
    data: {},
    content: paragraphs.map((text) => ({
      nodeType: 'paragraph' as const,
      data: {},
      content: [{ nodeType: 'text' as const, value: text, marks: [], data: {} }],
    })),
  };
}

function agentCard(agent: { name: string; description: string; agentUrl: string; skills: any[]; authType: string; streaming: boolean }) {
  return JSON.stringify(
    {
      name: agent.name,
      description: agent.description,
      url: agent.agentUrl,
      version: '1.0.0',
      capabilities: {
        streaming: agent.streaming,
        pushNotifications: false,
      },
      authentication: {
        schemes: [agent.authType === 'none' ? 'none' : agent.authType],
      },
      skills: agent.skills.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        inputModes: ['application/json'],
        outputModes: ['application/json'],
      })),
    },
    null,
    2
  );
}

const AGENTS = [
  {
    name: 'Polyglot Translate',
    slug: 'polyglot-translate',
    description: 'Real-time translation agent supporting 40+ languages with streaming and automatic language detection.',
    longDescription: [
      'Polyglot Translate is one of the most capable A2A translation agents available today. It handles over 40 language pairs with impressive accuracy, and its streaming support means you get translated tokens as they arrive — ideal for real-time chat applications.',
      'What sets Polyglot apart from simple translation APIs is its contextual awareness. It maintains conversation history within a session, so translations improve as more context becomes available. The batch_translate skill is particularly useful for processing document arrays without hitting rate limits.',
      'One gotcha: the free tier is limited to 10,000 characters per request. For larger documents, you\'ll want to chunk your input or upgrade to their Pro plan. Language detection is solid for European languages but can struggle with short texts in less common scripts.',
    ],
    providerName: 'Polyglot Inc.',
    providerUrl: 'https://polyglot-translate.example.com',
    version: '1.2.0',
    agentUrl: 'https://api.polyglot-translate.example.com/a2a',
    wellKnownUrl: 'https://polyglot-translate.example.com/.well-known/agent.json',
    categorySlug: 'language',
    tags: ['translation', 'nlp', 'multilingual', 'streaming'],
    skills: [
      { id: 'translate_text', name: 'Translate Text', description: 'Translate text between any two supported languages', inputSchema: { text: 'string', sourceLang: 'string (optional)', targetLang: 'string' }, outputSchema: { translatedText: 'string', detectedSourceLang: 'string', confidence: 'number' } },
      { id: 'detect_language', name: 'Detect Language', description: 'Detect the language of input text', inputSchema: { text: 'string' }, outputSchema: { language: 'string', confidence: 'number', alternatives: 'array' } },
      { id: 'batch_translate', name: 'Batch Translate', description: 'Translate multiple texts in a single request', inputSchema: { texts: 'string[]', targetLang: 'string' }, outputSchema: { translations: 'array' } },
    ],
    authType: 'apiKey',
    authInstructions: [
      '1. Sign up at polyglot-translate.example.com/signup',
      '2. Go to Dashboard → API Keys',
      '3. Click "Create New Key" and give it a name',
      '4. Copy the key — it won\'t be shown again',
      '5. Pass it as x-api-key header in your requests',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.polyglot-translate.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Translate to French: Hello world"}]},"skillId":"translate_text"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.polyglot-translate.example.com/a2a",\n    headers={"x-api-key": "YOUR_API_KEY"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Translate to French: Hello world"}]},\n            "skillId": "translate_text"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.polyglot-translate.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "x-api-key": "YOUR_API_KEY",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Translate to French: Hello world" }] },\n      skillId: "translate_text",\n    },\n    id: "1",\n  }),\n});\nconst data = await response.json();\nconsole.log(data);',
    ],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: true,
    verified: true,
    featuredUntil: '2027-12-31T00:00:00Z',
    sponsorLabel: 'Sponsored by Polyglot Inc.',
    tier: 'free',
  },
  {
    name: 'SentryWatch Monitor',
    slug: 'sentrywatch-monitor',
    description: 'Error monitoring and alerting agent that watches your services and delivers real-time incident summaries.',
    longDescription: [
      'SentryWatch Monitor is your always-on ops companion. Point it at your services and it will track error rates, group incidents by root cause, and deliver actionable summaries when things go sideways.',
      'The alert_summary skill is the star here — it aggregates errors across services and produces a prioritized list of issues with suggested remediation steps. It\'s particularly effective when paired with a scheduling agent that triggers it on a cron.',
      'Fair warning: the agent\'s error grouping algorithm is opinionated. It clusters by stack trace similarity, which works great for application errors but can over-group infrastructure issues. You may want to filter by service name in complex microservice setups.',
    ],
    providerName: 'SentryWatch Labs',
    providerUrl: 'https://sentrywatch.example.com',
    version: '2.0.1',
    agentUrl: 'https://api.sentrywatch.example.com/a2a',
    wellKnownUrl: 'https://sentrywatch.example.com/.well-known/agent.json',
    categorySlug: 'infrastructure',
    tags: ['monitoring', 'alerting', 'devops'],
    skills: [
      { id: 'check_status', name: 'Check Status', description: 'Check the health status of a monitored service', inputSchema: { serviceUrl: 'string' }, outputSchema: { status: 'string', uptime: 'number', lastIncident: 'string | null' } },
      { id: 'get_errors', name: 'Get Errors', description: 'Retrieve recent errors grouped by type', inputSchema: { serviceUrl: 'string', since: 'string (ISO date)', limit: 'number' }, outputSchema: { errors: 'array', total: 'number' } },
      { id: 'alert_summary', name: 'Alert Summary', description: 'Get a prioritized summary of active alerts', inputSchema: { serviceUrls: 'string[]' }, outputSchema: { alerts: 'array', criticalCount: 'number', summary: 'string' } },
    ],
    authType: 'bearer',
    authInstructions: [
      '1. Sign up at sentrywatch.example.com',
      '2. Navigate to Settings → Integrations → API Tokens',
      '3. Generate a new token with "read" scope',
      '4. Use it as a Bearer token in the Authorization header',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.sentrywatch.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Check status of https://myapp.com"}]},"skillId":"check_status"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.sentrywatch.example.com/a2a",\n    headers={"Authorization": "Bearer YOUR_TOKEN"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Check status of https://myapp.com"}]},\n            "skillId": "check_status"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.sentrywatch.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer YOUR_TOKEN",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Check status of https://myapp.com" }] },\n      skillId: "check_status",\n    },\n    id: "1",\n  }),\n});\nconsole.log(await response.json());',
    ],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: false,
    tier: 'free',
  },
  {
    name: 'DocuParse Extractor',
    slug: 'docuparse-extractor',
    description: 'Document parsing agent that extracts tables, invoices, and text from PDFs and images using advanced OCR.',
    longDescription: [
      'DocuParse Extractor turns unstructured documents into structured data. Feed it a PDF, image, or scanned document and it returns clean JSON with tables, key-value pairs, and text blocks — all properly ordered and labeled.',
      'The extract_tables skill is exceptionally good at handling complex table layouts, including merged cells and multi-page tables. The parse_invoice skill understands common invoice formats and extracts line items, totals, tax amounts, and vendor information automatically.',
      'Performance note: large PDFs (50+ pages) can take 30-60 seconds to process. For batch workloads, consider using their async endpoint and polling for results. OCR accuracy drops noticeably on handwritten text — stick to printed documents for reliable extraction.',
    ],
    providerName: 'DocuParse AI',
    providerUrl: 'https://docuparse.example.com',
    version: '3.1.0',
    agentUrl: 'https://api.docuparse.example.com/a2a',
    wellKnownUrl: 'https://docuparse.example.com/.well-known/agent.json',
    categorySlug: 'data-analytics',
    tags: ['ocr', 'document-parsing', 'pdf', 'data-extraction'],
    skills: [
      { id: 'extract_tables', name: 'Extract Tables', description: 'Extract tabular data from documents', inputSchema: { documentUrl: 'string', pages: 'number[] (optional)' }, outputSchema: { tables: 'array', pageCount: 'number' } },
      { id: 'parse_invoice', name: 'Parse Invoice', description: 'Extract structured invoice data', inputSchema: { documentUrl: 'string' }, outputSchema: { vendor: 'object', lineItems: 'array', total: 'number', currency: 'string' } },
      { id: 'ocr_document', name: 'OCR Document', description: 'Extract text from images and scanned PDFs', inputSchema: { documentUrl: 'string', language: 'string (optional)' }, outputSchema: { text: 'string', confidence: 'number', blocks: 'array' } },
    ],
    authType: 'apiKey',
    authInstructions: [
      '1. Create an account at docuparse.example.com',
      '2. Go to Console → API Credentials',
      '3. Generate a new API key',
      '4. Pass it as x-api-key header',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.docuparse.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Extract tables from https://example.com/report.pdf"}]},"skillId":"extract_tables"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.docuparse.example.com/a2a",\n    headers={"x-api-key": "YOUR_API_KEY"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Extract tables from https://example.com/report.pdf"}]},\n            "skillId": "extract_tables"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.docuparse.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "x-api-key": "YOUR_API_KEY",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Extract tables from https://example.com/report.pdf" }] },\n      skillId: "extract_tables",\n    },\n    id: "1",\n  }),\n});\nconsole.log(await response.json());',
    ],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: false,
    tier: 'free',
  },
  {
    name: 'LeadForge Prospector',
    slug: 'leadforge-prospector',
    description: 'Lead enrichment and scoring agent that finds contacts, enriches company data, and scores prospects in real time.',
    longDescription: [
      'LeadForge Prospector is the go-to A2A agent for sales teams that want to automate their top-of-funnel pipeline. Give it a company name or domain and it returns enriched contact information, firmographic data, and an AI-generated lead score.',
      'The enrich_lead skill cross-references multiple data sources to build a comprehensive profile, including company size, funding stage, tech stack, and recent news. The score_prospect skill uses a proprietary model trained on conversion data from thousands of B2B deals.',
      'This is a premium-tier agent on Switchboard — the integration guide is gated because the setup involves OAuth2 configuration that benefits from our step-by-step walkthrough. The API itself has generous free tier limits (1,000 enrichments/month) and streaming support for real-time scoring in your CRM.',
    ],
    providerName: 'LeadForge',
    providerUrl: 'https://leadforge.example.com',
    version: '2.5.0',
    agentUrl: 'https://api.leadforge.example.com/a2a',
    wellKnownUrl: 'https://leadforge.example.com/.well-known/agent.json',
    categorySlug: 'sales-marketing',
    tags: ['sales', 'leads', 'enrichment', 'crm'],
    skills: [
      { id: 'enrich_lead', name: 'Enrich Lead', description: 'Enrich a lead with company and contact data', inputSchema: { domain: 'string', contactEmail: 'string (optional)' }, outputSchema: { company: 'object', contacts: 'array', enrichedAt: 'string' } },
      { id: 'find_contacts', name: 'Find Contacts', description: 'Find key contacts at a company', inputSchema: { domain: 'string', roles: 'string[] (optional)' }, outputSchema: { contacts: 'array', total: 'number' } },
      { id: 'score_prospect', name: 'Score Prospect', description: 'Score a prospect based on fit and intent signals', inputSchema: { domain: 'string', signals: 'object (optional)' }, outputSchema: { score: 'number', tier: 'string', factors: 'array' } },
    ],
    authType: 'oauth2',
    authInstructions: [
      '1. Register your app at leadforge.example.com/developers',
      '2. Create an OAuth2 application and note the client_id and client_secret',
      '3. Redirect users to https://leadforge.example.com/oauth/authorize?client_id=YOUR_ID&response_type=code&redirect_uri=YOUR_REDIRECT',
      '4. Exchange the authorization code for an access token via POST /oauth/token',
      '5. Use the access token as a Bearer token in your A2A requests',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.leadforge.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Enrich lead: acme.com"}]},"skillId":"enrich_lead"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.leadforge.example.com/a2a",\n    headers={"Authorization": "Bearer YOUR_ACCESS_TOKEN"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Enrich lead: acme.com"}]},\n            "skillId": "enrich_lead"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.leadforge.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer YOUR_ACCESS_TOKEN",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Enrich lead: acme.com" }] },\n      skillId: "enrich_lead",\n    },\n    id: "1",\n  }),\n});\nconsole.log(await response.json());',
    ],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: false,
    tier: 'premium',
  },
  {
    name: 'CodeReview Bot',
    slug: 'codereview-bot',
    description: 'Automated code review agent that analyzes pull requests, suggests fixes, and enforces style guidelines.',
    longDescription: [
      'CodeReview Bot plugs into your development workflow as an A2A agent that reviews code with the nuance of a senior engineer. It understands context, not just syntax — so it flags actual logic issues, not just linting violations.',
      'The review_pr skill accepts a diff or a GitHub PR URL and returns line-by-line comments with severity levels (info, warning, error). The suggest_fixes skill goes further by proposing concrete code changes that you can apply directly. It supports Python, TypeScript, Go, Rust, and Java out of the box.',
      'The streaming mode is genuinely useful here — reviews on large PRs can take 10-15 seconds, and streaming lets you show partial results as they come in. The check_style skill is more basic but fast, covering formatting and naming conventions for quick CI checks.',
    ],
    providerName: 'DevBot Labs',
    providerUrl: 'https://codereviewbot.example.com',
    version: '4.0.2',
    agentUrl: 'https://api.codereviewbot.example.com/a2a',
    wellKnownUrl: 'https://codereviewbot.example.com/.well-known/agent.json',
    categorySlug: 'code-devtools',
    tags: ['code-review', 'ci-cd', 'developer-tools'],
    skills: [
      { id: 'review_pr', name: 'Review PR', description: 'Review a pull request and provide feedback', inputSchema: { diff: 'string', language: 'string (optional)', prUrl: 'string (optional)' }, outputSchema: { comments: 'array', summary: 'string', score: 'number' } },
      { id: 'suggest_fixes', name: 'Suggest Fixes', description: 'Suggest concrete code fixes for issues', inputSchema: { code: 'string', language: 'string', issues: 'string[] (optional)' }, outputSchema: { suggestions: 'array' } },
      { id: 'check_style', name: 'Check Style', description: 'Verify code style and naming conventions', inputSchema: { code: 'string', language: 'string', styleguide: 'string (optional)' }, outputSchema: { violations: 'array', passed: 'boolean' } },
    ],
    authType: 'bearer',
    authInstructions: [
      '1. Go to codereviewbot.example.com and sign in with GitHub',
      '2. Navigate to Settings → API Access',
      '3. Generate a personal access token',
      '4. Include it as Authorization: Bearer <token> in your requests',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.codereviewbot.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Review this PR: https://github.com/org/repo/pull/42"}]},"skillId":"review_pr"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.codereviewbot.example.com/a2a",\n    headers={"Authorization": "Bearer YOUR_TOKEN"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Review this PR: https://github.com/org/repo/pull/42"}]},\n            "skillId": "review_pr"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.codereviewbot.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer YOUR_TOKEN",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Review this PR: https://github.com/org/repo/pull/42" }] },\n      skillId: "review_pr",\n    },\n    id: "1",\n  }),\n});\nconsole.log(await response.json());',
    ],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: false,
    tier: 'free',
  },
  {
    name: 'ComplianceGuard',
    slug: 'complianceguard',
    description: 'Regulatory compliance checking agent that reviews contracts and flags risks against GDPR, SOC2, and HIPAA.',
    longDescription: [
      'ComplianceGuard is built for legal and compliance teams who need to review documents at scale. It understands regulatory frameworks (GDPR, SOC2, HIPAA, PCI-DSS) and can flag potential violations in contracts, policies, and technical documentation.',
      'The review_contract skill is the primary workhorse — feed it a contract and a target regulation, and it returns a detailed risk assessment with specific clause references and suggested remediation language. The flag_risks skill does a broader scan across multiple regulations simultaneously.',
      'Accuracy is good but not perfect — treat it as a first pass that catches 80% of issues, not a replacement for legal review. The agent is particularly strong on data protection clauses and access control requirements, but less reliable on jurisdiction-specific nuances.',
    ],
    providerName: 'ComplianceGuard Inc.',
    providerUrl: 'https://complianceguard.example.com',
    version: '1.8.0',
    agentUrl: 'https://api.complianceguard.example.com/a2a',
    wellKnownUrl: 'https://complianceguard.example.com/.well-known/agent.json',
    categorySlug: 'legal',
    tags: ['compliance', 'legal', 'gdpr', 'contracts'],
    skills: [
      { id: 'check_regulation', name: 'Check Regulation', description: 'Check text against a specific regulation', inputSchema: { text: 'string', regulation: 'string (gdpr|soc2|hipaa|pci-dss)' }, outputSchema: { compliant: 'boolean', issues: 'array', score: 'number' } },
      { id: 'review_contract', name: 'Review Contract', description: 'Review a contract for regulatory compliance', inputSchema: { documentUrl: 'string', regulations: 'string[]' }, outputSchema: { risks: 'array', summary: 'string', overallRisk: 'string' } },
      { id: 'flag_risks', name: 'Flag Risks', description: 'Scan text for potential compliance risks', inputSchema: { text: 'string' }, outputSchema: { flags: 'array', riskLevel: 'string' } },
    ],
    authType: 'apiKey',
    authInstructions: [
      '1. Request access at complianceguard.example.com/access',
      '2. Once approved, go to Dashboard → API Keys',
      '3. Create a new key with appropriate scopes',
      '4. Pass it as x-api-key header',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.complianceguard.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Check this text for GDPR compliance: We store user emails indefinitely."}]},"skillId":"check_regulation"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.complianceguard.example.com/a2a",\n    headers={"x-api-key": "YOUR_API_KEY"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Check GDPR compliance: We store user emails indefinitely."}]},\n            "skillId": "check_regulation"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.complianceguard.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "x-api-key": "YOUR_API_KEY",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Check GDPR compliance: We store user emails indefinitely." }] },\n      skillId: "check_regulation",\n    },\n    id: "1",\n  }),\n});\nconsole.log(await response.json());',
    ],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: false,
    tier: 'free',
  },
  {
    name: 'DataPipe ETL',
    slug: 'datapipe-etl',
    description: 'Data transformation pipeline agent that converts, merges, and validates datasets across CSV, JSON, and Parquet.',
    longDescription: [
      'DataPipe ETL handles the unglamorous but essential work of moving data between formats and systems. It excels at CSV-to-JSON transformations, dataset merging, and schema validation — all through simple A2A messages.',
      'The transform_csv skill supports complex operations like column mapping, type coercion, and conditional filtering. The merge_datasets skill can join datasets on shared keys with configurable join types (inner, left, right, full). Output formats include CSV, JSON, and Parquet.',
      'The validate_schema skill is worth calling before any transformation — it catches type mismatches and missing required fields early, saving you from cryptic errors downstream. Rate limits are generous (100 requests/minute) and there\'s no file size limit on the agent side, though very large datasets (100MB+) may time out.',
    ],
    providerName: 'DataPipe Systems',
    providerUrl: 'https://datapipe.example.com',
    version: '1.5.0',
    agentUrl: 'https://api.datapipe.example.com/a2a',
    wellKnownUrl: 'https://datapipe.example.com/.well-known/agent.json',
    categorySlug: 'data-analytics',
    tags: ['etl', 'data-pipeline', 'csv', 'transformation'],
    skills: [
      { id: 'transform_csv', name: 'Transform CSV', description: 'Transform CSV data with column mapping and filtering', inputSchema: { dataUrl: 'string', mappings: 'object', filters: 'object (optional)', outputFormat: 'string' }, outputSchema: { resultUrl: 'string', rowCount: 'number', columns: 'string[]' } },
      { id: 'merge_datasets', name: 'Merge Datasets', description: 'Merge two datasets on a shared key', inputSchema: { leftUrl: 'string', rightUrl: 'string', joinKey: 'string', joinType: 'string' }, outputSchema: { resultUrl: 'string', rowCount: 'number', matchedRows: 'number' } },
      { id: 'validate_schema', name: 'Validate Schema', description: 'Validate dataset against a JSON schema', inputSchema: { dataUrl: 'string', schema: 'object' }, outputSchema: { valid: 'boolean', errors: 'array', rowsChecked: 'number' } },
    ],
    authType: 'apiKey',
    authInstructions: [
      '1. Sign up at datapipe.example.com',
      '2. Go to Account → Developer Settings',
      '3. Create an API key',
      '4. Pass it as x-api-key header in your requests',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.datapipe.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Validate this CSV against schema: https://example.com/data.csv"}]},"skillId":"validate_schema"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.datapipe.example.com/a2a",\n    headers={"x-api-key": "YOUR_API_KEY"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Transform CSV at https://example.com/data.csv"}]},\n            "skillId": "transform_csv"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.datapipe.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "x-api-key": "YOUR_API_KEY",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Transform CSV at https://example.com/data.csv" }] },\n      skillId: "transform_csv",\n    },\n    id: "1",\n  }),\n});\nconsole.log(await response.json());',
    ],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: false,
    tier: 'free',
  },
  {
    name: 'ScheduleSync',
    slug: 'schedulesync',
    description: 'Calendar coordination agent that finds open slots, books meetings, and syncs across Google and Outlook calendars.',
    longDescription: [
      'ScheduleSync takes the pain out of multi-party scheduling. Connect it to Google Calendar or Outlook and it will find mutually available slots, propose meeting times, and book events — all through A2A messages from your workflow agents.',
      'The find_slot skill is the core value proposition. Give it a list of participants and constraints (duration, timezone, business hours only, etc.) and it returns ranked time slots based on participant preferences and calendar density. The book_meeting skill handles the actual event creation with calendar invites.',
      'OAuth2 setup is required since it needs calendar access, but the scopes are minimal (read/write calendar events). The sync_calendars skill is useful for keeping a shared team calendar in sync with individual calendars, though it\'s best run on a schedule rather than ad-hoc.',
    ],
    providerName: 'SyncLabs',
    providerUrl: 'https://schedulesync.example.com',
    version: '1.0.3',
    agentUrl: 'https://api.schedulesync.example.com/a2a',
    wellKnownUrl: 'https://schedulesync.example.com/.well-known/agent.json',
    categorySlug: 'scheduling',
    tags: ['calendar', 'scheduling', 'meetings', 'productivity'],
    skills: [
      { id: 'find_slot', name: 'Find Slot', description: 'Find available meeting slots for multiple participants', inputSchema: { participants: 'string[]', duration: 'number (minutes)', timeRange: 'object', timezone: 'string' }, outputSchema: { slots: 'array', bestSlot: 'object' } },
      { id: 'book_meeting', name: 'Book Meeting', description: 'Book a meeting and send calendar invites', inputSchema: { title: 'string', participants: 'string[]', startTime: 'string', duration: 'number', description: 'string (optional)' }, outputSchema: { eventId: 'string', calendarLink: 'string', invitesSent: 'number' } },
      { id: 'sync_calendars', name: 'Sync Calendars', description: 'Sync events between calendar providers', inputSchema: { sourceCalendar: 'string', targetCalendar: 'string', syncWindow: 'object' }, outputSchema: { synced: 'number', conflicts: 'array' } },
    ],
    authType: 'oauth2',
    authInstructions: [
      '1. Register at schedulesync.example.com/developers',
      '2. Create an OAuth2 app with calendar scopes',
      '3. Implement the OAuth2 authorization flow to get user consent',
      '4. Exchange the code for access/refresh tokens',
      '5. Pass the access token as Bearer in your A2A requests',
    ],
    integrationGuide: [
      'cURL:\ncurl -X POST https://api.schedulesync.example.com/a2a \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\\n  -d \'{"jsonrpc":"2.0","method":"tasks/send","params":{"id":"task-1","message":{"role":"user","parts":[{"type":"text","text":"Find a 30-minute slot for alice@co.com and bob@co.com this week"}]},"skillId":"find_slot"},"id":"1"}\'',
      'Python:\nimport requests\n\nresponse = requests.post(\n    "https://api.schedulesync.example.com/a2a",\n    headers={"Authorization": "Bearer YOUR_ACCESS_TOKEN"},\n    json={\n        "jsonrpc": "2.0",\n        "method": "tasks/send",\n        "params": {\n            "id": "task-1",\n            "message": {"role": "user", "parts": [{"type": "text", "text": "Find a 30-min slot for alice@co.com and bob@co.com"}]},\n            "skillId": "find_slot"\n        },\n        "id": "1"\n    }\n)\nprint(response.json())',
      'TypeScript:\nconst response = await fetch("https://api.schedulesync.example.com/a2a", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": "Bearer YOUR_ACCESS_TOKEN",\n  },\n  body: JSON.stringify({\n    jsonrpc: "2.0",\n    method: "tasks/send",\n    params: {\n      id: "task-1",\n      message: { role: "user", parts: [{ type: "text", text: "Find a 30-min slot for alice@co.com and bob@co.com" }] },\n      skillId: "find_slot",\n    },\n    id: "1",\n  }),\n});\nconsole.log(await response.json());',
    ],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: false,
    tier: 'free',
  },
];

const SITE_SETTINGS = {
  siteName: 'Agent Switchboard',
  tagline: 'Where agents find agents.',
  heroSubtitle:
    'The curated directory of A2A protocol agents. Browse, compare, and integrate agents with editorial reviews, code examples, and verified listings.',
  footerText: '© 2026 Agent Switchboard. The curated A2A agent directory.',
  advertiseUrl: 'mailto:hello@agentswitchboard.dev',
  premiumPriceMonthly: 15,
  premiumCheckoutUrl: '',
};

// ── Main Seed Logic ─────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createOrUpdateContentType(id: string, definition: any) {
  try {
    const existing = await cma(`/content_types/${id}`);
    // Update
    const updated = await cmaPut(`/content_types/${id}`, {
      ...definition,
      sys: undefined,
    }, existing.sys.version);
    // Publish
    await cmaPut(`/content_types/${id}/published`, {}, updated.sys.version);
    return updated;
  } catch {
    // Create
    const created = await cmaPut(`/content_types/${id}`, definition);
    // Publish
    await cmaPut(`/content_types/${id}/published`, {}, created.sys.version);
    return created;
  }
}

async function createEntry(contentTypeId: string, fields: any) {
  const entry = await cma(`/entries`, {
    method: 'POST',
    body: { fields },
  });
  // We need to set the content type via the X-Contentful-Content-Type header
  // Let's use a different approach
  return entry;
}

async function createEntryWithType(contentTypeId: string, fields: any) {
  const url = `${BASE}/entries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MGMT_TOKEN}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      'X-Contentful-Content-Type': contentTypeId,
    },
    body: JSON.stringify({ fields }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Create entry ${contentTypeId} → ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

async function publishEntry(entryId: string, version: number) {
  await cmaPut(`/entries/${entryId}/published`, {}, version);
}

async function searchEntries(contentTypeId: string, query: string): Promise<any> {
  return cma(`/entries?content_type=${contentTypeId}&${query}&limit=1`);
}

async function main() {
  console.log('🚀 Starting Contentful seed...\n');

  // Quick access test
  try {
    await cma('/content_types?limit=1');
  } catch (e: any) {
    console.error('Cannot access Contentful space. Check your SPACE_ID and MANAGEMENT_TOKEN.');
    console.error(e.message);
    process.exit(1);
  }

  // ── Step 1: Create content types ────────────────────────────────

  console.log('📦 Creating content types...');

  await createOrUpdateContentType('category', CATEGORY_CONTENT_TYPE);
  console.log('  ✅ category');

  await createOrUpdateContentType('agent', AGENT_CONTENT_TYPE);
  console.log('  ✅ agent');

  await createOrUpdateContentType('siteSettings', SITE_SETTINGS_CONTENT_TYPE);
  console.log('  ✅ siteSettings\n');

  // ── Step 2: Create categories ───────────────────────────────────

  console.log('📂 Creating categories...');
  const categoryMap: Record<string, string> = {}; // slug → entry ID

  for (const cat of CATEGORIES) {
    const existing = await searchEntries('category', `fields.slug=${cat.slug}`);

    if (existing.items.length > 0) {
      categoryMap[cat.slug] = existing.items[0].sys.id;
      console.log(`  ⏭ ${cat.name} (exists)`);
      continue;
    }

    const entry = await createEntryWithType('category', {
      name: { 'en-US': cat.name },
      slug: { 'en-US': cat.slug },
      description: { 'en-US': `Agents focused on ${cat.name.toLowerCase()}.` },
      icon: { 'en-US': cat.icon },
      sortOrder: { 'en-US': cat.sortOrder },
    });
    await publishEntry(entry.sys.id, entry.sys.version);
    categoryMap[cat.slug] = entry.sys.id;
    console.log(`  ✅ ${cat.name}`);
    await sleep(200);
  }
  console.log();

  // ── Step 3: Create agents ───────────────────────────────────────

  console.log('🤖 Creating agents...');

  for (const agent of AGENTS) {
    const existing = await searchEntries('agent', `fields.slug=${agent.slug}`);

    if (existing.items.length > 0) {
      console.log(`  ⏭ ${agent.name} (exists)`);
      continue;
    }

    const catId = categoryMap[agent.categorySlug];
    if (!catId) {
      console.error(`  ❌ ${agent.name}: category "${agent.categorySlug}" not found`);
      continue;
    }

    const agentCardJsonStr = agentCard({
      name: agent.name,
      description: agent.description,
      agentUrl: agent.agentUrl,
      skills: agent.skills,
      authType: agent.authType,
      streaming: agent.supportsStreaming,
    });

    const fields: Record<string, any> = {
      name: { 'en-US': agent.name },
      slug: { 'en-US': agent.slug },
      description: { 'en-US': agent.description },
      longDescription: { 'en-US': richText(agent.longDescription) },
      providerName: { 'en-US': agent.providerName },
      providerUrl: { 'en-US': agent.providerUrl },
      version: { 'en-US': agent.version },
      agentUrl: { 'en-US': agent.agentUrl },
      wellKnownUrl: { 'en-US': agent.wellKnownUrl },
      agentCardJson: { 'en-US': agentCardJsonStr },
      categories: {
        'en-US': [{ sys: { type: 'Link', linkType: 'Entry', id: catId } }],
      },
      tags: { 'en-US': agent.tags },
      skills: { 'en-US': agent.skills },
      authType: { 'en-US': agent.authType },
      authInstructions: { 'en-US': richText(agent.authInstructions) },
      integrationGuide: { 'en-US': richText(agent.integrationGuide) },
      supportsStreaming: { 'en-US': agent.supportsStreaming },
      supportsPushNotifications: { 'en-US': agent.supportsPushNotifications },
      status: { 'en-US': 'published' },
      featured: { 'en-US': agent.featured },
      verified: { 'en-US': agent.verified },
      tier: { 'en-US': agent.tier },
      discoveredBy: { 'en-US': 'manual' },
    };

    if (agent.featuredUntil) {
      fields.featuredUntil = { 'en-US': agent.featuredUntil };
    }
    if (agent.sponsorLabel) {
      fields.sponsorLabel = { 'en-US': agent.sponsorLabel };
    }

    const entry = await createEntryWithType('agent', fields);
    await publishEntry(entry.sys.id, entry.sys.version);
    console.log(`  ✅ ${agent.name}`);
    await sleep(300);
  }
  console.log();

  // ── Step 4: Create site settings ────────────────────────────────

  console.log('⚙️  Creating site settings...');

  const existingSettings = await searchEntries('siteSettings', '');

  if (existingSettings.items.length > 0) {
    console.log('  ⏭ Site settings already exist');
  } else {
    const entry = await createEntryWithType('siteSettings', {
      siteName: { 'en-US': SITE_SETTINGS.siteName },
      tagline: { 'en-US': SITE_SETTINGS.tagline },
      heroSubtitle: { 'en-US': SITE_SETTINGS.heroSubtitle },
      footerText: { 'en-US': SITE_SETTINGS.footerText },
      advertiseUrl: { 'en-US': SITE_SETTINGS.advertiseUrl },
      premiumPriceMonthly: { 'en-US': SITE_SETTINGS.premiumPriceMonthly },
      premiumCheckoutUrl: { 'en-US': SITE_SETTINGS.premiumCheckoutUrl },
    });
    await publishEntry(entry.sys.id, entry.sys.version);
    console.log('  ✅ Site settings created');
  }

  console.log('\n🎉 Seed complete!');
  console.log(`   Categories: ${Object.keys(categoryMap).length}`);
  console.log(`   Agents: ${AGENTS.length}`);
  console.log(`   Site settings: 1`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
