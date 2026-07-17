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
import { cma, findEntryBySlug } from './lib/cma';

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
  // ── Weekly drop 2026-07-17 (run 2): Mode A + Mode B ──
  {
    name: "Grok Build",
    slug: "grok-build",
    description: "Runs xAI's terminal coding agent with plan-first execution, up to 8 parallel sub-agents in Git worktrees, and native MCP support. grok-build-0.1 scores 70.8% on SWE-Bench Verified.",
    providerName: "xAI",
    providerUrl: "https://x.ai",
    agentUrl: "https://docs.x.ai/build/overview",
    categories: ["code-devtools"],
    tags: ["coding-agent", "terminal", "swe-bench", "parallel-agents", "git-worktrees", "mcp", "rust", "open-source"],
    authType: "oauth2",
    accessMethods: ["cli", "mcp", "api"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: true,
    verified: true,
    skills: [
      { id: "plan-first-execution", name: "Plan-First Execution", description: "Generates an editable step-by-step plan you can approve, comment on, or rewrite before the agent writes any code." },
      { id: "parallel-sub-agents", name: "Parallel Sub-Agents", description: "Fans work out to up to eight sub-agents running concurrently in isolated Git worktrees for faster multi-file changes." },
      { id: "mcp-tools", name: "MCP Tool Access", description: "Connects to external data and tools through native Model Context Protocol support inside the terminal session." },
    ],
  },
  {
    name: "X MCP Server",
    slug: "x-mcp",
    description: "Connects AI assistants to the X (Twitter) API via an official hosted MCP server. Exposes 200+ read-only endpoints for post search, timeline reads, profile lookups, and trend analysis. No write access.",
    providerName: "X",
    providerUrl: "https://x.com",
    agentUrl: "https://devcommunity.x.com/t/announcing-the-hosted-x-mcp/269558",
    categories: ["communication"],
    tags: ["x", "twitter", "social-media", "mcp", "hosted", "read-only", "official", "oauth"],
    authType: "oauth2",
    accessMethods: ["mcp"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "post-search", name: "Post Search", description: "Searches public X posts and returns matching results with author, engagement, and timestamp metadata for analysis." },
      { id: "timeline-reads", name: "Timeline Reads", description: "Reads a user's home and profile timelines using their own account permissions granted through OAuth authorization." },
      { id: "trend-analysis", name: "Trend Analysis", description: "Surfaces trending topics and conversation activity so agents can monitor real-time signals on the platform." },
    ],
  },
  {
    name: "OfficeCLI",
    slug: "office-cli",
    description: "Reads, edits, and creates Word, Excel, and PowerPoint files from the command line with no Office install — a single binary built for AI agents to automate documents. 18k+ GitHub stars, Apache-2.0.",
    providerName: "iOfficeAI",
    providerUrl: "https://github.com/iOfficeAI",
    agentUrl: "https://github.com/iOfficeAI/OfficeCLI",
    categories: ["content-media"],
    tags: ["office", "word", "excel", "powerpoint", "document-automation", "cli", "single-binary", "apache-2.0"],
    authType: "none",
    accessMethods: ["cli"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "edit-word", name: "Word Document Editing", description: "Reads and edits .docx files including text, styles, tables, and images programmatically without a Microsoft Office install." },
      { id: "excel-automation", name: "Excel Automation", description: "Creates and modifies .xlsx spreadsheets including cells, formulas, and sheets for agent-driven data workflows." },
      { id: "powerpoint-generation", name: "PowerPoint Generation", description: "Generates and updates .pptx slide decks so agents can assemble presentations from structured input data." },
    ],
  },
  {
    name: "Herdr",
    slug: "herdr",
    description: "Runs and manages multiple coding agents side by side in the terminal — an agent multiplexer to launch, monitor, and switch between parallel AI coding sessions. 17k+ GitHub stars.",
    providerName: "Oğulcan Çelik",
    providerUrl: "https://github.com/ogulcancelik",
    agentUrl: "https://github.com/ogulcancelik/herdr",
    categories: ["orchestration"],
    tags: ["coding-agent", "agent-multiplexer", "terminal", "parallel-agents", "tui", "session-management", "multi-agent"],
    authType: "none",
    accessMethods: ["cli"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "agent-multiplexing", name: "Agent Multiplexing", description: "Runs multiple coding agents concurrently in one terminal, each in its own pane, so you supervise them in parallel." },
      { id: "session-switching", name: "Session Switching", description: "Switches focus between running agent sessions and monitors their live output without leaving the terminal." },
      { id: "workspace-isolation", name: "Workspace Isolation", description: "Keeps each agent scoped to its own working directory so parallel tasks do not collide on shared files." },
    ],
  },
  {
    name: "OpenWiki",
    slug: "openwiki",
    description: "Writes and maintains agent-readable documentation for your codebase from the command line. A LangChain CLI that generates structured wikis coding agents can consult for context. 12k+ stars, MIT.",
    providerName: "LangChain",
    providerUrl: "https://langchain.com",
    agentUrl: "https://github.com/langchain-ai/openwiki",
    categories: ["code-devtools"],
    tags: ["documentation", "codebase", "coding-agent", "cli", "langchain", "context", "auto-docs", "mit-license"],
    authType: "apiKey",
    accessMethods: ["cli"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "doc-generation", name: "Documentation Generation", description: "Scans a repository and generates structured, agent-readable documentation describing modules, APIs, and architecture." },
      { id: "doc-maintenance", name: "Documentation Maintenance", description: "Detects code changes and updates the generated wiki so agent context stays in sync with the codebase." },
      { id: "context-retrieval", name: "Agent Context Retrieval", description: "Provides coding agents with concise, queryable docs to ground their edits in the project's real structure." },
    ],
  },
  {
    name: "Osaurus",
    slug: "osaurus",
    description: "Runs AI agents entirely on your Mac — a native Apple Silicon runtime for local MLX models with shared memory, file access, and an OpenAI-compatible server. Ships CLI and MCP support. MIT, 7k+ stars.",
    providerName: "Osaurus, Inc.",
    providerUrl: "https://osaurus.ai",
    agentUrl: "https://osaurus.ai",
    categories: ["infrastructure"],
    tags: ["local-first", "macos", "apple-silicon", "mlx", "on-device", "mcp", "openai-compatible", "mit-license"],
    authType: "none",
    accessMethods: ["cli", "api", "mcp"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "local-model-runtime", name: "Local Model Runtime", description: "Runs open MLX models on Apple Silicon with no account or internet, keeping all data on the user's Mac." },
      { id: "openai-compatible-server", name: "OpenAI-Compatible Server", description: "Exposes a local OpenAI-compatible API so existing clients and agent frameworks connect without code changes." },
      { id: "mcp-tooling", name: "MCP Tooling", description: "Runs as an MCP server so agents can call local tools and files through the Model Context Protocol." },
    ],
  },
  {
    name: "Google Agents CLI",
    slug: "google-agents-cli",
    description: "Turns any coding assistant into an expert at creating, evaluating, and deploying AI agents on Google Cloud. An open CLI plus skills that scaffold, run evals, and ship to Agent Engine or Cloud Run.",
    providerName: "Google",
    providerUrl: "https://cloud.google.com",
    agentUrl: "https://github.com/google/agents-cli",
    categories: ["code-devtools"],
    tags: ["google-cloud", "agent-development", "scaffolding", "evaluation", "deployment", "cli", "vertex-ai", "agent-engine"],
    authType: "oauth2",
    accessMethods: ["cli"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "agent-scaffolding", name: "Agent Scaffolding", description: "Generates a production-ready agent project structure so a coding assistant can build on Google Cloud conventions." },
      { id: "eval-runs", name: "Evaluation Runs", description: "Runs evaluation suites against an agent and reports quality metrics before it is deployed to production." },
      { id: "cloud-deploy", name: "Cloud Deployment", description: "Deploys agents to Google Cloud Agent Runtime, Cloud Run, or GKE with a single command from the terminal." },
    ],
  },
  {
    name: "Clawk",
    slug: "clawk",
    description: "Gives coding agents a disposable, network-restricted Linux VM with root in the guest while your files and keychain stay out. cd into a repo, type clawk. Written in Go, Apache-2.0. HN 223 points.",
    providerName: "Clawkwork",
    providerUrl: "https://github.com/clawkwork",
    agentUrl: "https://github.com/clawkwork/clawk",
    categories: ["infrastructure"],
    tags: ["sandbox", "isolation", "coding-agent", "linux-vm", "network-restricted", "go", "apache-2.0", "security"],
    authType: "none",
    accessMethods: ["cli"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "disposable-sandbox", name: "Disposable Sandbox", description: "Spins up a throwaway Linux VM per session so agent commands run isolated from the host and vanish afterward." },
      { id: "network-restriction", name: "Network Restriction", description: "Locks down guest network access so an agent cannot exfiltrate data or reach unapproved endpoints." },
      { id: "credential-isolation", name: "Credential Isolation", description: "Keeps host files, SSH keys, and keychain outside the guest so secrets stay protected during agent runs." },
    ],
  },
  {
    name: "Juggler",
    slug: "juggler",
    description: "Presents coding-agent sessions as editable, branching documents instead of a chat log, using CRDT sync and a Miller-columns UI. Go + Wails; BYO key for Claude, OpenAI, Gemini, or Ollama. AGPL-3.0.",
    providerName: "Julian Storer",
    providerUrl: "https://juggler.studio",
    agentUrl: "https://juggler.studio",
    categories: ["code-devtools"],
    tags: ["coding-agent", "crdt", "branching-sessions", "byok", "desktop", "wails", "open-source", "agpl-3.0"],
    authType: "apiKey",
    accessMethods: ["cli"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "branching-sessions", name: "Branching Sessions", description: "Structures each agent session as a tree of editable branches so you can fork, revise, and compare approaches." },
      { id: "editable-context", name: "Editable Context", description: "Lets you inspect and edit the exact context and tool calls sent to the model before continuing a run." },
      { id: "byok-models", name: "Bring-Your-Own-Key Models", description: "Connects to Claude, OpenAI, Gemini, or local Ollama models using your own API keys with no vendor lock-in." },
    ],
  },
  {
    name: "LM Studio",
    slug: "lm-studio",
    description: "Runs open LLMs locally with an OpenAI- and Anthropic-compatible server, the lms CLI, a headless daemon, and MCP support. New Bionic app adds an agent for coding, research, and docs. By Element Labs.",
    providerName: "Element Labs",
    providerUrl: "https://lmstudio.ai",
    agentUrl: "https://lmstudio.ai",
    categories: ["infrastructure"],
    tags: ["local-llm", "on-device", "openai-compatible", "mcp", "cli", "model-runtime", "bionic", "self-hosted"],
    authType: "none",
    accessMethods: ["api", "cli", "mcp"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "local-inference-server", name: "Local Inference Server", description: "Serves open models on localhost with OpenAI- and Anthropic-compatible endpoints for drop-in agent integration." },
      { id: "lms-cli", name: "lms CLI", description: "Manages models, starts servers, and runs chat sessions entirely from the terminal via the lms command." },
      { id: "mcp-support", name: "MCP Support", description: "Connects local models to external tools through Model Context Protocol from LM Studio and the Bionic agent." },
    ],
  },
  {
    name: "OpenManus",
    slug: "openmanus",
    description: "Builds general-purpose autonomous agents that plan, browse the web, run code, and use tools — an open, no-invite-code alternative to Manus from the MetaGPT team. 57k+ GitHub stars, MIT-licensed.",
    providerName: "FoundationAgents",
    providerUrl: "https://github.com/FoundationAgents",
    agentUrl: "https://github.com/FoundationAgents/OpenManus",
    categories: ["orchestration"],
    tags: ["autonomous-agent", "general-purpose", "browser-automation", "tool-use", "metagpt", "open-source", "mit-license"],
    authType: "apiKey",
    accessMethods: ["cli", "api"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: true,
    verified: true,
    skills: [
      { id: "task-planning", name: "Task Planning", description: "Decomposes a natural-language goal into an ordered plan of steps and executes them with the available tools." },
      { id: "browser-automation", name: "Browser Automation", description: "Controls a browser to search, navigate, and extract information as part of an autonomous task run." },
      { id: "code-execution", name: "Code Execution", description: "Writes and runs code in a sandbox to compute results, transform data, or complete programming subtasks." },
    ],
  },
  {
    name: "LibreChat",
    slug: "librechat",
    description: "Self-hosts an open ChatGPT-style platform with custom Agents, MCP tools, Code Interpreter, and multi-provider models. Exposes OpenAPI actions and an API for programmatic use. 40k+ stars, MIT.",
    providerName: "Danny Avila",
    providerUrl: "https://librechat.ai",
    agentUrl: "https://github.com/danny-avila/LibreChat",
    categories: ["infrastructure"],
    tags: ["self-hosted", "agents", "mcp", "code-interpreter", "multi-provider", "openapi", "chat-platform", "mit-license"],
    authType: "apiKey",
    accessMethods: ["api", "mcp"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "custom-agents", name: "Custom Agents", description: "Builds no-code agents that combine models, MCP tools, and OpenAPI actions for repeatable multi-step tasks." },
      { id: "mcp-tools", name: "MCP Tools", description: "Connects agents to external systems through Model Context Protocol servers configured per deployment." },
      { id: "code-interpreter", name: "Code Interpreter", description: "Runs generated code in a secure sandbox to analyze data, produce files, and return results in chat." },
    ],
  },
  {
    name: "Khoj",
    slug: "khoj",
    description: "Self-hostable AI second brain that answers over your documents and the web, runs custom agents, and schedules automations. Offers an API plus Obsidian, Emacs, and desktop clients. 35k+ stars.",
    providerName: "Khoj AI",
    providerUrl: "https://khoj.dev",
    agentUrl: "https://github.com/khoj-ai/khoj",
    categories: ["research"],
    tags: ["second-brain", "personal-search", "custom-agents", "automations", "self-hosted", "obsidian", "deep-research", "agpl-3.0"],
    authType: "apiKey",
    accessMethods: ["api"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "document-qa", name: "Document Q&A", description: "Indexes personal documents and answers questions over them with citations across PDF, Markdown, and notes." },
      { id: "custom-agents", name: "Custom Agents", description: "Creates specialized agents with their own personas, tools, and knowledge bases for recurring workflows." },
      { id: "scheduled-automations", name: "Scheduled Automations", description: "Runs research or notification tasks on a schedule and delivers the results to the user automatically." },
    ],
  },
  {
    name: "Tabby",
    slug: "tabby",
    description: "Self-hosts an open-source AI coding assistant as a Copilot alternative — completion and chat that run on your own GPU, with extensions for 12+ IDEs and a REST API. 33k+ GitHub stars.",
    providerName: "TabbyML",
    providerUrl: "https://tabby.tabbyml.com",
    agentUrl: "https://github.com/TabbyML/tabby",
    categories: ["code-devtools"],
    tags: ["coding-assistant", "code-completion", "self-hosted", "copilot-alternative", "ide", "on-premise", "rest-api"],
    authType: "apiKey",
    accessMethods: ["api"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "code-completion", name: "Code Completion", description: "Provides inline, context-aware code suggestions in the editor, served entirely from self-hosted models." },
      { id: "code-chat", name: "Code Chat", description: "Answers questions and explains or refactors code through an IDE chat panel backed by your own deployment." },
      { id: "repo-context", name: "Repository Context", description: "Indexes the codebase so completions and answers draw on the project's own files and symbols." },
    ],
  },
  {
    name: "Onyx",
    slug: "onyx",
    description: "Open-source enterprise AI search and assistant platform — connects to Slack, GitHub, Confluence, Drive and 40+ sources for RAG-grounded answers and custom agents. Self-hostable. 30k+ stars.",
    providerName: "Onyx",
    providerUrl: "https://onyx.app",
    agentUrl: "https://github.com/onyx-dot-app/onyx",
    categories: ["research"],
    tags: ["enterprise-search", "rag", "connectors", "self-hosted", "knowledge-base", "custom-agents", "slack", "open-source"],
    authType: "apiKey",
    accessMethods: ["api"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "connector-sync", name: "Connector Sync", description: "Syncs content from 40+ sources like Slack, GitHub, and Confluence into a unified, permission-aware index." },
      { id: "grounded-search", name: "Grounded Search", description: "Answers questions with citations by retrieving from connected knowledge and passing it to the chosen LLM." },
      { id: "custom-assistants", name: "Custom Assistants", description: "Configures purpose-built assistants with scoped document sets, prompts, and tools for specific teams." },
    ],
  },
  {
    name: "Suna",
    slug: "suna",
    description: "Open-source generalist AI agent that browses the web, manages files, runs shell commands, and deploys apps from natural-language tasks. Self-hostable, by Kortix. 20k+ GitHub stars.",
    providerName: "Kortix",
    providerUrl: "https://kortix.ai",
    agentUrl: "https://github.com/kortix-ai/suna",
    categories: ["orchestration"],
    tags: ["generalist-agent", "autonomous-agent", "browser-automation", "file-management", "self-hosted", "shell", "open-source"],
    authType: "apiKey",
    accessMethods: ["api"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "web-browsing", name: "Web Browsing", description: "Navigates and extracts data from websites to complete research and data-gathering tasks autonomously." },
      { id: "file-management", name: "File Management", description: "Creates, edits, and organizes files in a workspace to produce documents, code, and structured outputs." },
      { id: "command-execution", name: "Command Execution", description: "Runs shell commands in a sandbox to install tools, process data, and build or deploy applications." },
    ],
  },
  {
    name: "Wren AI",
    slug: "wren-ai",
    description: "Open-source text-to-SQL agent for governed GenBI — ask questions in natural language across 20+ data sources and get accurate SQL, charts, and answers. Ships an MCP server and API. 15k+ GitHub stars.",
    providerName: "Canner",
    providerUrl: "https://getwren.ai",
    agentUrl: "https://github.com/Canner/WrenAI",
    categories: ["data-analytics"],
    tags: ["text-to-sql", "genbi", "business-intelligence", "semantic-layer", "mcp", "data-sources", "open-source"],
    authType: "apiKey",
    accessMethods: ["api", "mcp"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "text-to-sql", name: "Text-to-SQL", description: "Translates natural-language questions into accurate SQL using a semantic layer over connected databases." },
      { id: "genbi-answers", name: "GenBI Answers", description: "Returns summaries, charts, and explanations alongside query results for self-service business intelligence." },
      { id: "semantic-modeling", name: "Semantic Modeling", description: "Defines a governed semantic model so metrics and relationships stay consistent across every query." },
    ],
  },
  {
    name: "Grafana MCP Server",
    slug: "grafana-mcp",
    description: "Connects AI agents to Grafana via an official MCP server — query dashboards, datasources, Prometheus and Loki, and manage alerts and incidents. By Grafana Labs, Apache-2.0. 3k+ GitHub stars.",
    providerName: "Grafana Labs",
    providerUrl: "https://grafana.com",
    agentUrl: "https://github.com/grafana/mcp-grafana",
    categories: ["infrastructure"],
    tags: ["observability", "grafana", "dashboards", "prometheus", "loki", "alerting", "mcp", "official"],
    authType: "apiKey",
    accessMethods: ["mcp"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "dashboard-search", name: "Dashboard Search", description: "Finds and reads Grafana dashboards and panels so agents can reference existing visualizations and queries." },
      { id: "datasource-query", name: "Datasource Query", description: "Runs queries against Prometheus, Loki, and other datasources to pull metrics and logs into an agent." },
      { id: "incident-management", name: "Incident Management", description: "Lists and updates alerts and incidents so agents can triage and act on observability events." },
    ],
  },
  {
    name: "Rasa",
    slug: "rasa",
    description: "Open-source framework for building text and voice conversational agents — combines NLU, dialogue management, and its CALM LLM-native approach. 21k+ GitHub stars, Apache-2.0. Python framework and CLI.",
    providerName: "Rasa",
    providerUrl: "https://rasa.com",
    agentUrl: "https://github.com/RasaHQ/rasa",
    categories: ["customer-support"],
    tags: ["conversational-ai", "nlu", "dialogue-management", "chatbot", "voice", "python", "calm", "apache-2.0"],
    authType: "none",
    accessMethods: ["cli", "api"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "nlu", name: "Intent & Entity Recognition", description: "Classifies user intents and extracts entities from messages to drive structured conversational logic." },
      { id: "dialogue-management", name: "Dialogue Management", description: "Tracks conversation state and decides the next action or response across multi-turn dialogues." },
      { id: "calm-agents", name: "CALM Agents", description: "Builds LLM-native assistants that follow business logic reliably using Conversational AI with Language Models." },
    ],
  },
  {
    name: "Instructor",
    slug: "instructor",
    description: "Gets structured, validated outputs from LLMs using Pydantic models — type-safe extraction with automatic retries across 15+ providers. 6M+ monthly downloads, 13k+ GitHub stars. MIT-licensed.",
    providerName: "567 Labs",
    providerUrl: "https://python.useinstructor.com",
    agentUrl: "https://github.com/567-labs/instructor",
    categories: ["code-devtools"],
    tags: ["structured-output", "pydantic", "validation", "type-safe", "extraction", "python", "function-calling", "mit-license"],
    authType: "apiKey",
    accessMethods: ["api"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "structured-extraction", name: "Structured Extraction", description: "Extracts data into typed Pydantic models from LLM responses, guaranteeing the shape your code expects." },
      { id: "automatic-retries", name: "Automatic Retries", description: "Re-prompts the model on validation failures until the output conforms to the requested schema." },
      { id: "multi-provider", name: "Multi-Provider Support", description: "Works across 15+ LLM providers with one consistent API for structured, validated responses." },
    ],
  },
  {
    name: "Outlines",
    slug: "outlines",
    description: "Guarantees LLM outputs conform to a schema, regex, or grammar through structured generation — reliable JSON, function calls, and constrained decoding. By .txt (dottxt-ai). 14k+ stars, Apache-2.0.",
    providerName: ".txt",
    providerUrl: "https://dottxt.co",
    agentUrl: "https://github.com/dottxt-ai/outlines",
    categories: ["code-devtools"],
    tags: ["structured-generation", "constrained-decoding", "json-schema", "regex", "grammar", "python", "apache-2.0"],
    authType: "none",
    accessMethods: ["api"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "constrained-decoding", name: "Constrained Decoding", description: "Forces token generation to follow a regex, JSON schema, or context-free grammar so output is always valid." },
      { id: "json-generation", name: "Schema-Bound JSON", description: "Generates JSON that provably matches a Pydantic or JSON Schema definition without any post-hoc parsing." },
      { id: "grammar-guidance", name: "Grammar-Guided Output", description: "Constrains model output to a formal grammar for structured formats like SQL or custom domain languages." },
    ],
  },
  {
    name: "Guidance",
    slug: "guidance",
    description: "Programs LLM output with interleaved generation, control flow, and constraints — regex, grammars, and tool calls in one Python paradigm for faster, structured results. 21k+ GitHub stars, MIT-licensed.",
    providerName: "guidance-ai",
    providerUrl: "https://github.com/guidance-ai",
    agentUrl: "https://github.com/guidance-ai/guidance",
    categories: ["code-devtools"],
    tags: ["constrained-generation", "control-flow", "grammar", "regex", "structured-output", "python", "mit-license"],
    authType: "none",
    accessMethods: ["api"],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "interleaved-generation", name: "Interleaved Generation", description: "Mixes prompting, generation, and program logic in one flow so you steer the model step by step." },
      { id: "constraint-enforcement", name: "Constraint Enforcement", description: "Restricts output with regex and context-free grammars to guarantee well-formed, structured results." },
      { id: "token-efficiency", name: "Token Efficiency", description: "Reuses key-value caches and avoids redundant tokens to cut latency and cost on structured prompts." },
    ],
  },
  {
    name: "Emergent",
    slug: "emergent",
    description: "Builds production-ready full-stack apps from natural language with a team of coordinated AI agents. Syncs code to GitHub; connects Stripe, Supabase, and external APIs. $1.5B-valued.",
    providerName: "Emergent",
    providerUrl: "https://emergent.sh",
    agentUrl: "https://help.emergent.sh",
    categories: ["code-devtools"],
    tags: ["app-builder", "full-stack", "vibe-coding", "multi-agent", "no-code", "github-sync", "deployment"],
    authType: "apiKey",
    accessMethods: ["api"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "full-stack-generation", name: "Full-Stack Generation", description: "Generates frontend, backend, database, and auth as real production-grade code from a natural-language prompt." },
      { id: "multi-agent-build", name: "Multi-Agent Build", description: "Coordinates architect, designer, developer, integration, and PM agents to plan, build, and debug the app." },
      { id: "deploy-and-own", name: "Deploy & Own", description: "Ships apps to containerized cloud infrastructure and syncs the code to your GitHub repo for full ownership." },
    ],
  },
  {
    name: "dd-cli",
    slug: "doordash-cli",
    description: "Lets AI agents place real DoorDash orders from the terminal — search stores, find deals, build carts, and check out via agentic commerce. Limited beta (US/Canada, macOS, waitlist). Launched July 2026.",
    providerName: "DoorDash",
    providerUrl: "https://doordash.com",
    agentUrl: "https://www.neura.market/news/doordash-command-line-tool-ai-agents",
    categories: ["commerce-payments"],
    tags: ["agentic-commerce", "food-delivery", "doordash", "ordering", "terminal", "checkout", "beta"],
    authType: "oauth2",
    accessMethods: ["cli", "mcp"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "store-search", name: "Store Search", description: "Searches DoorDash stores and menus so an agent can find restaurants and items matching a user's request." },
      { id: "cart-checkout", name: "Cart & Checkout", description: "Builds a cart and completes checkout through DoorDash's ordering infrastructure directly from the agent." },
      { id: "deal-discovery", name: "Deal Discovery", description: "Finds current deals and promotions so agents can optimize an order for price before placing it." },
    ],
  },
  {
    name: "Apify MCP Server",
    slug: "apify-mcp",
    description: "Runs thousands of ready-made Apify Actors through an official MCP server — scrape social media, search engines, maps, and e-commerce, then access datasets and run results. MIT, 2k+ GitHub stars.",
    providerName: "Apify",
    providerUrl: "https://apify.com",
    agentUrl: "https://github.com/apify/apify-mcp-server",
    categories: ["data-analytics"],
    tags: ["web-scraping", "actors", "data-extraction", "crawling", "mcp", "datasets", "official", "mit-license"],
    authType: "apiKey",
    accessMethods: ["mcp"],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      { id: "actor-execution", name: "Actor Execution", description: "Runs any of thousands of Apify Actors with automatic schema validation to scrape or automate a target site." },
      { id: "dataset-retrieval", name: "Dataset Retrieval", description: "Fetches stored datasets and key-value records from Actor runs so agents can consume the scraped results." },
      { id: "rag-web-browser", name: "RAG Web Browser", description: "Searches the web through the pre-configured RAG Web Browser and returns page content for grounding." },
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

// ── Category ID map ──────────────────────────────────────────────
// NOTE: verify against the live CMS with `npx tsx scripts/cms.ts categories`.

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

// ── CMA helpers (shared plumbing in scripts/lib/cma.ts) ──────────

async function createAgent(agent: AgentInput): Promise<'created' | 'skipped' | 'error'> {
  // Validate description length
  if (agent.description.length > 200) {
    console.log(`  ❌ ${agent.name}: description too long (${agent.description.length} chars > 200)`);
    return 'error';
  }

  const existing = await findEntryBySlug('agent', agent.slug);
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
