---
name: agent-switchboard
description: Search Agent Switchboard, a public directory of vetted AI agents, MCP servers, and agentic developer tools. Use when the user asks to find an agent or tool that does X, compare listed products, look up a listing by name, or list directory categories.
---

# Agent Switchboard

Agent Switchboard (https://agentswitchboard.dev) is a curated **discovery directory**. It answers “does a listed agent exist for this job, and how do I reach it?” It does **not** call the listed products, send email, browse the web as those products, or hold user accounts.

Maintainer: Barnir — barnir@agentmail.to

## When to use this connector

- The user wants an AI agent, MCP server, CLI, or HTTP API for a task (email, browser automation, voice, code review, …).
- The user asks whether a named product is listed, and how it is reached (API / MCP / CLI / browser extension).
- The user wants categories or a short comparison of listed options.

Do not use this connector to operate a listed product. After you return a listing, send the user to that product’s `homepage` (and its own auth). Switchboard never has those credentials.

## Authentication

**None.** Do not ask the user for an Agent Switchboard API key, OAuth login, or Bearer token. Do not invent one. Every catalog endpoint below is a public HTTPS GET.

## How to call it

Base URL: `https://agentswitchboard.dev`

Prefer REST. OpenAPI: https://agentswitchboard.dev/openapi.json

1. Optional: `GET /api/categories` when you need valid category slugs and counts.
2. `GET /api/agents?q={text}&limit=10` to search. Add `category={slug}` and/or `access=mcp` (comma-separate to require several: `access=api,mcp`).
3. `GET /api/agents/{slug}` for skills, `authType` of the **listed product**, tags, and homepage.

Query notes:

- `q` — free text over name, description, skills, categories, tags, provider. Omit or empty to list (catalog order).
- `access` — `api` | `mcp` | `cli` | `browser-extension`. Unknown values are ignored.
- `limit` — 1–50, default 10. `offset` pages through `total`.

Unknown slugs return HTTP 404 `{ "error": "not_found", "message": "…" }`. Search again; do not retry the same slug.

Bulk dump (large): `GET /agents.json`. Prefer search for user questions.

Optional MCP (only if the client speaks MCP, not required): `POST https://agentswitchboard.dev/api/mcp` with tools `search_agents`, `get_agent`, `list_categories`.

## How to answer the user

- Name the listing, one-line description, access methods, and the Switchboard URL (`url`) plus provider `homepage` from the detail endpoint.
- If several matches, pick the top few and say that more exist (`total`).
- If nothing matches, say so and offer a broader `q` or a category from `/api/categories`.
- `authType` on a listing (`apiKey`, `oauth2`, `bearer`, `none`) is how **that product** authenticates — not Switchboard.
- `verified: true` means Switchboard marked the listing verified; it is not a Meta or Muse certification.

## Hard limits

- Read-only. There is no write, purchase, or “connect this agent as the user” call on Switchboard.
- Do not scrape HTML when these endpoints exist.
- Do not pretend Switchboard hosts or proxies listed APIs.
- Fair use: the API is cached (~5 minutes). Do not hammer it.

## Example prompts this should handle

- “Find an MCP server for sending email.”
- “Which listed agents are both API and MCP in code-devtools?”
- “Look up AgentMail on Agent Switchboard.”
- “What categories exist on Agent Switchboard?”

## Example calls

```
GET https://agentswitchboard.dev/api/agents?q=email&limit=5
GET https://agentswitchboard.dev/api/agents?access=mcp&category=code-devtools&limit=10
GET https://agentswitchboard.dev/api/agents/agentmail
GET https://agentswitchboard.dev/api/categories
```

Privacy: https://agentswitchboard.dev/privacy  
Terms: https://agentswitchboard.dev/terms  
Human docs: https://agentswitchboard.dev/for-agents  
Support: barnir@agentmail.to
