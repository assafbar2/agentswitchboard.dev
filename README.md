# Agent Switchboard

**The curated directory for the agentic web** — AI agents, MCP servers, and
agentic tools with real API, MCP, CLI, or browser-extension access. Live at
**[agentswitchboard.dev](https://agentswitchboard.dev)**.

A listing marked **Verified** is one we checked works: its URLs load and its
declared access (API, MCP, CLI or extension) responds. Re-checked monthly; the
label drops if it stops working. Beside the badge, listing pages and the
homepage answer say "Verified: link and access path checked, <month>", dated by
the listing's last update (there is no separate recheck log), linking the
explanation on [/about](https://agentswitchboard.dev/about#verification).

The homepage starts from the job: one box, "What do you need your agent to
do?", answered in place by `recommend` (one pick, why, the next step with its
config to copy, its limitations and two alternatives), with a worked example
shown before you type. Catalog search ([/browse](https://agentswitchboard.dev/browse))
and the multi-step [Operator](https://agentswitchboard.dev/operator) are links under it.

## 🔌 This directory is itself an MCP server

Point any MCP client at it and query the catalog with native tools:

```json
{
  "mcpServers": {
    "agentswitchboard": { "url": "https://agentswitchboard.dev/api/mcp" }
  }
}
```

Tools: `search_agents` · `get_agent` · `list_categories` · `compare_agents` ·
`alternatives_to` · `connect_bundle` (one MCP client config for up to 10
listings) · `recommend` (one pick and the next step for a need, in a sentence) ·
`submit_listing` (files a public GitHub issue for review; publishes
nothing) · `request_missing_tool` (tells the maintainer privately that nothing
fits a job). Streamable HTTP, no auth. Stdio-only clients:
`npx -y mcp-remote https://agentswitchboard.dev/api/mcp`

Setup for Grok, Grok Bot, the xAI API, Claude, and ChatGPT:
[agentswitchboard.dev/connect](https://agentswitchboard.dev/connect).

Prefer plain HTTP? There's a REST search too:

```bash
curl "https://agentswitchboard.dev/api/agents?q=video&access=mcp&auth=none&limit=5"
curl "https://agentswitchboard.dev/api/agents/agentmail"
curl "https://agentswitchboard.dev/api/categories"
curl "https://agentswitchboard.dev/api/compare?a=deepgram&b=assemblyai"
curl "https://agentswitchboard.dev/api/bundle?items=linear,sentry-mcp,playwright-mcp"
curl "https://agentswitchboard.dev/api/recommend?need=read+my+Gmail+and+query+Postgres"
curl -X POST "https://agentswitchboard.dev/api/missing-tool" -H 'content-type: application/json' \
  -d '{"need": "file expense reports in Expensify", "tried": "expensify"}'
```

The REST API allows 120 requests a minute per IP, then answers HTTP 429 with
`Retry-After`; answers from the CDN cache, the static catalog pages and the MCP
server don't count toward it.

OpenAPI: [`/openapi.json`](https://agentswitchboard.dev/openapi.json).
Connector skill: [`/skill.md`](https://agentswitchboard.dev/skill.md).

Also machine-readable: [`/agents.json`](https://agentswitchboard.dev/agents.json)
(an index of the full catalog in pages of 50, each listing with its `authType`, CORS-open), a Markdown
twin of every task page at `/tasks/<slug>.md` (its dated answer and best fits), in-browser tools via WebMCP
(`document.modelContext`), and an agent-optimized view on every page (the "For Agents" toggle).

**Full API reference: [docs/API.md](docs/API.md)** — REST search/detail/categories, compare, alternatives, the connect bundle, recommend and missing-tool requests, rate limits, MCP, WebMCP, and the catalog dump.

**Placement on the website, fit alone for assistants.** On the website's task answers (the
homepage box, each task page with its dated answer and comparison table, and Browse by task),
listings that do the job and are Featured or Sponsored come first, each labeled; the rest are
ranked by how well they fit. The [Operator](https://agentswitchboard.dev/operator) and everything
AI assistants get (the MCP server, WebMCP and the REST API, `recommend` and `/api/tasks`
included) rank on fit alone, with no boost and no label. A Sponsored slot also shows on the
homepage and that week's drop page, from $29 a week ([/advertise](https://agentswitchboard.dev/advertise)).

## 🗂 Git-as-CMS

The entire catalog lives in this repo:

```
content/
  agents/<slug>.json    one file per agent — the source of truth
  categories.json       category definitions
  changelog.json        public audit log (rendered at /changelog)
```

There is no database and no CMS. Editing content = editing files. Merging to
`main` = publishing. Every entry is schema-validated in CI
([`scripts/validate-content.ts`](scripts/validate-content.ts)) — a bad entry
cannot merge. A weekly job link-checks every listing's agent and provider URLs.

**Want to add or fix a listing? See [CONTRIBUTING.md](CONTRIBUTING.md).**
Non-developers: [agentswitchboard.dev/submit](https://agentswitchboard.dev/submit).

## Development

```bash
npm install
npm run dev          # no env vars needed — content is right here
```

| Command | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (SSG, all pages) |
| `npm test` | unit tests |
| `npm run lint` / `npm run typecheck` | quality gates |
| `npx tsx scripts/validate-content.ts` | validate the catalog |
| `npx tsx scripts/check-links.ts` | link-rot sweep |
| `npx tsx scripts/cms.ts` | content ops: find / feature / update / unpublish |
| `npx tsx scripts/weekly-drop.ts` | batch-add agents (see file header) |
| `npx tsx scripts/drop-impact.ts` | what a content change does elsewhere on the site, compared with `origin/main` |

Stack: Next.js (App Router) · Tailwind · file-based catalog · deployed on Vercel.

## License

- **Code** (`app/`, `components/`, `lib/`, `scripts/`, config) — [MIT](LICENSE)
- **Catalog data** (`content/`, including every `content/agents/*.json` listing, and the same data at `/agents.json`, the REST API and the MCP server) — [CC BY-NC 4.0](LICENSE-DATA): reuse for non-commercial purposes with attribution to Agent Switchboard; contact us for commercial use. Submitted listings are contributed under CC BY-NC 4.0. (Versions up to 2026-09-25 remain CC BY 4.0.)
