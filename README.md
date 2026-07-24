# Agent Switchboard

**The curated directory for the agentic web** — 300+ verified AI agents, MCP
servers, and agentic tools with real API, MCP, CLI, or browser-extension
access. Live at **[agentswitchboard.dev](https://agentswitchboard.dev)**.

## 🔌 This directory is itself an MCP server

Point any MCP client at it and query the catalog with native tools:

```json
{
  "mcpServers": {
    "agentswitchboard": { "url": "https://agentswitchboard.dev/api/mcp" }
  }
}
```

Tools: `search_agents` · `get_agent` · `list_categories`. Streamable HTTP, no
auth. Stdio-only clients: `npx -y mcp-remote https://agentswitchboard.dev/api/mcp`

Also machine-readable: [`/agents.json`](https://agentswitchboard.dev/agents.json)
(full catalog, CORS-open) and an agent-optimized view on every page
(the "For Agents" toggle).

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
cannot merge. A weekly job link-checks all ~480 URLs in the catalog.

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

Stack: Next.js (App Router) · Tailwind · file-based catalog · deployed on Vercel.

## License

- **Code** (`app/`, `components/`, `lib/`, `scripts/`, config) — [MIT](LICENSE)
- **Catalog data** (`content/`) — [CC-BY-4.0](content/LICENSE.md): reuse freely with attribution to Agent Switchboard.
