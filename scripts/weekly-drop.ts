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
  // ── Weekly drop May 22, 2026 — Run 2 ────────────────────────────────────────

  // High-star code agents & interpreters
  {
    name: 'Open Interpreter',
    slug: 'open-interpreter',
    description: 'Lets LLMs run Python, JavaScript, and shell commands locally to summarise PDFs, create charts, control files, and browse the web via a natural language interface.',
    providerName: 'Open Interpreter',
    providerUrl: 'https://openinterpreter.com/',
    agentUrl: 'https://openinterpreter.com/',
    categories: ['browser-computer'],
    tags: ['code-interpreter', 'local-execution', 'computer-use', 'file-management', 'web-browsing', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    skills: [
      { id: 'code-run', name: 'Execute Code Locally', description: 'Run LLM-generated Python, JavaScript, or shell commands in the local environment and return output back to the conversation.' },
      { id: 'file-manage', name: 'File and Data Operations', description: 'Read, write, transform, and analyse local files including PDFs, spreadsheets, images, and code repositories via natural language.' },
      { id: 'computer-control', name: 'Computer Control', description: 'Control the local OS — open apps, navigate UIs, manipulate windows — using multimodal model instructions and keyboard/mouse input.' },
    ],
  },
  {
    name: 'PrivateGPT',
    slug: 'private-gpt',
    description: 'Self-hosted document QA platform with OpenAI-compatible REST API, local LLM support via Ollama, a full RAG pipeline, and zero data exfiltration for private environments.',
    providerName: 'Zylon AI',
    providerUrl: 'https://zylon.ai/',
    agentUrl: 'https://privategpt.io/',
    categories: ['research'],
    tags: ['document-qa', 'local-llm', 'rag', 'privacy', 'self-hosted', 'openai-compatible'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    skills: [
      { id: 'private-doc-qa', name: 'Private Document QA', description: 'Answer natural language questions over ingested documents entirely offline with no data leaving the execution environment at any point.' },
      { id: 'document-ingest', name: 'Document Ingest', description: 'Ingest PDFs, text, and other files into the local vector store for retrieval-augmented generation against any configured local LLM.' },
      { id: 'openai-compat-api', name: 'OpenAI-Compatible API', description: 'Expose a drop-in OpenAI API endpoint so existing tools and integrations can switch to local inference without changing code.' },
    ],
  },
  {
    name: 'DeerFlow',
    slug: 'deer-flow',
    description: 'Open-source deep research super-agent from ByteDance that orchestrates sub-agents with memory, code sandboxes, and MCP-configurable tools for long-horizon tasks.',
    providerName: 'ByteDance',
    providerUrl: 'https://bytedance.com/',
    agentUrl: 'https://github.com/bytedance/deer-flow',
    categories: ['research'],
    tags: ['super-agent', 'deep-research', 'multi-agent', 'long-horizon', 'code-generation', 'bytedance'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    skills: [
      { id: 'deep-research', name: 'Deep Research Run', description: 'Orchestrate a multi-step research plan across web search, code execution, and document synthesis into a structured report.' },
      { id: 'spawn-subagents', name: 'Spawn Sub-Agents', description: 'Dynamically create scoped sub-agents with independent tool sets to parallelise complex long-running tasks.' },
      { id: 'mcp-tool-use', name: 'Configure MCP Tools', description: 'Attach and call external MCP servers as tools via the mcp_settings API parameter during active chat sessions.' },
    ],
  },

  // Developer tools
  {
    name: 'Continue',
    slug: 'continue-dev',
    description: 'Open-source AI coding assistant for VS Code and JetBrains with chat, autocomplete, MCP support, and CI-enforceable AI review checks via GitHub status checks.',
    providerName: 'Continue Dev',
    providerUrl: 'https://continue.dev/',
    agentUrl: 'https://continue.dev/',
    categories: ['code-devtools'],
    tags: ['vs-code', 'jetbrains', 'autocomplete', 'code-review', 'local-llm', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    skills: [
      { id: 'code-autocomplete', name: 'In-Editor Autocomplete', description: 'Provide context-aware code completions inside VS Code or JetBrains using any configured LLM provider including local Ollama models.' },
      { id: 'chat-context', name: 'Codebase Chat', description: 'Answer questions and generate edits using full codebase context, selected files, or terminal output scoped to the active project.' },
      { id: 'ci-checks', name: 'CI AI Checks', description: 'Run AI-powered code quality checks on every pull request as GitHub status checks, enforceable in CI pipelines without manual review.' },
    ],
  },
  {
    name: 'ChatDev',
    slug: 'chatdev',
    description: 'Multi-agent platform where LLM agents play software company roles (CEO, CTO, programmer) to collaboratively build runnable software from a single natural language prompt.',
    providerName: 'OpenBMB / Tsinghua University',
    providerUrl: 'https://github.com/OpenBMB',
    agentUrl: 'https://github.com/OpenBMB/ChatDev',
    categories: ['code-devtools'],
    tags: ['software-company', 'multi-agent', 'no-code', 'code-generation', 'yaml-workflow', 'role-playing'],
    authType: 'none',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    skills: [
      { id: 'software-company', name: 'Virtual Software Company', description: 'Assign CEO, CTO, programmer, and tester agent roles that collaborate through a structured pipeline to produce a runnable codebase.' },
      { id: 'yaml-workflow', name: 'YAML Workflow Builder', description: 'Define multi-agent orchestration pipelines via YAML config files without writing Python; includes Blender and Deep Research templates.' },
      { id: 'macnet-orchestrate', name: 'MacNet DAG Orchestration', description: 'Orchestrate thousands of agents in DAG topologies, breaking linear agent-chain constraints for complex multi-agent task flows.' },
    ],
  },
  {
    name: 'GPT-Pilot',
    slug: 'gpt-pilot',
    description: 'AI software developer agent that builds full applications from scratch — specifies requirements, scaffolds architecture, writes code, runs tests, and requests human review.',
    providerName: 'Pythagora',
    providerUrl: 'https://pythagora.ai/',
    agentUrl: 'https://github.com/Pythagora-io/gpt-pilot',
    categories: ['code-devtools'],
    tags: ['software-development', 'vs-code-extension', 'code-generation', 'testing', 'full-stack', 'yc-backed'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    skills: [
      { id: 'app-scaffold', name: 'App Scaffolding', description: 'Generate a full application skeleton from a natural language description, including file structure, dependencies, and initial implementation.' },
      { id: 'iterative-debug', name: 'Iterative Debugging', description: 'Run existing test suites, identify failures, implement fixes, and iterate until tests pass while requesting human review at each stage.' },
      { id: 'multi-llm', name: 'Multi-LLM Support', description: 'Configure OpenAI, Anthropic Claude, Groq, or Azure as the underlying model provider without changing any application code.' },
    ],
  },
  {
    name: 'Devika',
    slug: 'devika',
    description: 'Open-source agentic software engineer that plans multi-step tasks, browses the web for context, and writes coordinated multi-file code from high-level instructions.',
    providerName: 'Stition AI',
    providerUrl: 'https://github.com/stitionai',
    agentUrl: 'https://github.com/stitionai/devika',
    categories: ['code-devtools'],
    tags: ['software-engineering', 'web-browsing', 'code-generation', 'multi-llm', 'step-planner', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    skills: [
      { id: 'task-planning', name: 'Multi-Step Task Planning', description: 'Decompose a high-level objective into ordered research and coding subtasks using the agent planning and reasoning pipeline.' },
      { id: 'web-research', name: 'Autonomous Web Research', description: 'Browse the web to gather documentation, examples, and context needed to complete the assigned coding objective.' },
      { id: 'multi-file-code', name: 'Multi-File Code Generation', description: 'Write and coordinate code across multiple files to produce a complete working implementation of the planned objective.' },
    ],
  },

  // Multi-agent frameworks
  {
    name: 'CAMEL',
    slug: 'camel-ai',
    description: 'Pioneering multi-agent framework for role-playing collaboration, scaling-law research, and MCP server exports with 20+ toolkits and a native MCPAgent class.',
    providerName: 'CAMEL-AI Community',
    providerUrl: 'https://camel-ai.org/',
    agentUrl: 'https://camel-ai.org/',
    categories: ['infrastructure'],
    tags: ['multi-agent', 'role-playing', 'scaling-laws', 'toolkits', 'mcp', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    skills: [
      { id: 'role-play-agent', name: 'Role-Play Collaboration', description: 'Pair a user agent and assistant agent in structured role-playing conversations to solve tasks through principled multi-agent debate.' },
      { id: 'mcp-agent', name: 'MCP Agent Integration', description: 'Instantiate an MCPAgent that reads tools from any MCP server and injects them into the CAMEL agent loop at runtime.' },
      { id: 'toolkit-export', name: 'Export as MCP Server', description: 'Publish any CAMEL toolkit as a callable MCP server via camel-toolkits-mcp for use with Claude, Cursor, or other MCP clients.' },
    ],
  },
  {
    name: 'OWL',
    slug: 'owl-camel',
    description: 'Optimised Workforce Learning multi-agent system ranked #1 open-source on the GAIA benchmark, orchestrating specialised sub-agents with 20+ real-world toolkits.',
    providerName: 'CAMEL-AI Community',
    providerUrl: 'https://camel-ai.org/',
    agentUrl: 'https://github.com/camel-ai/owl',
    categories: ['research'],
    tags: ['multi-agent', 'gaia-benchmark', 'workforce', 'web-browsing', 'code-execution', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    skills: [
      { id: 'web-research', name: 'Web Research Agent', description: 'Deploy a browser-equipped sub-agent to search, navigate, and extract information from the web as part of a larger multi-agent workflow.' },
      { id: 'code-execute', name: 'Sandboxed Code Execution', description: 'Run AI-generated Python code in an isolated execution environment and feed results back into the orchestrating agent loop.' },
      { id: 'workforce-dispatch', name: 'Workforce Dispatch', description: 'Break complex tasks into specialised sub-tasks and assign each to a dedicated agent role with scoped tools and termination conditions.' },
    ],
  },
  {
    name: 'Langroid',
    slug: 'langroid',
    description: 'Lightweight Python multi-agent framework from CMU and UW-Madison where agents are first-class objects with task delegation, vector stores, tool use, and LLM flexibility.',
    providerName: 'Langroid',
    providerUrl: 'https://github.com/langroid/langroid',
    agentUrl: 'https://langroid.github.io/langroid/',
    categories: ['infrastructure'],
    tags: ['multi-agent', 'python', 'task-delegation', 'vector-store', 'llm-agnostic', 'research'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    skills: [
      { id: 'task-delegate', name: 'Agent Task Delegation', description: 'Define agents that delegate sub-tasks to specialised child agents and aggregate results via a principled multi-agent task graph.' },
      { id: 'tool-use', name: 'Agent Tool Use', description: 'Equip agents with typed tools using Pydantic schemas so agents can call functions, APIs, or databases and handle responses in a structured loop.' },
      { id: 'vector-rag', name: 'Vector Store RAG', description: 'Connect agents to built-in vector store support for document retrieval-augmented generation across LanceDB, Chroma, Qdrant, and others.' },
    ],
  },
  {
    name: 'BabyAGI',
    slug: 'babyagi',
    description: 'Foundational autonomous task-management agent that launched the AI agent movement; uses GPT-4 and a vector store to create, prioritise, and execute tasks in a loop.',
    providerName: 'Yohei Nakajima',
    providerUrl: 'https://yoheinakajima.com/',
    agentUrl: 'https://github.com/yoheinakajima/babyagi',
    categories: ['infrastructure'],
    tags: ['task-management', 'autonomous-loop', 'foundational', 'gpt-4', 'vector-store', 'open-source'],
    authType: 'apiKey',
    accessMethods: ['cli'],
    supportsStreaming: false,
    skills: [
      { id: 'task-loop', name: 'Autonomous Task Loop', description: 'Continuously create, prioritise, and execute tasks using GPT-4 and a vector database to store and retrieve prior task results.' },
      { id: 'task-create', name: 'Task Creation Agent', description: 'Generate new sub-tasks based on the most recently completed task and the top-level objective, enriched by context from prior executions.' },
      { id: 'prioritize', name: 'Task Prioritisation', description: 'Re-rank the pending task list after each execution step to ensure the agent always tackles the highest-value next action first.' },
    ],
  },

  // Infrastructure & DevOps
  {
    name: 'Container Use',
    slug: 'container-use',
    description: 'MCP server that gives coding agents isolated containerised environments in separate git branches, enabling multiple agents to work safely in parallel without conflicts.',
    providerName: 'Dagger',
    providerUrl: 'https://dagger.io/',
    agentUrl: 'https://container-use.com/',
    categories: ['infrastructure'],
    tags: ['containers', 'parallel-agents', 'git-branches', 'isolation', 'coding-agents', 'dagger'],
    authType: 'none',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    skills: [
      { id: 'isolated-env', name: 'Isolated Agent Environment', description: 'Spin up a fresh container in a dedicated git branch so each coding agent operates independently without touching shared working state.' },
      { id: 'parallel-execution', name: 'Parallel Agent Execution', description: 'Run multiple coding agents simultaneously, each in its own container, then inspect command history and logs for each agent\'s work.' },
      { id: 'safe-discard', name: 'Safe Environment Discard', description: 'Instantly destroy a failed agent\'s container and branch without any impact on the main codebase or other running agents.' },
    ],
  },
  {
    name: 'Amazon Bedrock AgentCore',
    slug: 'bedrock-agentcore',
    description: 'Production agent runtime on AWS with microVM isolation, 8-hour sessions, persistent memory, browser automation, MCP gateway, and USDC micropayment support.',
    providerName: 'Amazon Web Services',
    providerUrl: 'https://aws.amazon.com/',
    agentUrl: 'https://aws.amazon.com/bedrock/agentcore/',
    categories: ['infrastructure'],
    tags: ['agent-runtime', 'aws', 'microvm', 'memory', 'mcp-gateway', 'enterprise'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    supportsStreaming: true,
    skills: [
      { id: 'agent-runtime', name: 'Agent Runtime Hosting', description: 'Deploy any agent framework to isolated Firecracker microVMs with auto-scaling, 8-hour session limits, and per-session billing.' },
      { id: 'agent-memory', name: 'Persistent Agent Memory', description: 'Store session events and extract long-term insights into managed memory resources accessible across multiple agent invocations.' },
      { id: 'agentcore-payments', name: 'AgentCore Payments', description: 'Enable agents to make USDC stablecoin micropayments in ~200ms to access paid APIs and MCP servers via the x402 protocol.' },
    ],
  },
  {
    name: 'Terraform MCP',
    slug: 'terraform-mcp',
    description: 'Official HashiCorp MCP server connecting AI assistants to Terraform Registry APIs for live provider docs, module search, and HCP Terraform workspace management.',
    providerName: 'HashiCorp',
    providerUrl: 'https://hashicorp.com/',
    agentUrl: 'https://developer.hashicorp.com/terraform/mcp-server',
    categories: ['infrastructure'],
    tags: ['infrastructure-as-code', 'terraform', 'registry', 'workspace-management', 'providers', 'modules'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    skills: [
      { id: 'registry-lookup', name: 'Registry Provider Lookup', description: 'Search Terraform Registry for providers, modules, and policies with real-time docs instead of stale training data.' },
      { id: 'workspace-manage', name: 'Manage HCP Workspaces', description: 'Create, update, and delete HCP Terraform or Terraform Enterprise workspaces, set variables, tags, and trigger runs.' },
      { id: 'iac-generate', name: 'Generate IaC Configs', description: 'Produce accurate Terraform configurations grounded in live provider schema and version metadata from the Registry.' },
    ],
  },
  {
    name: 'Honeycomb MCP',
    slug: 'honeycomb-mcp',
    description: 'Hosted MCP server letting AI assistants query Honeycomb observability data, analyse telemetry datasets, inspect alerts, and cross-reference production traces with code.',
    providerName: 'Honeycomb',
    providerUrl: 'https://honeycomb.io/',
    agentUrl: 'https://www.honeycomb.io/mcp',
    categories: ['infrastructure'],
    tags: ['observability', 'telemetry', 'dashboards', 'alerts', 'production-debugging', 'tracing'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    skills: [
      { id: 'dataset-query', name: 'Query Observability Data', description: 'Run natural language queries against Honeycomb datasets across multiple environments and return structured telemetry results.' },
      { id: 'alert-analysis', name: 'Alert and Dashboard Analysis', description: 'Retrieve and summarise active alerts, SLOs, and dashboards to help AI assistants diagnose production incidents in context.' },
      { id: 'code-cross-ref', name: 'Code-Production Cross-Reference', description: 'Correlate live production behaviour from Honeycomb traces with the codebase to surface likely root-cause code paths.' },
    ],
  },

  // Memory / state
  {
    name: 'Redis MCP',
    slug: 'redis-mcp',
    description: 'Official Redis MCP server for agentic applications to read, write, and search Redis data structures including JSON, hash, set, sorted set, stream, and list types.',
    providerName: 'Redis',
    providerUrl: 'https://redis.io/',
    agentUrl: 'https://redis.io/blog/introducing-model-context-protocol-mcp-for-redis/',
    categories: ['memory-state'],
    tags: ['redis', 'key-value', 'vector-search', 'data-structures', 'agent-state', 'streams'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    skills: [
      { id: 'data-read-write', name: 'Redis Read/Write', description: 'Read and write Redis data types including strings, hashes, lists, sets, sorted sets, and JSON documents via natural language commands.' },
      { id: 'vector-search', name: 'Vector Similarity Search', description: 'Execute vector similarity searches over Redis vector sets to support semantic retrieval and agent memory lookup workflows.' },
      { id: 'stream-manage', name: 'Stream Management', description: 'Produce and consume from Redis Streams, enabling event-driven agent coordination and audit-log patterns.' },
    ],
  },

  // Communication (new category)
  {
    name: 'Slack MCP',
    slug: 'slack-mcp',
    description: 'Official Slack remote MCP server enabling AI agents to search messages, post to channels, read history, create Canvases, and retrieve user profiles via OAuth 2.0.',
    providerName: 'Slack',
    providerUrl: 'https://slack.com/',
    agentUrl: 'https://docs.slack.dev/ai/slack-mcp-server/',
    categories: ['communication'],
    tags: ['slack', 'messaging', 'channels', 'canvas', 'workspace-search', 'enterprise'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    skills: [
      { id: 'message-search', name: 'Message Search', description: 'Search Slack messages, files, users, and channels across the workspace using natural language queries via the official Slack API.' },
      { id: 'send-message', name: 'Send Channel Messages', description: 'Post messages to any approved Slack channel or DM on behalf of an authorised user or bot identity.' },
      { id: 'canvas-create', name: 'Create Slack Canvases', description: 'Generate and share formatted Slack Canvas documents containing structured content, summaries, or agent-produced reports.' },
    ],
  },

  // Sales & marketing
  {
    name: 'Google Ads MCP',
    slug: 'google-ads-mcp',
    description: 'Official open-source MCP server enabling AI agents to query Google Ads campaigns, keywords, and performance data via the Google Ads API using natural language.',
    providerName: 'Google',
    providerUrl: 'https://google.com/',
    agentUrl: 'https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server',
    categories: ['sales-marketing'],
    tags: ['google-ads', 'campaigns', 'keywords', 'ppc', 'advertising', 'analytics'],
    authType: 'oauth2',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    skills: [
      { id: 'campaign-query', name: 'Campaign Data Query', description: 'Retrieve campaign performance, impression share, keyword metrics, and budget data from Google Ads accounts via natural language.' },
      { id: 'keyword-analysis', name: 'Keyword Performance Analysis', description: 'Analyse keyword-level performance including CTR, CPC, quality score, and search term reports across ad groups and campaigns.' },
      { id: 'account-audit', name: 'Account Structure Audit', description: 'Map and inspect the full account hierarchy — campaigns, ad groups, ads, and assets — to surface structural optimisation opportunities.' },
    ],
  },
  {
    name: 'TikTok Ads MCP',
    slug: 'tiktok-ads-mcp',
    description: 'Official TikTok MCP server letting AI agents create, manage, and optimise ad campaigns, bids, budgets, and creatives autonomously on the TikTok Ads platform.',
    providerName: 'TikTok',
    providerUrl: 'https://tiktok.com/',
    agentUrl: 'https://ads.tiktok.com/marketing_api/docs',
    categories: ['sales-marketing'],
    tags: ['tiktok', 'ad-campaigns', 'creative-management', 'bid-optimization', 'social-advertising', 'campaign-automation'],
    authType: 'oauth2',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    skills: [
      { id: 'campaign-create', name: 'Create Ad Campaigns', description: 'Instantiate TikTok ad campaigns with targeting parameters, creative assets, budget, and bidding strategy through an AI agent interface.' },
      { id: 'bid-optimize', name: 'Bid and Budget Optimisation', description: 'Adjust bids, shift budgets between ad groups, and respond to performance signals without manual intervention from a media buyer.' },
      { id: 'analytics-report', name: 'Campaign Analytics Report', description: 'Retrieve campaign, ad group, and ad-level performance reports including reach, CPM, CTR, and conversion metrics for any date range.' },
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
