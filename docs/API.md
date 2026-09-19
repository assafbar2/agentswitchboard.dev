# Agent Switchboard — API

Agent Switchboard is machine-consumable four ways. All of them are **read-only,
need no authentication, are CORS-open, and read the same cached catalog**
([`lib/catalog.ts`](../lib/catalog.ts)), so results always match the website.

| Surface | Best for | Endpoint |
|---|---|---|
| **REST search** | plain HTTP clients, connector platforms | `GET /api/agents` |
| **MCP server** | MCP clients (Claude, Cursor, …) | `POST /api/mcp` |
| **WebMCP** | agents viewing the page in a browser | `document.modelContext` |
| **Catalog dump** | bulk / offline indexing | `GET /agents.json` |

Base URL: `https://agentswitchboard.dev`

---

## REST search — `GET /api/agents`

A simple parameterized search for tools that want plain HTTP rather than an MCP
handshake (e.g. wiring into a connector platform).

### Query parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | `""` | Free-text over name, description, skills, categories, tags, provider. Empty = list all (relevance falls back to catalog order). |
| `category` | string | — | Category slug, e.g. `content-media`. See `list_categories` / [`content/categories.json`](../content/categories.json). |
| `access` | string | — | One or more of `api`, `mcp`, `cli`, `browser-extension`. Comma-separate to **require all** (`access=api,mcp`). Unknown values are ignored, not rejected. |
| `limit` | integer | `10` | Clamped to `1..50`. |
| `offset` | integer | `0` | Number of results to skip, for pagination. |

### Response

```jsonc
{
  "total": 568,      // full match count, before limit/offset
  "offset": 0,
  "limit": 10,
  "agents": [
    {
      "name": "YouTube MCP",
      "slug": "youtube-mcp",
      "url": "https://agentswitchboard.dev/agents/youtube-mcp",
      "description": "Manages YouTube via MCP — search videos, retrieve statistics…",
      "provider": "Smithery",
      "categories": ["content-media"],
      "accessMethods": ["mcp"],
      "verified": false
    }
    // …
  ]
}
```

Paginate with `total` + `offset` + `limit`. `Cache-Control` is
`s-maxage=300, stale-while-revalidate=600`.

### Examples

```bash
# Free-text
curl "https://agentswitchboard.dev/api/agents?q=video&limit=5"

# MCP-accessible agents in a category, second page
curl "https://agentswitchboard.dev/api/agents?access=mcp&category=code-devtools&limit=20&offset=20"
```

---

## MCP server — `POST /api/mcp`

Streamable HTTP MCP endpoint. Point any MCP client at it:

```json
{
  "mcpServers": {
    "agentswitchboard": { "url": "https://agentswitchboard.dev/api/mcp" }
  }
}
```

Stdio-only clients: `npx -y mcp-remote https://agentswitchboard.dev/api/mcp`

### Tools

| Tool | Input | Output |
|---|---|---|
| `search_agents` | `query?`, `category?`, `access?` (enum[]), `limit?` (1–50), `offset?` | `{ total, offset, limit, agents[] }` |
| `get_agent` | `slug` (required) | full agent detail: skills, auth, streaming/push, tags, links |
| `list_categories` | — | `{ categories: [ { slug, name, description, agentCount } ] }` |

All tools declare an `outputSchema` and return `structuredContent`.
Discovery manifest: [`/.well-known/mcp.json`](https://agentswitchboard.dev/.well-known/mcp.json).

---

## WebMCP — `document.modelContext`

Every page registers the same three tools (`search_agents`, `get_agent`,
`list_categories`) on the W3C WebMCP API (polyfilled), so an agent viewing the
site in a browser can call them directly instead of scraping the DOM.
Progressive enhancement — a silent no-op where WebMCP is unavailable.

Static declaration: [`/.well-known/webmcp.json`](https://agentswitchboard.dev/.well-known/webmcp.json).

---

## Catalog dump — `GET /agents.json`

The entire catalog as one JSON document, CORS-open, for bulk indexing.
Filter client-side on `accessMethods` and `categories`.

---

## Also for agents

- [`/for-agents`](https://agentswitchboard.dev/for-agents) — human-and-machine-readable context document (what this site is, how to use it).
- [`/llms.txt`](https://agentswitchboard.dev/llms.txt) — the [llms.txt](https://llmstxt.org/) summary.

---

## Access methods

| Value | Meaning |
|---|---|
| `api` | direct REST or HTTP API |
| `mcp` | Model Context Protocol compatible |
| `cli` | command-line tool |
| `browser-extension` | browser or IDE extension |

---

_This is a discovery layer, not a proxy. It indexes agents and how to reach
them; it does not expose the underlying APIs of listed agents — those live at
each agent's own homepage._
