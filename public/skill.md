---
name: agent-switchboard
description: Search Agent Switchboard, a public, curated directory of AI agents, MCP servers, and agentic developer tools. Use when the user asks to find an agent or tool that does X, starts from a job ("I need to query a database") and wants the tools that do it, compares listed products, looks up a listing by name, lists directory categories, or wants a set of tools that work together for one job.
---

# Agent Switchboard

Agent Switchboard (https://agentswitchboard.dev) is a curated **discovery directory**. It answers “does a listed agent exist for this job, and how do I reach it?” It does **not** call the listed products, send email, browse the web as those products, or hold user accounts.

Maintainer: Barnir — barnir@agentmail.to

## When to use this connector

- The user wants an AI agent, MCP server, CLI, or HTTP API for a task (email, browser automation, voice, code review, …).
- The user names a job rather than a product (“I need to query a database”, “transcribe audio”): Switchboard's tasks list the listings that do it, best fit first, with why each one fits.
- The user asks whether a named product is listed, and how it is reached (API / MCP / CLI / browser extension).
- The user wants categories or a short comparison of listed options.
- The user wants a set of tools that work together for one job (a research setup, a voice agent, iPhone and Android app builds): Switchboard's stacks.

Do not use this connector to operate a listed product. After you return a listing, send the user to that product’s `homepage` (and its own auth). Switchboard never has those credentials.

## Authentication

**None.** Do not ask the user for an Agent Switchboard API key, OAuth login, or Bearer token. Do not invent one. Every catalog endpoint below is a public HTTPS GET.

## How to call it

Base URL: `https://agentswitchboard.dev`

Prefer REST. OpenAPI: https://agentswitchboard.dev/openapi.json

1. Optional: `GET /api/categories` when you need valid category slugs and counts.
2. `GET /api/agents?q={text}&limit=10` to search. Add `category={slug}`, `access=mcp` (comma-separate to require several: `access=api,mcp`), `official=true` (first-party listings from major vendors only), `verified=true`, and/or `auth=none` (no key or sign-in needed). `sort=newest` lists the most recently added first.
3. `GET /api/agents/{slug}` for skills, `authType` of the **listed product**, tags, and homepage.
4. `GET /api/tasks` for tasks: jobs (“query a database”), each with the number of listings that do it. Add `task={slug}` to `/api/agents` to keep only those listings, best fit first, or `GET /api/tasks/{slug}` for the best fits with a `why` line each.
5. `GET /api/stacks` for stacks: listings picked to do one job together, in order, each with a `why` line. `GET /api/stacks/{slug}` for one.

Query notes:

- `q` — free text over name, description, skills, categories, tags, provider. Omit or empty to list (catalog order: featured first, then A→Z).
- `task` — a task slug from `/api/tasks`: keeps the listings that do that job. With no `q`, results are best fit first. An unknown slug is HTTP 400 `{ "error": "unknown_task" }`; list the tasks and pick one.
- `access` — `api` | `mcp` | `cli` | `browser-extension`. `extension` is accepted as an alias of `browser-extension`. Unknown values are ignored.
- `auth` — `none` | `apiKey` | `oauth2` | `bearer`: how the **listed product** authenticates. Comma-separate to accept any of them (`auth=none,apiKey`).
- `sort` — `relevance` (default; best fit first with a `task`) | `newest` | `skills` (most first) | `name` (A→Z).
- `limit` — 1–50, default 10. `offset` pages through `total`.

Unknown slugs return HTTP 404 `{ "error": "not_found", "message": "…" }`. Search again; do not retry the same slug.

Bulk dump (large): `GET /agents.json`. Prefer search for user questions.

Optional MCP (only if the client speaks MCP, not required): `POST https://agentswitchboard.dev/api/mcp` with tools `search_agents` (the same filters and `sort`), `get_agent`, `list_categories`.

## How to answer the user

- Name the listing, one-line description, access methods, and the Switchboard URL (`url`) plus provider `homepage` from the detail endpoint.
- If several matches, pick the top few and say that more exist (`total`).
- If nothing matches, say so and offer a broader `q` or a category from `/api/categories`.
- `authType` on a listing (`apiKey`, `oauth2`, `bearer`, `none`) is how **that product** authenticates — not Switchboard.
- `verified: true` — Verified: we checked it works — its URLs load and its declared access (API, MCP, CLI or extension) responds. Re-checked monthly; the label drops if it stops working. It is Switchboard's own check, not a Meta or Muse certification.
- `official: true` — Official: a first-party listing, published by the company behind the product under its own domain or GitHub org (e.g. Notion's own Notion MCP, not a community build), where that company is a major vendor (publicly traded, a frontier AI lab, or valued around $1B+). It records who publishes the product, not a paid placement, and is separate from Verified. Add `official=true` to search when the user wants the official tool.
- `featured: true` — Featured: set only by the maintainer. With no search text, results list featured listings first, then A→Z; with search text, results are ranked by relevance and equal scores keep that featured-first order.

## Hard limits

- Read-only. There is no write, purchase, or “connect this agent as the user” call on Switchboard.
- Do not scrape HTML when these endpoints exist.
- Do not pretend Switchboard hosts or proxies listed APIs.
- Fair use: the API is cached (~5 minutes). Do not hammer it.

## Example prompts this should handle

- “Find an MCP server for sending email.”
- “Which listed agents are both API and MCP in code-devtools?”
- “What are the newest MCP servers that don't need an API key?”
- “I need to query a database. Which MCP servers can do that?”
- “Look up AgentMail on Agent Switchboard.”
- “What categories exist on Agent Switchboard?”
- “What tools would I need to build a realtime voice agent?”

## Example calls

```
GET https://agentswitchboard.dev/api/agents?q=email&limit=5
GET https://agentswitchboard.dev/api/agents?access=mcp&category=code-devtools&limit=10
GET https://agentswitchboard.dev/api/agents?access=mcp&auth=none&sort=newest&limit=10
GET https://agentswitchboard.dev/api/agents/agentmail
GET https://agentswitchboard.dev/api/categories
GET https://agentswitchboard.dev/api/tasks
GET https://agentswitchboard.dev/api/agents?task=query-a-database&access=mcp&limit=5
GET https://agentswitchboard.dev/api/stacks
```

Privacy: https://agentswitchboard.dev/privacy  
Terms: https://agentswitchboard.dev/terms  
Human docs: https://agentswitchboard.dev/for-agents  
Support: barnir@agentmail.to
