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
  // ─── Mode A: launched in-window (Jun 21 – Jul 5, 2026) ───
  {
    name: 'Safari MCP Server',
    slug: 'safari-mcp',
    description: 'Connects AI agents to a live Safari window for web debugging: DOM inspection, network monitoring, console logs, screenshots, and JS evaluation. Official Apple/WebKit MCP server.',
    providerName: 'Apple',
    providerUrl: 'https://webkit.org',
    agentUrl: 'https://webkit.org/blog/18136/introducing-the-safari-mcp-server-for-web-developers/',
    categories: ['browser-computer', 'code-devtools'],
    tags: ['safari', 'webkit', 'web-debugging', 'dom-inspection', 'browser-automation', 'mcp-official', 'devtools'],
    authType: 'none',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'dom-inspection', name: 'DOM Inspection', description: 'Inspects the rendered DOM tree of a live Safari page so agents can read structure, styles, and accessibility state.' },
      { id: 'network-monitoring', name: 'Network Monitoring', description: 'Captures network requests, responses, and timings from a Safari session for debugging load and API behavior.' },
      { id: 'console-js-eval', name: 'Console & JS Eval', description: 'Reads console output and evaluates arbitrary JavaScript in the Safari page to verify user-facing state.' },
    ],
  },
  {
    name: 'Manufact',
    slug: 'manufact',
    description: 'Builds, tests, and deploys MCP servers and apps to ChatGPT, Claude, and Gemini. Full-stack framework on the mcp-use SDK (TS/Python) plus cloud hosting with GitHub-based deploys.',
    providerName: 'Manufact',
    providerUrl: 'https://manufact.com',
    agentUrl: 'https://manufact.com',
    categories: ['code-devtools'],
    tags: ['mcp', 'mcp-use', 'agent-hosting', 'typescript', 'python', 'yc-s25', 'developer-tools'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'mcp-app-builder', name: 'MCP App Builder', description: 'Scaffolds MCP servers and apps in TypeScript or Python with the opinionated, spec-compliant mcp-use SDK.' },
      { id: 'one-click-deploy', name: 'One-Click Deploy', description: 'Deploys MCP apps to Manufact Cloud from a GitHub repo with automated builds and inspector-based testing.' },
      { id: 'cross-client-publish', name: 'Cross-Client Publishing', description: 'Publishes a single MCP app to ChatGPT, Claude, and Gemini so it runs across all major agent clients.' },
    ],
  },
  {
    name: 'Sakana Fugu',
    slug: 'sakana-fugu',
    description: 'Routes and coordinates frontier models per task through one API and CLI. Multi-agent orchestration model from Sakana AI, grounded in the TRINITY and Conductor research papers.',
    providerName: 'Sakana AI',
    providerUrl: 'https://sakana.ai',
    agentUrl: 'https://sakana.ai/fugu/',
    categories: ['orchestration', 'language'],
    tags: ['model-routing', 'multi-agent', 'sakana-ai', 'frontier-models', 'orchestration', 'research-backed'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'dynamic-model-routing', name: 'Dynamic Model Routing', description: 'Selects and routes each prompt to the best frontier model for the task behind a single API endpoint.' },
      { id: 'multi-model-coordination', name: 'Multi-Model Coordination', description: 'Coordinates multiple frontier models on one request, combining their outputs into a single coherent answer.' },
      { id: 'task-decomposition', name: 'Task Decomposition', description: 'Breaks complex requests into sub-tasks and assigns each to the most capable model for that step.' },
    ],
  },
  {
    name: 'OpenKnowledge',
    slug: 'openknowledge',
    description: 'Runs an AI-native Markdown editor and wiki with built-in MCP server, skills, and agentic search. Connects to Claude, Codex, and Cursor for knowledge-base editing. Open source by Inkeep.',
    providerName: 'Inkeep',
    providerUrl: 'https://inkeep.com',
    agentUrl: 'https://github.com/inkeep/open-knowledge',
    categories: ['content-media', 'research'],
    tags: ['knowledge-base', 'markdown', 'wiki', 'agentic-search', 'mcp', 'open-source', 'documentation'],
    authType: 'none',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'agentic-search', name: 'Agentic Search', description: 'Runs agent-driven semantic search across a Markdown knowledge base to surface and cite relevant passages.' },
      { id: 'builtin-mcp-server', name: 'Built-in MCP Server', description: 'Exposes the knowledge base to Claude, Codex, and Cursor through a bundled MCP server with no extra setup.' },
      { id: 'markdown-wiki', name: 'Markdown Wiki', description: 'Edits and links Markdown documents as an AI-native wiki with skills that automate writing and organization.' },
    ],
  },
  {
    name: 'Skybridge',
    slug: 'skybridge',
    description: 'Builds interactive MCP Apps that render inside Claude and ChatGPT using a full-stack open-source React framework. Ships UI components, routing, and state for agent-facing apps.',
    providerName: 'Skybridge',
    providerUrl: 'https://skybridge.tech',
    agentUrl: 'https://skybridge.tech',
    categories: ['code-devtools'],
    tags: ['mcp-apps', 'react', 'framework', 'interactive-ui', 'open-source', 'claude', 'chatgpt'],
    authType: 'none',
    accessMethods: ['cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'mcp-app-framework', name: 'MCP App Framework', description: 'Provides a full-stack React framework for building MCP Apps with routing, state, and server components.' },
      { id: 'interactive-ui', name: 'Interactive UI Components', description: 'Ships prebuilt interactive UI components that render inside Claude and ChatGPT agent surfaces.' },
      { id: 'in-chat-rendering', name: 'In-Chat Rendering', description: 'Renders live app views directly inside the chat client so users interact without leaving the conversation.' },
    ],
  },
  {
    name: 'Polygraph',
    slug: 'polygraph',
    description: 'Gives AI coding agents cross-repository visibility and session-persistent memory by linking multiple repos into one synthetic monorepo. Integrates with Claude Code, GitHub, and CI. By Nx.',
    providerName: 'Nx',
    providerUrl: 'https://nx.dev',
    agentUrl: 'https://trypolygraph.com',
    categories: ['code-devtools'],
    tags: ['monorepo', 'cross-repo', 'coding-agents', 'session-memory', 'nx', 'claude-code', 'ci'],
    authType: 'apiKey',
    accessMethods: ['cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'cross-repo-indexing', name: 'Cross-Repo Indexing', description: 'Indexes multiple repositories into a synthetic monorepo graph so agents see dependencies across boundaries.' },
      { id: 'session-memory', name: 'Session Memory', description: 'Persists agent context and decisions across sessions so long-running coding work survives restarts.' },
      { id: 'pr-coordination', name: 'PR Coordination', description: 'Coordinates related pull requests across repos so agents land cross-cutting changes consistently.' },
    ],
  },
  {
    name: 'Sequence',
    slug: 'sequence',
    description: 'Lets AI agents send, split, and route real money across bank accounts, cards, and apps via one API — with scoped keys, server-side spend limits, and audit trails.',
    providerName: 'Sequence',
    providerUrl: 'https://getsequence.io',
    agentUrl: 'https://home.getsequence.io/solutions/agentic',
    categories: ['commerce-payments', 'finance'],
    tags: ['payments', 'money-movement', 'agentic-finance', 'spend-limits', 'audit-trail', 'scoped-keys', 'fintech'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'agentic-money-movement', name: 'Agentic Money Movement', description: 'Lets agents send, split, and route real money across linked bank accounts, cards, and apps via one API.' },
      { id: 'scoped-spend-limits', name: 'Scoped Spend Limits', description: 'Enforces server-side spend limits and scoped API keys so agent-initiated payments stay within policy.' },
      { id: 'payment-audit-trails', name: 'Payment Audit Trails', description: 'Records every agent-initiated transaction with a full audit trail for compliance and reconciliation.' },
    ],
  },
  {
    name: 'BrowserAct',
    slug: 'browseract',
    description: 'Automates real-Chrome browser sessions for AI agents — breaks through anti-bot walls, isolates multi-account sessions, runs parallel tasks, and hands off to humans when stuck.',
    providerName: 'BrowserAct',
    providerUrl: 'https://browseract.com',
    agentUrl: 'https://github.com/browser-act/skills',
    categories: ['browser-computer'],
    tags: ['browser-automation', 'anti-bot', 'multi-session', 'parallel-execution', 'human-handoff', 'chrome', 'web-agents'],
    authType: 'apiKey',
    accessMethods: ['cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'anti-bot-evasion', name: 'Anti-Bot Evasion', description: 'Drives real Chrome sessions that pass anti-bot and verification walls that block headless automation.' },
      { id: 'multi-session-isolation', name: 'Multi-Session Isolation', description: 'Runs isolated multi-account browser sessions in parallel so agents operate many logins without cross-contamination.' },
      { id: 'human-handoff', name: 'Human Handoff', description: 'Hands control to a human when a task gets stuck, then resumes automated execution afterward.' },
    ],
  },

  // ─── Mode B: established, missing from directory ───
  {
    name: 'OpenCode',
    slug: 'opencode',
    description: 'Runs a terminal-first open-source coding agent connecting to 75+ model providers, with automatic LSP integration, MCP support, and parallel multi-session workflows.',
    providerName: 'Anomaly',
    providerUrl: 'https://opencode.ai',
    agentUrl: 'https://opencode.ai',
    categories: ['code-devtools'],
    tags: ['coding-agent', 'terminal', 'open-source', 'lsp', 'mcp', 'model-agnostic', 'tui'],
    authType: 'oauth2',
    accessMethods: ['cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: true,
    verified: true,
    skills: [
      { id: 'multi-provider-coding', name: 'Multi-Provider Coding', description: 'Writes and edits code from the terminal using any of 75+ model providers via Models.dev with BYOK.' },
      { id: 'lsp-integration', name: 'LSP Integration', description: 'Automatically wires up language servers so the agent gets accurate types, diagnostics, and symbol data.' },
      { id: 'parallel-sessions', name: 'Parallel Sessions', description: 'Runs multiple coding sessions in parallel over the same project without storing code or context data.' },
    ],
  },
  {
    name: 'OpenClaw',
    slug: 'openclaw',
    description: 'Runs a self-hosted, local-first personal AI assistant across WhatsApp, Telegram, Slack, and Discord. Ships a CLI gateway plus skills, webhooks, and cron for private automation.',
    providerName: 'OpenClaw',
    providerUrl: 'https://github.com/openclaw/openclaw',
    agentUrl: 'https://github.com/openclaw/openclaw',
    categories: ['orchestration', 'communication'],
    tags: ['personal-assistant', 'self-hosted', 'local-first', 'messaging', 'open-source', 'mit-license', 'automation'],
    authType: 'none',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: true,
    featured: true,
    verified: true,
    skills: [
      { id: 'messaging-assistant', name: 'Messaging-App Assistant', description: 'Runs a personal AI assistant inside WhatsApp, Telegram, Slack, Discord, and other chat channels.' },
      { id: 'self-hosted-gateway', name: 'Self-Hosted Gateway', description: 'Runs a local-first gateway you own, keeping assistant data on your own devices for privacy.' },
      { id: 'skills-webhooks', name: 'Skills & Webhooks', description: 'Automates tasks with skills, webhooks, and cron jobs triggered from messages or schedules.' },
    ],
  },
  {
    name: 'CodeRabbit',
    slug: 'coderabbit',
    description: 'Reviews pull requests with AI across GitHub, GitLab, Azure DevOps, and Bitbucket — flagging bugs, security issues, and style, with fix suggestions and diagrams. Plus IDE plugins and a CLI.',
    providerName: 'CodeRabbit',
    providerUrl: 'https://coderabbit.ai',
    agentUrl: 'https://coderabbit.ai',
    categories: ['code-devtools'],
    tags: ['code-review', 'pull-requests', 'github', 'gitlab', 'static-analysis', 'ide-plugin', 'security'],
    authType: 'oauth2',
    accessMethods: ['api', 'cli', 'browser-extension'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'ai-pr-review', name: 'AI PR Review', description: 'Reviews pull requests across GitHub, GitLab, Azure DevOps, and Bitbucket, flagging bugs and style issues.' },
      { id: 'fix-suggestions', name: 'Fix Suggestions', description: 'Proposes concrete one-click code fixes and explanations inline on the diff during review.' },
      { id: 'architecture-diagrams', name: 'Architecture Diagrams', description: 'Generates diff summaries and architectural diagrams to explain the impact of a change under review.' },
    ],
  },
  {
    name: 'AnythingLLM',
    slug: 'anything-llm',
    description: 'Runs an all-in-one, self-hosted RAG and agents app: chat with documents, build agents, and connect tools via MCP. Desktop and Docker with an API. By Mintplex Labs.',
    providerName: 'Mintplex Labs',
    providerUrl: 'https://anythingllm.com',
    agentUrl: 'https://github.com/Mintplex-Labs/anything-llm',
    categories: ['research', 'code-devtools'],
    tags: ['rag', 'self-hosted', 'document-chat', 'agents', 'mcp', 'open-source', 'desktop'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'document-rag', name: 'Document RAG', description: 'Ingests documents into a private workspace and answers questions over them with cited retrieval.' },
      { id: 'no-code-agents', name: 'No-Code Agents', description: 'Builds custom agents with tools and workflows through a no-code interface over your own data.' },
      { id: 'mcp-tool-access', name: 'MCP Tool Access', description: 'Connects external tools and data sources via MCP so agents can act beyond the knowledge base.' },
    ],
  },
  {
    name: 'LobeChat',
    slug: 'lobe-chat',
    description: 'Deploys a self-hostable, multi-provider LLM chat framework with a plugin and MCP marketplace, artifacts, knowledge base, and branching. Extensible ChatGPT alternative by LobeHub.',
    providerName: 'LobeHub',
    providerUrl: 'https://lobehub.com',
    agentUrl: 'https://github.com/lobehub/lobe-chat',
    categories: ['content-media'],
    tags: ['chat-framework', 'multi-provider', 'plugins', 'mcp-marketplace', 'self-hosted', 'open-source', 'knowledge-base'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'multi-provider-chat', name: 'Multi-Provider Chat', description: 'Chats across many LLM providers in one self-hostable UI with artifacts and conversation branching.' },
      { id: 'plugin-marketplace', name: 'Plugin Marketplace', description: 'Extends the assistant with plugins and MCP servers from a built-in marketplace of integrations.' },
      { id: 'knowledge-base', name: 'Knowledge Base', description: 'Uploads files into a knowledge base and grounds chat responses on that private content.' },
    ],
  },
  {
    name: 'Jan',
    slug: 'jan',
    description: 'Runs local LLMs 100% offline in a desktop app and connects cloud models, exposing a local OpenAI-compatible API. Privacy-first ChatGPT alternative by Menlo Research.',
    providerName: 'Menlo Research',
    providerUrl: 'https://jan.ai',
    agentUrl: 'https://jan.ai',
    categories: ['infrastructure'],
    tags: ['local-llm', 'offline', 'openai-compatible', 'desktop', 'privacy', 'open-source', 'model-runner'],
    authType: 'none',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'offline-llm-runtime', name: 'Offline LLM Runtime', description: 'Runs open-weight LLMs fully offline on your own machine with no data leaving the device.' },
      { id: 'openai-compatible-api', name: 'OpenAI-Compatible API', description: 'Serves a local OpenAI-compatible endpoint so existing apps and agents can call local models.' },
      { id: 'model-management', name: 'Model Management', description: 'Downloads, switches, and configures local and cloud models from a single desktop interface.' },
    ],
  },
  {
    name: 'Google ADK',
    slug: 'google-adk',
    description: "Builds and orchestrates multi-agent systems with a code-first Python and Java SDK plus CLI. Google's Agent Development Kit; powers Vertex AI Agent Engine deployments.",
    providerName: 'Google',
    providerUrl: 'https://google.github.io/adk-docs/',
    agentUrl: 'https://github.com/google/adk-python',
    categories: ['orchestration'],
    tags: ['multi-agent', 'agent-framework', 'google', 'python', 'java', 'vertex-ai', 'code-first'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'multi-agent-orchestration', name: 'Multi-Agent Orchestration', description: 'Composes hierarchies of specialized agents with routing, delegation, and shared state in code.' },
      { id: 'code-first-sdk', name: 'Code-First SDK', description: 'Defines agents, tools, and workflows in Python or Java with a testable, code-first development model.' },
      { id: 'vertex-deployment', name: 'Vertex Deployment', description: 'Deploys ADK agents to Vertex AI Agent Engine for managed, scalable production hosting.' },
    ],
  },
  {
    name: 'Claude Flow',
    slug: 'claude-flow',
    description: 'Orchestrates multi-agent swarms for Claude Code — 100+ specialized agents, shared memory, and consensus topologies via CLI and MCP. By ruvnet (formerly claude-flow, now ruflo).',
    providerName: 'ruvnet',
    providerUrl: 'https://github.com/ruvnet/ruflo',
    agentUrl: 'https://github.com/ruvnet/ruflo',
    categories: ['orchestration'],
    tags: ['agent-swarm', 'claude-code', 'multi-agent', 'shared-memory', 'mcp', 'open-source', 'consensus'],
    authType: 'none',
    accessMethods: ['cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'swarm-orchestration', name: 'Agent Swarm Orchestration', description: 'Spawns and coordinates 100+ specialized agents on top of Claude Code for parallel task execution.' },
      { id: 'shared-memory', name: 'Shared Memory', description: 'Maintains a shared memory layer so swarm agents pass context and results between each other.' },
      { id: 'consensus-topologies', name: 'Consensus Topologies', description: 'Arranges agents in configurable topologies with consensus mechanisms for reliable multi-agent decisions.' },
    ],
  },
  {
    name: 'SWE-agent',
    slug: 'swe-agent',
    description: 'Takes a GitHub issue and autonomously fixes it with the language model of your choice. Also runs cybersecurity/CTF tasks. Open-source CLI from Princeton and Stanford NLP.',
    providerName: 'Princeton NLP',
    providerUrl: 'https://swe-agent.com',
    agentUrl: 'https://github.com/SWE-agent/SWE-agent',
    categories: ['code-devtools', 'security'],
    tags: ['autonomous-coding', 'github-issues', 'swe-bench', 'ctf', 'open-source', 'research', 'model-agnostic'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'autonomous-issue-fixing', name: 'Autonomous Issue Fixing', description: 'Reads a GitHub issue and autonomously edits the codebase to resolve it using the LM of your choice.' },
      { id: 'swe-bench-solving', name: 'SWE-bench Solving', description: 'Runs the agent loop that scores high on SWE-bench, iterating on tests and edits until they pass.' },
      { id: 'ctf-security-mode', name: 'CTF/Security Mode', description: 'Operates in offensive-security and CTF modes to analyze and exploit target programs.' },
    ],
  },
  {
    name: 'FastMCP',
    slug: 'fastmcp',
    description: 'Builds MCP servers and clients in Python the fast, Pythonic way — decorators for tools, resources, and prompts, with auth, testing, and deployment. Standard framework by Prefect.',
    providerName: 'Prefect',
    providerUrl: 'https://gofastmcp.com',
    agentUrl: 'https://github.com/PrefectHQ/fastmcp',
    categories: ['code-devtools'],
    tags: ['mcp', 'python', 'framework', 'server-sdk', 'client-sdk', 'open-source', 'prefect'],
    authType: 'none',
    accessMethods: ['cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'pythonic-mcp-servers', name: 'Pythonic MCP Servers', description: 'Defines MCP tools, resources, and prompts with simple Python decorators on ordinary functions.' },
      { id: 'mcp-client-building', name: 'MCP Client Building', description: 'Builds MCP clients to call and compose remote MCP servers from Python code.' },
      { id: 'auth-and-deploy', name: 'Auth & Deploy', description: 'Adds authentication, testing utilities, and deployment helpers to ship MCP servers to production.' },
    ],
  },
  {
    name: 'Arcade.dev',
    slug: 'arcade-dev',
    description: 'Handles agent authorization, tool calling, and governance so agents act on behalf of users. MCP runtime with Python/JS SDKs, OAuth flows, and 7,500+ pre-built tools.',
    providerName: 'Arcade.dev',
    providerUrl: 'https://arcade.dev',
    agentUrl: 'https://arcade.dev',
    categories: ['infrastructure', 'security'],
    tags: ['mcp-runtime', 'agent-authorization', 'tool-calling', 'oauth', 'governance', 'enterprise', 'integrations'],
    authType: 'oauth2',
    accessMethods: ['mcp', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'agent-authorization', name: 'Agent Authorization', description: 'Manages OAuth flows and per-user permissions so agents securely act on behalf of individual users.' },
      { id: 'tool-runtime', name: 'Tool Runtime', description: 'Runs 7,500+ pre-built tools across 81 MCP servers with reliable execution for any LLM framework.' },
      { id: 'governance-audit', name: 'Governance & Audit', description: 'Enforces policy and records complete audit trails for every action agents take in enterprise systems.' },
    ],
  },
  {
    name: 'Pipecat',
    slug: 'pipecat',
    description: 'Builds realtime voice and multimodal conversational agents in Python — orchestrates STT, LLM, and TTS pipelines with interruption handling. Open-source framework by Daily.',
    providerName: 'Daily',
    providerUrl: 'https://pipecat.ai',
    agentUrl: 'https://github.com/pipecat-ai/pipecat',
    categories: ['voice-messaging'],
    tags: ['voice-ai', 'realtime', 'stt', 'tts', 'multimodal', 'open-source', 'python'],
    authType: 'apiKey',
    accessMethods: ['api'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'voice-pipeline', name: 'Voice Pipeline Orchestration', description: 'Chains STT, LLM, and TTS services into a realtime voice pipeline for conversational agents.' },
      { id: 'interruption-handling', name: 'Interruption Handling', description: 'Detects user interruptions and barge-in to make voice conversations feel natural and responsive.' },
      { id: 'multimodal-io', name: 'Multimodal I/O', description: 'Handles audio, video, and text streams together for multimodal realtime agent experiences.' },
    ],
  },
  {
    name: 'LiveKit Agents',
    slug: 'livekit-agents',
    description: 'Builds production realtime voice and video AI agents with WebRTC transport, turn detection, and STT/LLM/TTS pipelines. Python and Node framework by LiveKit.',
    providerName: 'LiveKit',
    providerUrl: 'https://livekit.io',
    agentUrl: 'https://github.com/livekit/agents',
    categories: ['voice-messaging'],
    tags: ['voice-ai', 'webrtc', 'realtime', 'turn-detection', 'video-agents', 'open-source', 'python'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'realtime-voice-agents', name: 'Realtime Voice Agents', description: 'Builds production voice and video agents that stream over WebRTC with low latency.' },
      { id: 'turn-detection', name: 'Turn Detection', description: 'Detects conversational turns and end-of-speech so agents respond at the right moment.' },
      { id: 'webrtc-transport', name: 'WebRTC Transport', description: 'Handles scalable WebRTC media transport for connecting agents to users across devices.' },
    ],
  },
  {
    name: 'Repomix',
    slug: 'repomix',
    description: 'Packs an entire repository into a single AI-friendly file for LLM ingestion, with token counting, filtering, and secret redaction. Optional MCP server. Open source.',
    providerName: 'Repomix',
    providerUrl: 'https://repomix.com',
    agentUrl: 'https://github.com/yamadashy/repomix',
    categories: ['code-devtools'],
    tags: ['repo-packing', 'llm-context', 'token-counting', 'secret-redaction', 'mcp', 'open-source', 'cli'],
    authType: 'none',
    accessMethods: ['cli', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'repo-packing', name: 'Repo Packing', description: 'Packs an entire repository into a single structured file optimized for feeding into an LLM.' },
      { id: 'token-counting', name: 'Token Counting', description: 'Counts tokens per file and for the whole pack so you can fit context within model limits.' },
      { id: 'secret-redaction', name: 'Secret Redaction', description: 'Detects and redacts secrets and lets you filter files so sensitive data stays out of the output.' },
    ],
  },
  {
    name: 'NeMo Guardrails',
    slug: 'nemo-guardrails',
    description: 'Adds programmable guardrails to LLM apps — input/output moderation, jailbreak and prompt-injection detection, topic control, and fact-checking. Open-source Python toolkit by NVIDIA.',
    providerName: 'NVIDIA',
    providerUrl: 'https://github.com/NVIDIA-NeMo/Guardrails',
    agentUrl: 'https://github.com/NVIDIA-NeMo/Guardrails',
    categories: ['security'],
    tags: ['guardrails', 'llm-safety', 'jailbreak-detection', 'prompt-injection', 'moderation', 'open-source', 'nvidia'],
    authType: 'none',
    accessMethods: ['api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'jailbreak-detection', name: 'Jailbreak Detection', description: 'Detects jailbreak and prompt-injection attempts before they reach the underlying LLM.' },
      { id: 'io-moderation', name: 'Input/Output Moderation', description: 'Screens user inputs and model outputs against safety and content policies in real time.' },
      { id: 'topic-rails', name: 'Topic Rails', description: 'Constrains conversations to allowed topics and adds fact-checking rails to reduce hallucination.' },
    ],
  },

  // ─── Additional established tools (moderate but qualifying) ───
  {
    name: 'Workweave Router',
    slug: 'workweave-router',
    description: 'Routes each prompt to the optimal model (Anthropic, OpenAI, Gemini) in under 50ms via an on-box embedder. Drop-in proxy for Claude Code, Codex, and opencode; cuts costs 40-70%.',
    providerName: 'Weave',
    providerUrl: 'https://github.com/workweave/router',
    agentUrl: 'https://github.com/workweave/router',
    categories: ['infrastructure'],
    tags: ['model-routing', 'proxy', 'cost-optimization', 'claude-code', 'codex', 'open-source', 'llm-gateway'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'sub-50ms-routing', name: 'Sub-50ms Routing', description: 'Routes each prompt to the best model in under 50ms using an on-box embedder, no extra network hop.' },
      { id: 'drop-in-proxy', name: 'Drop-In Proxy', description: 'Acts as an Anthropic- and OpenAI-compatible proxy for Claude Code, Codex, and opencode.' },
      { id: 'cost-reduction', name: 'Cost Reduction', description: 'Cuts model spend 40-70% by sending simple prompts to cheaper models and hard ones to frontier models.' },
    ],
  },
  {
    name: 'Bankr',
    slug: 'bankr',
    description: 'Executes onchain trading, wallet management, and automation from a natural-language terminal across 9 chains, including Hyperliquid. Works from external agent harnesses via Skills.',
    providerName: 'Bankr',
    providerUrl: 'https://bankr.bot',
    agentUrl: 'https://bankr.bot',
    categories: ['finance', 'commerce-payments'],
    tags: ['onchain', 'crypto-trading', 'wallet', 'hyperliquid', 'defi', 'automation', 'agent-skills'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'onchain-trading', name: 'Onchain Trading', description: 'Executes trades and swaps across 9 chains including full Hyperliquid support from natural language.' },
      { id: 'wallet-management', name: 'Wallet Management', description: 'Manages onchain wallets, balances, and transfers on behalf of the user or an agent.' },
      { id: 'trading-automation', name: 'Trading Automation', description: 'Automates recurring onchain actions and strategies callable from external agent harnesses.' },
    ],
  },
  {
    name: 'Retrace',
    slug: 'retrace',
    description: 'Records, replays, forks, and shares AI agent runs — forks re-issue only LLM calls while tool calls replay from tape, turning production failures into regression tests and PR eval gates.',
    providerName: 'Retrace',
    providerUrl: 'https://retraceai.tech',
    agentUrl: 'https://retraceai.tech',
    categories: ['code-devtools'],
    tags: ['agent-debugging', 'record-replay', 'observability', 'regression-testing', 'eval', 'sdk', 'ci'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'record-replay', name: 'Record & Replay', description: 'Records agent runs and replays them deterministically, re-issuing only LLM calls while tools play from tape.' },
      { id: 'fork-runs', name: 'Fork Runs', description: 'Forks a captured run to test prompt or code changes against the exact same production context.' },
      { id: 'eval-gates', name: 'Eval Gates', description: 'Turns captured failures into regression tests and PR eval gates that block regressions in CI.' },
    ],
  },
  {
    name: 'Pluno',
    slug: 'pluno',
    description: 'Automates web apps through their underlying APIs rather than clicking the UI, running as a browser extension. Claims ~10x speed and ~10x fewer tokens than click-based browser agents.',
    providerName: 'Pluno',
    providerUrl: 'https://pluno.ai',
    agentUrl: 'https://www.producthunt.com/products/pluno',
    categories: ['browser-computer'],
    tags: ['browser-agent', 'browser-extension', 'web-automation', 'api-driven', 'token-efficient', 'gdpr', 'productivity'],
    authType: 'apiKey',
    accessMethods: ['browser-extension'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'api-driven-automation', name: 'API-Driven Automation', description: 'Drives web apps through their backing APIs instead of simulating clicks for faster, cheaper automation.' },
      { id: 'browser-extension-agent', name: 'Browser-Extension Agent', description: 'Runs as a browser extension that operates the apps you are already logged into in your tabs.' },
      { id: 'token-efficient-runs', name: 'Token-Efficient Runs', description: 'Completes multi-tool web tasks with roughly 10x fewer tokens than click-based browser agents.' },
    ],
  },
  {
    name: 'AgentScope',
    slug: 'agentscope',
    description: 'Builds multi-agent applications with a Python framework focused on transparency, observability, and tracing. Includes a runtime and studio for debugging. By Alibaba.',
    providerName: 'Alibaba',
    providerUrl: 'https://github.com/agentscope-ai/agentscope',
    agentUrl: 'https://github.com/agentscope-ai/agentscope',
    categories: ['orchestration'],
    tags: ['multi-agent', 'agent-framework', 'observability', 'tracing', 'python', 'open-source', 'alibaba'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'multi-agent-apps', name: 'Multi-Agent Apps', description: 'Builds multi-agent applications with message passing, tools, and pluggable model backends in Python.' },
      { id: 'agent-observability', name: 'Agent Observability', description: 'Traces and visualizes agent execution to see, understand, and debug what each agent did and why.' },
      { id: 'agent-studio', name: 'Agent Studio', description: 'Provides a studio and runtime for developing, running, and monitoring agents interactively.' },
    ],
  },
  {
    name: 'assistant-ui',
    slug: 'assistant-ui',
    description: 'Provides a TypeScript and React component library for building AI chat and agent UIs — ChatGPT-style threads, generative UI, streaming, and tool-call rendering. YC-backed.',
    providerName: 'assistant-ui',
    providerUrl: 'https://www.assistant-ui.com',
    agentUrl: 'https://github.com/assistant-ui/assistant-ui',
    categories: ['code-devtools'],
    tags: ['react', 'typescript', 'chat-ui', 'generative-ui', 'component-library', 'open-source', 'yc'],
    authType: 'none',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'chat-ui-components', name: 'Chat UI Components', description: 'Ships React primitives for ChatGPT-style threads, composer, and message rendering out of the box.' },
      { id: 'generative-ui', name: 'Generative UI', description: 'Renders tool calls and structured model output as interactive React components in the conversation.' },
      { id: 'streaming-messages', name: 'Streaming Messages', description: 'Streams assistant responses token by token with built-in state management and auto-scroll.' },
    ],
  },
  {
    name: 'Eliza',
    slug: 'eliza',
    description: 'Builds autonomous agents with a TypeScript framework and large plugin ecosystem, spanning chat, social, and onchain actions. Open-source agent OS by elizaOS.',
    providerName: 'elizaOS',
    providerUrl: 'https://elizaos.ai',
    agentUrl: 'https://github.com/elizaOS/eliza',
    categories: ['orchestration'],
    tags: ['agent-framework', 'typescript', 'plugins', 'autonomous-agents', 'onchain', 'open-source', 'multi-platform'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'autonomous-agents', name: 'Autonomous Agents', description: 'Defines persistent autonomous agents with memory, goals, and personalities in TypeScript.' },
      { id: 'plugin-ecosystem', name: 'Plugin Ecosystem', description: 'Extends agents with a large ecosystem of plugins for chat, social platforms, and onchain actions.' },
      { id: 'multi-platform-deploy', name: 'Multi-Platform Deploy', description: 'Connects one agent across Discord, Telegram, X, and web clients from a single codebase.' },
    ],
  },
  {
    name: 'Microsoft Agent Framework',
    slug: 'microsoft-agent-framework',
    description: 'Builds and orchestrates multi-agent apps with a .NET and Python SDK. The successor unifying Semantic Kernel and AutoGen for production agent systems. By Microsoft.',
    providerName: 'Microsoft',
    providerUrl: 'https://github.com/microsoft/agent-framework',
    agentUrl: 'https://github.com/microsoft/agent-framework',
    categories: ['orchestration'],
    tags: ['multi-agent', 'agent-framework', 'dotnet', 'python', 'semantic-kernel', 'autogen', 'microsoft'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'agent-orchestration', name: 'Agent Orchestration', description: 'Orchestrates multi-agent workflows with handoffs and shared context across .NET and Python.' },
      { id: 'workflow-graphs', name: 'Workflow Graphs', description: 'Defines agent workflows as graphs with typed connections, checkpoints, and human-in-the-loop steps.' },
      { id: 'sk-autogen-unified', name: 'Unified SK + AutoGen', description: 'Combines Semantic Kernel enterprise features with AutoGen orchestration in one supported framework.' },
    ],
  },
  {
    name: 'STORM',
    slug: 'storm',
    description: 'Researches a topic and writes a cited, Wikipedia-length report by simulating multi-perspective question asking. Co-STORM adds human collaboration. Research system by Stanford OVAL.',
    providerName: 'Stanford OVAL',
    providerUrl: 'https://storm.genie.stanford.edu',
    agentUrl: 'https://github.com/stanford-oval/storm',
    categories: ['research'],
    tags: ['research-automation', 'report-writing', 'knowledge-curation', 'citations', 'open-source', 'stanford', 'literature-review'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'topic-research', name: 'Topic Research', description: 'Researches a topic from the internet and organizes findings into a structured outline with sources.' },
      { id: 'cited-report-writing', name: 'Cited Report Writing', description: 'Writes a long, Wikipedia-style article with inline citations grounded in retrieved sources.' },
      { id: 'multi-perspective-qa', name: 'Multi-Perspective Q&A', description: 'Simulates experts asking questions from multiple perspectives to broaden research coverage.' },
    ],
  },
  {
    name: 'Agent Zero',
    slug: 'agent-zero',
    description: 'Runs a general-purpose personal agentic framework with persistent memory, tool use, code execution, and multi-agent cooperation. Open-source and fully customizable.',
    providerName: 'Agent Zero',
    providerUrl: 'https://agent-zero.ai',
    agentUrl: 'https://github.com/agent0ai/agent-zero',
    categories: ['orchestration'],
    tags: ['agentic-framework', 'personal-agent', 'persistent-memory', 'code-execution', 'multi-agent', 'open-source', 'customizable'],
    authType: 'none',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'general-purpose-agent', name: 'General-Purpose Agent', description: 'Runs a customizable agent that uses the operating system and tools to accomplish open-ended tasks.' },
      { id: 'persistent-memory', name: 'Persistent Memory', description: 'Remembers past solutions and facts across sessions to improve at recurring tasks over time.' },
      { id: 'agent-cooperation', name: 'Agent Cooperation', description: 'Spawns subordinate agents that cooperate on subtasks under a superior agent hierarchy.' },
    ],
  },
  {
    name: 'PraisonAI',
    slug: 'praisonai',
    description: 'Builds production multi-agent systems with a Python framework and low-code layer — self-reflection, tool use, and 100+ LLM support. Also runs as a CLI. Open source.',
    providerName: 'PraisonAI',
    providerUrl: 'https://docs.praison.ai',
    agentUrl: 'https://github.com/MervinPraison/PraisonAI',
    categories: ['orchestration'],
    tags: ['multi-agent', 'low-code', 'self-reflection', 'python', 'agent-framework', 'open-source', 'cli'],
    authType: 'apiKey',
    accessMethods: ['cli', 'api'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'multi-agent-systems', name: 'Multi-Agent Systems', description: 'Builds collaborating multi-agent systems with roles, tasks, and tools in Python or via low-code YAML.' },
      { id: 'self-reflection', name: 'Self-Reflection', description: 'Adds a self-reflection loop so agents critique and improve their own outputs before finishing.' },
      { id: 'broad-llm-support', name: 'Broad LLM Support', description: 'Runs agents against 100+ LLM providers with a consistent configuration across models.' },
    ],
  },
  {
    name: 'TEN Framework',
    slug: 'ten-framework',
    description: 'Builds realtime conversational voice AI agents with a low-latency, multimodal framework in C, Go, and Python. Handles audio, video, and data streams. Open source.',
    providerName: 'TEN',
    providerUrl: 'https://theten.ai',
    agentUrl: 'https://github.com/TEN-framework/ten-framework',
    categories: ['voice-messaging'],
    tags: ['voice-ai', 'realtime', 'multimodal', 'conversational', 'low-latency', 'open-source', 'framework'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'realtime-voice', name: 'Realtime Voice', description: 'Builds low-latency conversational voice agents that stream audio in and out in real time.' },
      { id: 'multimodal-streams', name: 'Multimodal Streams', description: 'Processes audio, video, image, and data streams together in a single agent graph.' },
      { id: 'extension-graph', name: 'Extension Graph', description: 'Composes reusable extensions in C, Go, or Python into an execution graph for voice pipelines.' },
    ],
  },
  {
    name: 'SnapLogic MCP Builder',
    slug: 'snaplogic-mcp-builder',
    description: 'Auto-generates governed MCP servers from existing integration pipelines, OpenAPI specs, and API-management services — no code required. Enterprise iPaaS by SnapLogic.',
    providerName: 'SnapLogic',
    providerUrl: 'https://www.snaplogic.com',
    agentUrl: 'https://www.snaplogic.com',
    categories: ['infrastructure'],
    tags: ['mcp', 'ipaas', 'integration', 'openapi', 'no-code', 'enterprise', 'api-management'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: true,
    skills: [
      { id: 'mcp-generation', name: 'MCP Generation', description: 'Generates governed MCP servers automatically from existing integration pipelines and OpenAPI specs.' },
      { id: 'no-code-tooling', name: 'No-Code Tooling', description: 'Turns enterprise APIs and pipelines into agent-callable tools without writing custom server code.' },
      { id: 'mcp-governance', name: 'MCP Governance', description: 'Applies an AI gateway with policy and access controls to govern how agents call generated MCP servers.' },
    ],
  },
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
