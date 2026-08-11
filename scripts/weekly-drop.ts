/**
 * Weekly Drop — canonical script for adding new agents discovered via Mode A or Mode B.
 *
 * GIT-AS-CMS: agents are files in content/agents/<slug>.json. This script
 * writes those files — publishing happens when the commit deploys.
 *
 * Usage:
 *   1. Paste agents into AGENTS_TO_ADD below
 *   2. npx tsx scripts/weekly-drop.ts        (writes content/agents/*.json)
 *   3. npx tsx scripts/validate-content.ts   (CI runs this too)
 *   4. Commit content/ + this file: "Weekly drop [DATE]: added [x] agents"
 *   5. Clear AGENTS_TO_ADD, commit: "chore: clear weekly-drop after [DATE] run"
 *
 * Skills format: { id, name (2-4 words), description (80-150 chars, verb-first) }
 * Description hard limit: 200 chars
 * Access methods: 'api' | 'mcp' | 'cli' | 'browser-extension'
 * Auth types: 'apiKey' | 'oauth2' | 'bearer' | 'none'
 * Valid category slugs: content/categories.json (or `npx tsx scripts/cms.ts categories`)
 */

import * as fs from 'fs';
import * as path from 'path';
import { appendChangelog } from './lib/changelog';

// ─── AGENTS TO ADD — edit this array, run, commit, then clear ────────────────
const _AGENTS_ADDED_2026_06_15_SENTRY: AgentInput[] = [
  {
    name: 'Sentry MCP',
    slug: 'sentry-mcp',
    description: 'Official Sentry remote MCP server — pull issues, traces, and AI root-cause analysis into any coding agent. Works with Claude Code, Cursor, VS Code, Codex, Gemini CLI, and more.',
    providerName: 'Sentry',
    providerUrl: 'https://sentry.io',
    agentUrl: 'https://mcp.sentry.dev',
    categories: ['code-devtools', 'infrastructure'],
    tags: ['error-monitoring', 'debugging', 'traces', 'root-cause-analysis', 'sentry', 'oauth2', 'remote-mcp'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'issue-lookup', name: 'Issue Lookup', description: 'Fetches Sentry issues by URL, ID, or query, returning full error details, stack traces, and event context.' },
      { id: 'trace-analysis', name: 'Trace Analysis', description: 'Retrieves distributed traces and span data to identify performance bottlenecks and error propagation paths.' },
      { id: 'root-cause-analysis', name: 'Root Cause Analysis', description: "Runs Sentry's Seer AI engine on an issue to pinpoint the root cause and surface suggested fixes." },
    ],
  },
];
const _AGENTS_ADDED_2026_08_10_SWEEP: AgentInput[] = [
  // ── Tier A — major catalog gaps ──────────────────────────────────────────
  {
    name: 'LangChain',
    slug: 'langchain',
    description: 'Framework for building LLM applications and agents, with composable chains, tool calling, retrieval, and a large integration ecosystem across Python and JavaScript.',
    providerName: 'LangChain',
    providerUrl: 'https://www.langchain.com',
    agentUrl: 'https://python.langchain.com',
    categories: ['orchestration', 'code-devtools'],
    tags: ['llm-framework', 'chains', 'retrieval', 'python', 'typescript', 'tool-calling'],
    authType: 'none',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Claude Code',
    slug: 'claude-code',
    description: "Anthropic's agentic coding tool that runs in the terminal, reads and edits codebases, executes commands, and connects to MCP servers.",
    providerName: 'Anthropic',
    providerUrl: 'https://www.anthropic.com',
    agentUrl: 'https://claude.com/product/claude-code',
    categories: ['code-devtools', 'orchestration'],
    tags: ['coding-assistant', 'terminal', 'mcp-client', 'anthropic', 'claude'],
    authType: 'oauth2',
    accessMethods: ['cli', 'api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Docker Sandboxes',
    slug: 'docker-sandboxes',
    description: 'Disposable, isolated container sandboxes for running untrusted agent-generated code, with filesystem and network isolation managed by Docker.',
    providerName: 'Docker',
    providerUrl: 'https://www.docker.com',
    agentUrl: 'https://www.docker.com/products/docker-sandboxes/',
    categories: ['infrastructure', 'security'],
    tags: ['sandboxing', 'containers', 'code-execution', 'isolation', 'docker'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Smithery',
    slug: 'smithery',
    description: 'MCP registry and hosted gateway with 14,000+ servers, handling OAuth flows, credential injection, and session reuse across agent runtimes.',
    providerName: 'Arcade.dev',
    providerUrl: 'https://smithery.ai',
    agentUrl: 'https://smithery.ai/docs',
    categories: ['orchestration', 'infrastructure'],
    tags: ['mcp-registry', 'hosted-mcp', 'credential-management', 'oauth', 'arcade'],
    authType: 'oauth2',
    accessMethods: ['api', 'cli', 'mcp'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Glama',
    slug: 'glama',
    description: 'MCP server directory with a public paginated JSON API for programmatic discovery, plus hosting and inspection tooling for MCP servers.',
    providerName: 'Glama',
    providerUrl: 'https://glama.ai',
    agentUrl: 'https://glama.ai/mcp/servers',
    categories: ['research', 'infrastructure'],
    tags: ['mcp-registry', 'server-discovery', 'json-api', 'glama'],
    authType: 'none',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'OpenBB',
    slug: 'openbb',
    description: 'Open-source financial data platform for analysts, quants, and agents, unifying market, fundamental, and economic data behind one Python SDK and REST API.',
    providerName: 'OpenBB',
    providerUrl: 'https://openbb.co',
    agentUrl: 'https://docs.openbb.co',
    categories: ['finance', 'data-analytics'],
    tags: ['market-data', 'quantitative-research', 'financial-data', 'python-sdk'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'UI-TARS Desktop',
    slug: 'ui-tars-desktop',
    description: "ByteDance's multimodal GUI agent stack that controls desktop and browser interfaces from natural language using vision-based grounding.",
    providerName: 'ByteDance',
    providerUrl: 'https://github.com/bytedance',
    agentUrl: 'https://github.com/bytedance/UI-TARS-desktop',
    categories: ['browser-computer'],
    tags: ['gui-automation', 'computer-use', 'multimodal', 'desktop-control', 'bytedance'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },

  // ── Tier B — inference and API layer ─────────────────────────────────────
  {
    name: 'OpenRouter',
    slug: 'openrouter',
    description: 'Unified API gateway routing requests across hundreds of language models from many providers, with automatic fallback, cost routing, and one OpenAI-compatible interface.',
    providerName: 'OpenRouter',
    providerUrl: 'https://openrouter.ai',
    agentUrl: 'https://openrouter.ai/docs',
    categories: ['language', 'infrastructure'],
    tags: ['model-routing', 'llm-gateway', 'unified-api', 'fallback-routing'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Groq',
    slug: 'groq',
    description: 'Low-latency inference API running open models on custom LPU hardware, with an OpenAI-compatible interface and tool-calling support.',
    providerName: 'Groq',
    providerUrl: 'https://groq.com',
    agentUrl: 'https://console.groq.com/docs',
    categories: ['language', 'infrastructure'],
    tags: ['fast-inference', 'lpu', 'low-latency', 'openai-compatible'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Together AI',
    slug: 'together-ai',
    description: 'Inference and fine-tuning platform for open models, offering serverless endpoints, dedicated GPU clusters, and an OpenAI-compatible API.',
    providerName: 'Together AI',
    providerUrl: 'https://www.together.ai',
    agentUrl: 'https://docs.together.ai',
    categories: ['language', 'infrastructure'],
    tags: ['inference', 'fine-tuning', 'open-models', 'gpu-cloud'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Fireworks AI',
    slug: 'fireworks-ai',
    description: 'Production inference platform for open models with fast function calling, structured output, and fine-tuning behind an OpenAI-compatible API.',
    providerName: 'Fireworks AI',
    providerUrl: 'https://fireworks.ai',
    agentUrl: 'https://docs.fireworks.ai',
    categories: ['language', 'infrastructure'],
    tags: ['inference', 'function-calling', 'structured-output', 'open-models'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Modal',
    slug: 'modal',
    description: 'Serverless cloud for running Python functions, GPU workloads, and sandboxed agent code, defined in code and deployed without managing infrastructure.',
    providerName: 'Modal',
    providerUrl: 'https://modal.com',
    agentUrl: 'https://modal.com/docs',
    categories: ['infrastructure'],
    tags: ['serverless', 'gpu-compute', 'sandboxed-execution', 'python'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Deepgram',
    slug: 'deepgram',
    description: 'Speech-to-text and voice AI API with real-time streaming transcription, speaker diarization, and text-to-speech for voice agents.',
    providerName: 'Deepgram',
    providerUrl: 'https://deepgram.com',
    agentUrl: 'https://developers.deepgram.com',
    categories: ['voice-messaging'],
    tags: ['speech-to-text', 'transcription', 'real-time-audio', 'diarization'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'AssemblyAI',
    slug: 'assemblyai',
    description: 'Speech recognition API with real-time and batch transcription plus audio intelligence models for summarization, topic detection, and redaction.',
    providerName: 'AssemblyAI',
    providerUrl: 'https://www.assemblyai.com',
    agentUrl: 'https://www.assemblyai.com/docs',
    categories: ['voice-messaging'],
    tags: ['speech-to-text', 'audio-intelligence', 'transcription', 'summarization'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Serper',
    slug: 'serper',
    description: 'Fast Google search API returning structured SERP results, widely used to give agents fresh web results without scraping.',
    providerName: 'Serper',
    providerUrl: 'https://serper.dev',
    agentUrl: 'https://serper.dev/playground',
    categories: ['research'],
    tags: ['search-api', 'google-search', 'serp', 'web-results'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Inngest',
    slug: 'inngest',
    description: 'Durable execution platform for event-driven and long-running agent workflows, with automatic retries, step functions, and concurrency control.',
    providerName: 'Inngest',
    providerUrl: 'https://www.inngest.com',
    agentUrl: 'https://www.inngest.com/docs',
    categories: ['orchestration', 'infrastructure'],
    tags: ['durable-workflows', 'event-driven', 'retries', 'step-functions'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: true,
  },

  // ── Tier C — official first-party MCP servers ────────────────────────────
  {
    name: 'Elasticsearch MCP Server',
    slug: 'elasticsearch-mcp',
    description: 'Official Elastic MCP server letting agents query Elasticsearch indices, run search and aggregations, and inspect mappings in natural language.',
    providerName: 'Elastic',
    providerUrl: 'https://www.elastic.co',
    agentUrl: 'https://github.com/elastic/mcp-server-elasticsearch',
    categories: ['vector-databases', 'data-analytics'],
    tags: ['elasticsearch', 'search', 'vector-search', 'official-mcp', 'elastic'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Webflow MCP Server',
    slug: 'webflow-mcp',
    description: 'Official Webflow MCP server for reading and updating site content, CMS collections, and page structure from an AI agent.',
    providerName: 'Webflow',
    providerUrl: 'https://webflow.com',
    agentUrl: 'https://developers.webflow.com/data/docs/ai-tools',
    categories: ['content-media', 'code-devtools'],
    tags: ['webflow', 'cms', 'site-builder', 'official-mcp'],
    authType: 'oauth2',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Netlify MCP Server',
    slug: 'netlify-mcp',
    description: 'Official Netlify MCP server that lets agents create sites, trigger deploys, manage environment variables, and inspect build logs.',
    providerName: 'Netlify',
    providerUrl: 'https://www.netlify.com',
    agentUrl: 'https://docs.netlify.com/build/build-with-ai/netlify-mcp-server/',
    categories: ['infrastructure', 'code-devtools'],
    tags: ['netlify', 'deployment', 'hosting', 'official-mcp'],
    authType: 'oauth2',
    accessMethods: ['mcp', 'api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },

  // ── Tier D — Mode A launches inside the 10-day window ────────────────────
  {
    name: 'Medplum',
    slug: 'medplum',
    description: 'Open-source healthcare developer platform providing a FHIR-native backend, API, and SDK for building compliant clinical applications and agents.',
    providerName: 'Medplum',
    providerUrl: 'https://www.medplum.com',
    agentUrl: 'https://www.medplum.com/docs',
    categories: ['infrastructure', 'data-analytics'],
    tags: ['healthcare', 'fhir', 'ehr', 'compliance', 'open-source'],
    authType: 'oauth2',
    accessMethods: ['api', 'cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: true,
  },
  {
    name: 'Cloudflare OS',
    slug: 'cloudflare-os',
    description: 'Cloudflare platform for running agents, apps, and background work on the edge network, with integrated compute, storage, and identity primitives.',
    providerName: 'Cloudflare',
    providerUrl: 'https://www.cloudflare.com',
    agentUrl: 'https://blog.cloudflare.com/cloudflare-os/',
    categories: ['infrastructure', 'orchestration'],
    tags: ['edge-compute', 'cloudflare', 'agent-platform', 'serverless'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Kitesurf',
    slug: 'kitesurf',
    description: 'Agent-first browser from Cloudflare that runs pages inside V8 isolates, giving agents fast, cheap, sandboxed web browsing at the edge.',
    providerName: 'Cloudflare',
    providerUrl: 'https://www.cloudflare.com',
    agentUrl: 'https://blog.cloudflare.com/kitesurf/',
    categories: ['browser-computer'],
    tags: ['headless-browser', 'v8-isolates', 'cloudflare', 'web-browsing'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'qm',
    slug: 'qm',
    description: 'Multiplayer agent harness for coordinating several coding agents on shared work, with run isolation and a common queue.',
    providerName: 'YC Software',
    providerUrl: 'https://github.com/yc-software',
    agentUrl: 'https://github.com/yc-software/qm',
    categories: ['orchestration', 'code-devtools'],
    tags: ['agent-harness', 'multiplayer', 'coordination', 'open-source'],
    authType: 'none',
    accessMethods: ['cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'OpenChamber',
    slug: 'openchamber',
    description: 'Agentic development environment that gives coding agents a persistent workspace, tool access, and review surfaces around their runs.',
    providerName: 'OpenChamber',
    providerUrl: 'https://openchamber.dev',
    agentUrl: 'https://openchamber.dev',
    categories: ['code-devtools', 'orchestration'],
    tags: ['development-environment', 'agentic-ide', 'workspace'],
    authType: 'none',
    accessMethods: ['cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Ante',
    slug: 'ante',
    description: 'Coding agent shipped as a single binary that runs fully offline against local models, with no runtime or package manager required.',
    providerName: 'Antigma Labs',
    providerUrl: 'https://github.com/AntigmaLabs',
    agentUrl: 'https://github.com/AntigmaLabs/ante',
    categories: ['code-devtools'],
    tags: ['coding-assistant', 'offline', 'single-binary', 'local-models'],
    authType: 'none',
    accessMethods: ['cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Nightcrawler',
    slug: 'nightcrawler',
    description: 'Local AI pentesting agent that runs reconnaissance and vulnerability probing from your own hardware without sending scope data to a cloud service.',
    providerName: 'Garage HQ',
    providerUrl: 'https://github.com/garagehq',
    agentUrl: 'https://github.com/garagehq/nightcrawler',
    categories: ['security'],
    tags: ['penetration-testing', 'offensive-security', 'local-first', 'reconnaissance'],
    authType: 'none',
    accessMethods: ['cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Channels SDK',
    slug: 'channels-sdk',
    description: 'SDK from CopilotKit for exposing any agent through chat surfaces like Slack and Microsoft Teams without rewriting the agent per channel.',
    providerName: 'CopilotKit',
    providerUrl: 'https://www.copilotkit.ai',
    agentUrl: 'https://github.com/CopilotKit/channels-sdk',
    categories: ['communication', 'orchestration'],
    tags: ['slack', 'microsoft-teams', 'chat-integration', 'copilotkit'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: true,
  },
  {
    name: 'Mu',
    slug: 'mu-tools',
    description: 'Lightweight toolkit giving agents a standard set of callable tools and a small server to host them, written in Go.',
    providerName: 'Micro',
    providerUrl: 'https://github.com/micro',
    agentUrl: 'https://github.com/micro/mu',
    categories: ['orchestration', 'code-devtools'],
    tags: ['agent-tooling', 'golang', 'tool-server', 'open-source'],
    authType: 'none',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Needle2',
    slug: 'needle2',
    description: 'Compact 14MB agentic language model from Cactus Compute built to run on phones, wearables, and smart home hardware without a network round trip.',
    providerName: 'Cactus Compute',
    providerUrl: 'https://cactuscompute.com',
    agentUrl: 'https://cactuscompute.com/needle',
    categories: ['language'],
    tags: ['on-device', 'edge-inference', 'small-model', 'wearables'],
    authType: 'none',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'HyperProbe',
    slug: 'hyperprobe',
    description: 'Agents that perform read-only production debugging, tracing failures across services without mutating state. Y Combinator S26.',
    providerName: 'HyperProbe',
    providerUrl: 'https://www.hyperprobe.co',
    agentUrl: 'https://www.hyperprobe.co',
    categories: ['code-devtools', 'infrastructure'],
    tags: ['debugging', 'read-only', 'observability', 'incident-response'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Armature',
    slug: 'armature',
    description: 'Product analytics and evaluation for agent sessions running against MCP servers, tracking tool calls, failures, and per-session outcomes.',
    providerName: 'Armature',
    providerUrl: 'https://armature.tech',
    agentUrl: 'https://armature.tech',
    categories: ['data-analytics', 'code-devtools'],
    tags: ['agent-analytics', 'evaluations', 'session-tracking', 'mcp-observability'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Prime Agent',
    slug: 'prime-agent',
    description: 'Self-improving reinforcement-learned agent from Prime Intellect that refines its own policy across long-horizon tasks.',
    providerName: 'Prime Intellect',
    providerUrl: 'https://www.primeintellect.ai',
    agentUrl: 'https://www.primeintellect.ai/blog/prime-agent',
    categories: ['research', 'orchestration'],
    tags: ['self-improving', 'reinforcement-learning', 'long-horizon', 'prime-intellect'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'LocalCan',
    slug: 'localcan',
    description: 'Gives agents public tunnel URLs for localhost with live HTTP traffic inspection, snapshot publishing, and access control on Mac, Windows, and Linux.',
    providerName: 'LocalCan',
    providerUrl: 'https://localcan.com',
    agentUrl: 'https://localcan.com/docs',
    categories: ['infrastructure', 'code-devtools'],
    tags: ['tunneling', 'localhost', 'traffic-inspection', 'webhooks'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Tako',
    slug: 'tako',
    description: 'Live web search plus licensed datasets for agents, covering company financials, macroeconomic indicators, web traffic, and government spending.',
    providerName: 'TakoData',
    providerUrl: 'https://trytako.com',
    agentUrl: 'https://trytako.com',
    categories: ['research', 'data-analytics'],
    tags: ['web-search', 'licensed-data', 'financial-data', 'macroeconomic-data'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Capital.com MCP',
    slug: 'capital-com-mcp',
    description: 'Official MCP server from regulated broker Capital.com exposing market data, instrument search, and account information to AI agents.',
    providerName: 'Capital.com',
    providerUrl: 'https://capital.com',
    agentUrl: 'https://open-api.capital.com',
    categories: ['finance'],
    tags: ['market-data', 'brokerage', 'trading-data', 'official-mcp'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
  },
  {
    name: 'Muumuu Domain MCP',
    slug: 'muumuu-domain-mcp',
    description: 'Official MCP server from GMO Pepabo for searching and registering domains, managing contracts, and configuring DNS records.',
    providerName: 'GMO Pepabo',
    providerUrl: 'https://muumuu-domain.com',
    agentUrl: 'https://muumuu-domain.com',
    categories: ['infrastructure', 'commerce-payments'],
    tags: ['domain-registrar', 'dns', 'japan', 'official-mcp'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Patsnap',
    slug: 'patsnap',
    description: 'Patent and scientific literature search across global databases using natural language, semantic, or keyword queries with structured bibliographic output.',
    providerName: 'Patsnap',
    providerUrl: 'https://www.patsnap.com',
    agentUrl: 'https://www.patsnap.com',
    categories: ['research', 'legal'],
    tags: ['patent-search', 'ip-intelligence', 'literature-search', 'semantic-search'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
  {
    name: 'Nero AI',
    slug: 'nero-ai',
    description: 'Image processing API for upscaling, background removal, photo restoration, colorization, denoising, and compression.',
    providerName: 'Nero',
    providerUrl: 'https://nero.com',
    agentUrl: 'https://ai.nero.com/developer',
    categories: ['content-media'],
    tags: ['image-processing', 'upscaling', 'background-removal', 'photo-restoration'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
  },
];

const AGENTS_TO_ADD: AgentInput[] = [
  // Paste agents here from the Weekly Drop prompt.
  // Each run skips agents whose content/agents/<slug>.json already exists.
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
  wellKnownUrl?: string;
  skills?: AgentSkill[];
}

const CONTENT = path.resolve(process.cwd(), 'content');

function validCategorySlugs(): Set<string> {
  const cats = JSON.parse(fs.readFileSync(path.join(CONTENT, 'categories.json'), 'utf8'));
  return new Set(cats.map((c: { slug: string }) => c.slug));
}

function createAgent(agent: AgentInput, catSlugs: Set<string>): 'created' | 'skipped' | 'error' {
  if (agent.description.length > 200) {
    console.log(`  ❌ ${agent.name}: description too long (${agent.description.length} chars > 200)`);
    return 'error';
  }
  const badCats = agent.categories.filter((c) => !catSlugs.has(c));
  if (badCats.length) {
    console.log(`  ❌ ${agent.name}: unknown categories: ${badCats.join(', ')}`);
    return 'error';
  }

  const file = path.join(CONTENT, 'agents', `${agent.slug}.json`);
  if (fs.existsSync(file)) {
    console.log(`  ⏭  ${agent.name} (${agent.slug}) already exists`);
    return 'skipped';
  }

  const now = new Date().toISOString();
  const record = {
    id: agent.slug,
    name: agent.name,
    slug: agent.slug,
    description: agent.description,
    providerName: agent.providerName,
    providerUrl: agent.providerUrl,
    agentUrl: agent.agentUrl,
    wellKnownUrl: agent.wellKnownUrl ?? undefined,
    categories: agent.categories,
    tags: agent.tags ?? [],
    skills: agent.skills ?? [],
    authType: agent.authType ?? 'apiKey',
    supportsStreaming: agent.supportsStreaming ?? false,
    supportsPushNotifications: agent.supportsPushNotifications ?? false,
    status: 'published',
    featured: agent.featured ?? false,
    verified: agent.verified ?? false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: agent.accessMethods ?? [],
    createdAt: now,
    updatedAt: now,
  };

  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
  appendChangelog({ action: 'added', slug: agent.slug, name: agent.name });
  console.log(`  ✅ ${agent.name}`);
  return 'created';
}

function main() {
  if (AGENTS_TO_ADD.length === 0) {
    console.log('\n📭 AGENTS_TO_ADD is empty — nothing to do.');
    console.log('   Add agents to the array at the top of this file, then re-run.\n');
    return;
  }

  console.log(`\n🚀 Processing ${AGENTS_TO_ADD.length} agent(s)...\n`);
  const catSlugs = validCategorySlugs();

  let created = 0, skipped = 0, errors = 0;
  for (const agent of AGENTS_TO_ADD) {
    const result = createAgent(agent, catSlugs);
    if (result === 'created') created++;
    else if (result === 'skipped') skipped++;
    else errors++;
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
  if (created > 0) {
    console.log('\n📌 Next steps:');
    console.log('   1. npx tsx scripts/validate-content.ts');
    console.log('   2. git add content/ scripts/weekly-drop.ts');
    console.log('   3. git commit -m "Weekly drop [DATE]: added X agents" && git push');
    console.log('   4. Clear AGENTS_TO_ADD and commit "chore: clear weekly-drop after [DATE] run"');
  }
}

main();
