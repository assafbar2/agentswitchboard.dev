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
  // Mode B — Top 50 Audit 2026-05-13
  {
    name: 'Ollama',
    slug: 'ollama',
    description: 'Run LLMs locally — Llama, Mistral, Gemma, DeepSeek, and 100+ models via CLI and REST API. OpenAI-compatible endpoint at localhost:11434 for direct agent integration.',
    providerName: 'Ollama',
    providerUrl: 'https://ollama.com',
    agentUrl: 'https://github.com/ollama/ollama',
    categories: ['infrastructure'],
    tags: ['local-llm', 'llm-runtime', 'openai-compatible', 'model-serving', 'self-hosted', 'llama', 'mistral'],
    authType: 'none',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'local-model-serve',
        name: 'Local Model Serving',
        description: 'Serve 100+ open-source LLMs locally with one command; auto-downloads models on first request.',
      },
      {
        id: 'openai-api',
        name: 'OpenAI-Compatible API',
        description: 'Call local models via the same endpoints as OpenAI — drop-in replacement for any OpenAI SDK integration.',
      },
      {
        id: 'model-management',
        name: 'Model Management',
        description: 'Pull, list, copy, delete, and inspect GGUF quantized models from the Ollama model registry.',
      },
    ],
  },
  {
    name: 'Langflow',
    slug: 'langflow',
    description: 'Visual builder for AI agents and workflows — drag-and-drop graphs compiled to REST endpoints. Every flow becomes an MCP server. pip install langflow. 148k stars.',
    providerName: 'DataStax',
    providerUrl: 'https://langflow.org',
    agentUrl: 'https://docs.langflow.org',
    categories: ['infrastructure'],
    tags: ['visual-builder', 'workflow-builder', 'low-code', 'rest-api', 'mcp-server', 'agent-orchestration', 'langchain'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'visual-workflow',
        name: 'Visual Workflow Builder',
        description: 'Build AI pipelines with drag-and-drop components — models, tools, memory, and custom logic nodes.',
      },
      {
        id: 'flow-api',
        name: 'Flow REST API',
        description: 'Every flow auto-generates a REST API endpoint for integration into any application or agent pipeline.',
      },
      {
        id: 'mcp-export',
        name: 'MCP Server Export',
        description: 'Expose any Langflow flow as a streamable MCP server — connect to Cursor, Claude, or any MCP client.',
      },
    ],
  },
  {
    name: 'Open WebUI',
    slug: 'open-webui',
    description: 'Self-hosted AI platform with OpenAI-compatible REST API, MCP support, and a pipelines SDK. Supports Ollama, OpenAI, Anthropic, vLLM. pip install open-webui.',
    providerName: 'Open WebUI',
    providerUrl: 'https://openwebui.com',
    agentUrl: 'https://docs.openwebui.com',
    categories: ['infrastructure'],
    tags: ['self-hosted', 'openai-compatible', 'ollama', 'mcp-client', 'rag', 'pipeline-sdk', 'multi-model'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'openai-api-proxy',
        name: 'OpenAI-Compatible API',
        description: 'Expose any local or cloud model through an OpenAI-compatible REST API for drop-in agent integration.',
      },
      {
        id: 'model-management',
        name: 'Model Management',
        description: 'Manage, switch, and configure multiple AI models from one platform with user-level access control.',
      },
      {
        id: 'pipeline-sdk',
        name: 'Pipeline SDK',
        description: 'Build custom processing pipelines — filters, actions, manifolds — deployed as OpenAI-compatible endpoints.',
      },
    ],
  },
  {
    name: 'vLLM',
    slug: 'vllm',
    description: 'High-throughput LLM inference server with OpenAI-compatible API. Serves Llama, Mistral, Qwen, and 30+ model families with PagedAttention. pip install vllm.',
    providerName: 'vLLM Project',
    providerUrl: 'https://docs.vllm.ai',
    agentUrl: 'https://docs.vllm.ai',
    categories: ['infrastructure'],
    tags: ['llm-serving', 'inference-server', 'openai-compatible', 'paged-attention', 'high-throughput', 'self-hosted', 'gpu-inference'],
    authType: 'none',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'openai-serving',
        name: 'OpenAI-Compatible Serving',
        description: 'Serve any HuggingFace model as an OpenAI-compatible API endpoint with full streaming and function calling.',
      },
      {
        id: 'paged-attention',
        name: 'PagedAttention Engine',
        description: 'Handle thousands of concurrent requests via PagedAttention KV cache — 24x throughput over naive HuggingFace inference.',
      },
      {
        id: 'multi-model',
        name: 'Multi-Model Support',
        description: 'Deploy 30+ model architectures including Llama, Mistral, Qwen, Falcon, Phi, and Mixtral from one server.',
      },
    ],
  },
  {
    name: 'RAGFlow',
    slug: 'ragflow',
    description: 'Open-source RAG engine with deep document parsing (tables, charts, images) and an official MCP server. Deploy via Docker, call via REST API. 80k GitHub stars.',
    providerName: 'InfiniFlow',
    providerUrl: 'https://ragflow.io',
    agentUrl: 'https://ragflow.io/docs/dev',
    categories: ['research', 'infrastructure'],
    tags: ['rag', 'document-parsing', 'knowledge-base', 'mcp-server', 'agent-rag', 'self-hosted', 'deep-doc'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'deep-document-parse',
        name: 'Deep Document Parse',
        description: 'Parse complex documents — tables, charts, multi-column layouts — with layout-aware chunking for accurate retrieval.',
      },
      {
        id: 'knowledge-retrieval',
        name: 'Knowledge Retrieval',
        description: 'Query ingested knowledge bases via hybrid search (semantic + keyword) with source-cited answers.',
      },
      {
        id: 'agent-workflows',
        name: 'Agent Workflows',
        description: 'Build multi-step agentic workflows in a canvas UI that call RAG, APIs, and external tools in sequence.',
      },
    ],
  },
  {
    name: 'LiteLLM',
    slug: 'litellm',
    description: 'AI gateway unifying 100+ LLM providers under one OpenAI-compatible API. Cost tracking, guardrails, load balancing. pip install litellm. 47k GitHub stars.',
    providerName: 'BerriAI',
    providerUrl: 'https://litellm.ai',
    agentUrl: 'https://docs.litellm.ai',
    categories: ['infrastructure'],
    tags: ['llm-gateway', 'openai-compatible', 'cost-tracking', 'load-balancing', 'ai-proxy', 'multi-provider', 'guardrails'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'provider-unification',
        name: 'Provider Unification',
        description: 'Call OpenAI, Anthropic, Azure, Bedrock, Vertex AI, and 95+ providers through one unified API format.',
      },
      {
        id: 'spend-tracking',
        name: 'Spend Tracking',
        description: 'Track and budget LLM spend per user, team, or API key with automatic cost attribution across all providers.',
      },
      {
        id: 'load-balancing',
        name: 'Load Balancing',
        description: 'Distribute requests across multiple model deployments with fallback routing and rate limit management.',
      },
    ],
  },
  {
    name: 'Milvus',
    slug: 'milvus',
    description: 'High-performance open-source vector database with REST API, gRPC, and an official MCP server. Stores billions of vectors for semantic search, RAG, and agent memory.',
    providerName: 'Zilliz',
    providerUrl: 'https://milvus.io',
    agentUrl: 'https://milvus.io/docs',
    categories: ['vector-databases'],
    tags: ['vector-database', 'semantic-search', 'rag', 'mcp-server', 'embeddings', 'billion-scale', 'agent-memory'],
    authType: 'apiKey',
    accessMethods: ['api', 'mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'vector-search',
        name: 'Vector Similarity Search',
        description: 'Search billions of vectors by cosine, inner product, or L2 distance with millisecond latency at scale.',
      },
      {
        id: 'hybrid-search',
        name: 'Hybrid Search',
        description: 'Combine dense vector search with sparse keyword retrieval for accurate RAG pipeline retrieval results.',
      },
      {
        id: 'mcp-integration',
        name: 'MCP Integration',
        description: 'Query and manage Milvus collections from any MCP client via the official zilliztech MCP server.',
      },
    ],
  },
  {
    name: 'Aider',
    slug: 'aider',
    description: 'AI pair programmer for your terminal — edit code across your entire codebase with Claude, GPT, or DeepSeek. 44k GitHub stars, 5M+ PyPI downloads.',
    providerName: 'Aider AI',
    providerUrl: 'https://aider.chat',
    agentUrl: 'https://aider.chat/docs/install.html',
    categories: ['code-devtools'],
    tags: ['ai-coding', 'pair-programming', 'terminal-coding', 'multi-model', 'git-integration', 'codebase-editing', 'cli-coding'],
    authType: 'apiKey',
    accessMethods: ['cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'multi-file-edit',
        name: 'Multi-File Editing',
        description: 'Edit multiple source files in one shot based on natural language instructions with automatic git commits.',
      },
      {
        id: 'architect-mode',
        name: 'Architect Mode',
        description: 'Use a powerful model to plan changes and a cheaper model to apply edits — optimizing cost and quality.',
      },
      {
        id: 'repo-map',
        name: 'Repo Map',
        description: 'Build a concise map of your codebase so the LLM understands full structure without loading every file.',
      },
    ],
  },
  {
    name: 'OpenHands',
    slug: 'openhands',
    description: 'Software engineering agent platform — runs in sandboxed Docker containers, edits code, runs tests, fixes bugs, and opens PRs. REST API and WebSocket for remote access.',
    providerName: 'All Hands AI',
    providerUrl: 'https://www.all-hands.dev',
    agentUrl: 'https://docs.all-hands.dev',
    categories: ['code-devtools', 'browser-computer'],
    tags: ['software-agent', 'code-execution', 'github-integration', 'sandboxed', 'docker', 'ai-developer', 'websocket-api'],
    authType: 'bearer',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'code-agent',
        name: 'Code Agent',
        description: 'Autonomously write, edit, run, and test code across entire codebases in an isolated Docker container.',
      },
      {
        id: 'github-integration',
        name: 'GitHub Integration',
        description: 'Resolve GitHub issues end-to-end: branch, commit, push, and open pull requests automatically.',
      },
      {
        id: 'remote-api',
        name: 'Remote API Access',
        description: 'Drive OpenHands agents programmatically via REST API and WebSocket for CI/CD and tooling integration.',
      },
    ],
  },
  {
    name: 'LangGraph',
    slug: 'langgraph',
    description: 'Graph-based agent orchestration with stateful multi-actor workflows. Deploy agents as REST APIs via LangGraph Platform. 32k stars, 34M monthly PyPI downloads.',
    providerName: 'LangChain AI',
    providerUrl: 'https://www.langchain.com',
    agentUrl: 'https://langchain-ai.github.io/langgraph',
    categories: ['infrastructure'],
    tags: ['agent-orchestration', 'stateful-agents', 'graph-workflows', 'multi-agent', 'checkpointing', 'human-in-the-loop', 'langchain'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'stateful-graphs',
        name: 'Stateful Agent Graphs',
        description: 'Build agent workflows as typed state graphs with persistent checkpointing and resumable execution.',
      },
      {
        id: 'human-in-loop',
        name: 'Human-in-the-Loop',
        description: 'Pause agent execution at any graph node for human review, approval, or input before continuing.',
      },
      {
        id: 'platform-deploy',
        name: 'Platform Deployment',
        description: 'Deploy agent graphs as scalable REST APIs with built-in streaming, memory, and observability via LangGraph Platform.',
      },
    ],
  },
  {
    name: 'Figma Context MCP',
    slug: 'figma-context-mcp',
    description: 'MCP server exposing Figma designs to AI coding agents — read layout, styles, and component structure for one-shot design-to-code. 14k GitHub stars.',
    providerName: 'GLips',
    providerUrl: 'https://github.com/GLips/Figma-Context-MCP',
    agentUrl: 'https://github.com/GLips/Figma-Context-MCP',
    categories: ['code-devtools', 'content-media'],
    tags: ['figma', 'design-to-code', 'ui-components', 'mcp-server', 'cursor-integration', 'design-tokens', 'figma-api'],
    authType: 'apiKey',
    accessMethods: ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'design-context',
        name: 'Design Context Fetch',
        description: 'Retrieve Figma frame layouts, component hierarchy, and style data for any node or selection in your file.',
      },
      {
        id: 'image-download',
        name: 'Image Download',
        description: 'Download Figma images and assets directly into your project directory for design-to-code workflows.',
      },
      {
        id: 'design-to-code',
        name: 'Design-to-Code',
        description: 'Feed exact Figma dimensions, colors, and component structure to AI for pixel-accurate UI generation.',
      },
    ],
  },
  {
    name: 'Task Master',
    slug: 'task-master',
    description: 'AI-powered task management for software projects — breaks PRDs into tasks, tracks dependencies, and provides per-task context. MCP server and CLI. 27k GitHub stars.',
    providerName: 'eyaltoledano',
    providerUrl: 'https://github.com/eyaltoledano/claude-task-master',
    agentUrl: 'https://github.com/eyaltoledano/claude-task-master',
    categories: ['code-devtools', 'scheduling'],
    tags: ['task-management', 'prd-parsing', 'mcp-server', 'cursor-integration', 'project-planning', 'dependency-tracking', 'agent-workflow'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'prd-breakdown',
        name: 'PRD Task Breakdown',
        description: 'Parse product requirements documents into structured, dependency-ordered task lists using AI.',
      },
      {
        id: 'task-management',
        name: 'Task Management',
        description: 'Create, update, expand, and track task statuses across software projects via MCP or CLI commands.',
      },
      {
        id: 'context-generation',
        name: 'Context Generation',
        description: 'Generate implementation-ready context for each task including relevant files, dependencies, and acceptance criteria.',
      },
    ],
  },
  {
    name: 'Google MCP Toolbox',
    slug: 'google-mcp-toolbox',
    description: 'Official Google MCP server for 30+ databases — BigQuery, Postgres, AlloyDB, Spanner, MySQL, Redis, Neo4j. YAML-configured, enterprise-grade database access for agents.',
    providerName: 'Google',
    providerUrl: 'https://googleapis.github.io/genai-toolbox/',
    agentUrl: 'https://github.com/googleapis/mcp-toolbox',
    categories: ['infrastructure', 'data-analytics'],
    tags: ['google', 'bigquery', 'postgres', 'alloydb', 'spanner', 'mcp-server', 'database-agent'],
    authType: 'apiKey',
    accessMethods: ['mcp', 'cli'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'database-query',
        name: 'Multi-Database Query',
        description: 'Execute queries across BigQuery, Postgres, AlloyDB, Spanner, MySQL, Redis, and Neo4j from any MCP client.',
      },
      {
        id: 'tool-configuration',
        name: 'Tool Configuration',
        description: 'Define database tools via YAML — parameterized queries, connection pools, auth — without writing server code.',
      },
      {
        id: 'cloud-native-auth',
        name: 'Cloud-Native Auth',
        description: 'Authenticate to Google Cloud databases using Application Default Credentials with zero manual token management.',
      },
    ],
  },
  {
    name: 'Agno',
    slug: 'agno',
    description: 'Python framework for building multi-agent platforms — define agents in code, deploy as FastAPI services. 40k GitHub stars. Supports MCP, 20+ models, memory layers.',
    providerName: 'Agno',
    providerUrl: 'https://docs.agno.com',
    agentUrl: 'https://github.com/agno-agi/agno',
    categories: ['infrastructure'],
    tags: ['agent-framework', 'multi-agent', 'fastapi', 'mcp-client', 'python-sdk', 'tool-use', 'memory-management'],
    authType: 'apiKey',
    accessMethods: ['api', 'cli'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'agent-definition',
        name: 'Agent Definition',
        description: 'Define agents with model, tools, instructions, memory, and storage in a few lines of Python code.',
      },
      {
        id: 'team-orchestration',
        name: 'Team Orchestration',
        description: 'Coordinate multi-agent teams with route, collaborate, or coordinate modes for complex task delegation.',
      },
      {
        id: 'fastapi-deploy',
        name: 'FastAPI Deployment',
        description: 'Deploy any agent as a production FastAPI endpoint with session management and streaming support.',
      },
    ],
  },
  {
    name: 'Pydantic AI',
    slug: 'pydantic-ai',
    description: 'Type-safe Python agent framework from the Pydantic team. Built-in MCP client, ships a sandboxed Python execution MCP server. pip install pydantic-ai. 17k stars.',
    providerName: 'Pydantic',
    providerUrl: 'https://ai.pydantic.dev',
    agentUrl: 'https://ai.pydantic.dev/docs',
    categories: ['infrastructure'],
    tags: ['type-safe', 'agent-framework', 'mcp-client', 'python-sdk', 'structured-output', 'dependency-injection', 'pydantic'],
    authType: 'apiKey',
    accessMethods: ['cli', 'mcp'],
    supportsStreaming: true,
    supportsPushNotifications: false,
    featured: false,
    verified: true,
    skills: [
      {
        id: 'typed-agents',
        name: 'Typed Agent Definitions',
        description: 'Define agents with type-validated inputs, outputs, and dependency injection using familiar Pydantic models.',
      },
      {
        id: 'mcp-client',
        name: 'MCP Client Integration',
        description: 'Connect any MCP server as a tool provider for agents with automatic schema validation and type safety.',
      },
      {
        id: 'python-execution',
        name: 'Sandboxed Python Execution',
        description: 'Run Python code in a sandboxed MCP server (mcp-run-python) — an official server bundled with the SDK.',
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
