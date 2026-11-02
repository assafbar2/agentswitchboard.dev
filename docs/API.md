# Agent Switchboard — API

Agent Switchboard is machine-consumable four ways. All of them are **read-only,
need no authentication, are CORS-open, and read the same cached catalog**
([`lib/catalog.ts`](../lib/catalog.ts)), so results always match the website.

| Surface | Best for | Endpoint |
|---|---|---|
| **REST search** | plain HTTP clients, connector platforms | `GET /api/agents` |
| **REST detail** | one listing by slug | `GET /api/agents/{slug}` |
| **REST categories** | valid `category` slugs + counts | `GET /api/categories` |
| **REST tasks** | starting from a job: the listings that do it | `GET /api/tasks` |
| **REST stacks** | listings that together do one job | `GET /api/stacks` |
| **REST compare** | 2 or 3 listings side by side | `GET /api/compare` |
| **REST alternatives** | listings that could stand in for one | `GET /api/agents/{slug}/alternatives` |
| **REST connect bundle** | one MCP client config for several listings | `GET /api/bundle` |
| **MCP server** | MCP clients (Grok, Claude, ChatGPT, Cursor, …) | `POST /api/mcp` |
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
| `task` | string | — | A task slug from [`GET /api/tasks`](#rest-tasks--get-apitasks), e.g. `query-a-database`: keeps only the listings that do that job. With no `q`, best fit first. An unknown slug is a `400` with `{ "error": "unknown_task", "message": "…" }`. |
| `category` | string | — | Category slug, e.g. `content-media`. See `list_categories` / [`content/categories.json`](../content/categories.json). |
| `access` | string | — | One or more of `api`, `mcp`, `cli`, `browser-extension` (`extension` is accepted as an alias). Comma-separate to **require all** (`access=api,mcp`). Unknown values are ignored, not rejected. |
| `official` | boolean | `false` | `true` (or `1`) returns only [official listings](#official-listings): first-party products from major vendors. Combines with `category`, `access`, and `q`. |
| `verified` | boolean | `false` | `true` (or `1`) returns only Verified listings: checked to work, re-checked monthly. |
| `auth` | string | — | Only listings with this auth type: `none` (no key or sign-in needed), `apiKey`, `oauth2`, `bearer`. A listing has one, so comma-separated values mean **any of them** (`auth=none,apiKey`). Unknown values are ignored. |
| `since` | string | — | Only listings added to the directory on or after a day: `YYYY-MM-DD`, or a number of days back with today included (`since=7` is the last 7 days; `7d` works too). Add `sort=newest` for the latest first. Anything else is a `400` with `{ "error": "invalid_since", "message": "…" }`. |
| `sort` | string | `relevance` | `relevance`: best match first with `q`; without it, best fit first with a `task`, else featured then A→Z. `newest`: most recently added first. `skills`: most skills first. `name`: A→Z. Ties keep the `relevance` order; unknown values mean `relevance`. |
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
      "iconUrl": "https://agentswitchboard.dev/icons/youtube-mcp.png?v=93bf5448",
      "description": "Manages YouTube via MCP — search videos, retrieve statistics…",
      "provider": "Smithery",
      "categories": ["content-media"],
      "accessMethods": ["mcp"],
      "verified": false,
      "official": false,
      "featured": false
    }
    // …
  ]
}
```

Paginate with `total` + `offset` + `limit`. `Cache-Control` is
`s-maxage=300, stale-while-revalidate=600`. With `since`, the response also
has `since`: the first day kept (`YYYY-MM-DD`, UTC), so `since=7` says which
days it covered.

`iconUrl` is the listing's icon: a 128px PNG served by Agent Switchboard
itself, never hotlinked from the provider, or `null` when the listing has
none. The `v` query changes whenever the image does, so it can be cached
indefinitely.

OpenAPI: [`/openapi.json`](https://agentswitchboard.dev/openapi.json).
Connector skill: [`/skill.md`](https://agentswitchboard.dev/skill.md).

### Examples

```bash
# Free-text
curl "https://agentswitchboard.dev/api/agents?q=video&limit=5"

# MCP-accessible agents in a category, second page
curl "https://agentswitchboard.dev/api/agents?access=mcp&category=code-devtools&limit=20&offset=20"

# Vendors' own first-party tools in a category
curl "https://agentswitchboard.dev/api/agents?official=true&category=code-devtools"

# The newest MCP servers that need no key or sign-in
curl "https://agentswitchboard.dev/api/agents?access=mcp&auth=none&sort=newest"

# MCP servers that query a database, best fit first
curl "https://agentswitchboard.dev/api/agents?task=query-a-database&access=mcp"

# What was added in the last 7 days, newest first
curl "https://agentswitchboard.dev/api/agents?since=7&sort=newest"
```

---

## REST detail — `GET /api/agents/{slug}`

Full listing for one published agent: skills, `authType` (of the listed
product, not of Switchboard), homepage, tags, streaming/push flags, and
`officialVendor` (the vendor's name on an official listing, otherwise `null`).

How to start using it, as the listing page's **Use it now** panel shows it:

- `mcpEndpoint`, `mcpCommand`, `install` (`{ type, command }`),
  `quickstartUrl`, `apiBaseUrl`: each copied from the vendor's own docs, and
  `null` when they don't give one.
- `useItNow`: the panel as data. `tryThisFirst` (prompts built from its
  skills), then one part per access method it has, `null` for the rest.
  `mcp` has a ready `clientConfig` (`{ "mcpServers": { … } }`),
  `cursorInstallUrl`, `claudeConnectorUrl` and `claudeCodeCommand` when the
  address or command is known, or else a `setupPrompt` for a coding agent;
  `cli` has the `install` command; `api` has `baseUrl` and `auth` in plain
  words. Every part has a `docsUrl`: the quickstart page, or the homepage.

```bash
curl "https://agentswitchboard.dev/api/agents/agentmail"
```

Unknown or unpublished slugs return `404` with
`{ "error": "not_found", "message": "…" }`.

---

## REST categories — `GET /api/categories`

```bash
curl "https://agentswitchboard.dev/api/categories"
```

Response: `{ "categories": [ { slug, name, description, agentCount } ] }`.
Use `slug` as the `category` query parameter on `GET /api/agents`.

---

## REST tasks — `GET /api/tasks`

A task is a job ("query a database", "transcribe audio") and the listings that
do it. The same tasks as [`/tasks`](https://agentswitchboard.dev/tasks), from
[`content/tasks.json`](../content/tasks.json). A listing fits a task when its
name, description, tags or skills use the task's `keywords`; listings in the
task's `categories` or with its `access` methods rank higher.

```bash
curl "https://agentswitchboard.dev/api/tasks"
curl "https://agentswitchboard.dev/api/tasks/query-a-database"
```

```jsonc
{
  "total": 38,
  "tasks": [
    {
      "slug": "query-a-database",
      "label": "query a database", // reads after "I need to"
      "blurb": "Ask Postgres, MySQL, MongoDB and other databases questions, run SQL and manage schemas from an agent.",
      "keywords": ["database", "sql", "postgres", "mongodb"],
      "categories": ["data-analytics", "infrastructure", "code-devtools"],
      "access": ["mcp"],
      "count": 46,    // listings that fit
      "official": 23, // of which official
      "url": "https://agentswitchboard.dev/tasks/query-a-database",
      "browseUrl": "https://agentswitchboard.dev/browse?task=query-a-database",
      "agentsUrl": "https://agentswitchboard.dev/api/agents?task=query-a-database"
    }
  ]
}
```

`GET /api/tasks/{slug}` returns one task with the same fields plus `agents`
(every listing that fits, best fit first: the REST search fields, `authType`,
and `why`, the listing's own skill that does the job, or `null` when it fits
by its name, description or tags), `relatedTasks` and `stacks` (slugs). An
unknown slug returns `404` with `{ "error": "not_found", "message": "…" }`.
To filter or page a task's listings, use `GET /api/agents?task={slug}`.

---

## REST stacks — `GET /api/stacks`

A stack is a set of listings picked to do one job together, in order, each
with a `why` line saying what it does for that job. The same stacks as
[`/stacks`](https://agentswitchboard.dev/stacks), from
[`content/stacks.json`](../content/stacks.json).

```bash
curl "https://agentswitchboard.dev/api/stacks"
curl "https://agentswitchboard.dev/api/stacks/research-analyst"
```

```jsonc
{
  "total": 6,
  "stackOfTheWeek": "iphone-and-android-apps", // the newest stack tied to a weekly drop
  "stacks": [
    {
      "slug": "iphone-and-android-apps",
      "title": "Ship iPhone and Android apps from one coding agent",
      "promise": "Build, run and test on both platforms from Claude Code or Codex, …",
      "week": "2026-10-31", // the drop it is the stack of the week for; null otherwise
      "url": "https://agentswitchboard.dev/stacks/iphone-and-android-apps",
      // one MCP client config for the stack, and how to connect the rest
      "bundleUrl": "https://agentswitchboard.dev/api/bundle?items=xcode-mcp,iphone-use,android-cli,stack-overflow-for-agents",
      "items": [
        {
          // …the REST search fields (name, slug, url, iconUrl, accessMethods, …)
          "authType": "none",
          "why": "Lets Claude Code or Codex modify and build the project you have open in Xcode, …"
        }
      ]
    }
  ]
}
```

Stacks are listed as `/stacks` shows them: the stack of the week first.
`GET /api/stacks/{slug}` returns one stack in the same shape; an unknown slug
returns `404` with `{ "error": "not_found", "message": "…" }`. `bundleUrl` is
the [connect bundle](#rest-connect-bundle--get-apibundle) for the stack's
listings, as the stack's page shows it under Connect them all.

---

## REST compare — `GET /api/compare`

Two or three listings side by side, as
[`/compare`](https://agentswitchboard.dev/compare) shows them. It takes the
page's own parameters (`a`, `b`, `c`: slugs in column order), so a `/compare`
link becomes the API call by adding `/api`.

```bash
curl "https://agentswitchboard.dev/api/compare?a=deepgram&b=assemblyai"
```

```jsonc
{
  "title": "Deepgram vs AssemblyAI",
  "url": "https://agentswitchboard.dev/compare/deepgram-vs-assemblyai", // the curated page when there is one
  "intro": "Speech-to-text APIs with real-time streaming. …",           // a curated comparison's line, else null
  "agents": [
    {
      // …the REST search fields (name, slug, url, iconUrl, accessMethods, …)
      "authType": "apiKey",
      "setsApart": ["Only one with a CLI", "Official Deepgram listing"]
    }
    // …
  ],
  "rows": [
    { "key": "access", "label": "Access", "same": false,
      "values": { "deepgram": ["API", "CLI"], "assemblyai": ["API"] } },
    { "key": "cli", "label": "CLI install", "same": false,
      "values": { "deepgram": { "code": "curl -fsSL https://deepgram.com/install.sh | sh", "note": "Install script" },
                  "assemblyai": "No CLI" } }
    // …what it is, provider, official vendor, verified, auth, MCP server, API base URL,
    // skills, streaming, push, categories, tags, listed since
  ],
  "notes": [] // requested listings left out, and why
}
```

`setsApart` holds up to four facts that set a listing apart from the others,
from fixed templates, never a verdict. Each row gives every listing's value by
slug: a line of text, a list, or `{ code, note }` for a command or address
copied from its docs; `same: true` when they all agree. Unknown or repeated
slugs, listings no longer listed, and any past three are left out with a note.
Fewer than two found is a `400` with `{ "error": "too_few_listings",
"message", "notes", "suggestions" }`: `suggestions` are listings to put beside
the one found, from its alternatives.

---

## REST alternatives — `GET /api/agents/{slug}/alternatives`

Listings that could stand in for one listing, strongest first, as its
[alternatives page](https://agentswitchboard.dev/agents/deepgram/alternatives)
lists them. Each is in the listing's main category, offers at least one of its
access methods, and overlaps on what it does (shared skills and tags, rarer
ones counting for more). Up to 8; fewer, or none, rather than a weak match.

```bash
curl "https://agentswitchboard.dev/api/agents/deepgram/alternatives?limit=3"
```

```jsonc
{
  "agent": { /* the listing: REST search fields and authType */ },
  "total": 6, // how many it has, up to 8
  "url": "https://agentswitchboard.dev/agents/deepgram/alternatives", // null with fewer than 3
  "compareUrl": "https://agentswitchboard.dev/compare?a=deepgram&b=assemblyai&c=voicebox",
  "basis": "6 listings in Voice & Messaging that share a way to connect with Deepgram and overlap on what it does, strongest match first.",
  "alternatives": [
    {
      // …REST search fields and authType
      "sharedAccess": ["api"],
      "inCommon": ["audio", "speech to text", "transcription"], // rarest first
      "why": "Both offer API. In common: audio, speech to text, transcription."
    }
  ]
}
```

`limit` is clamped to `1..8` (default 8). An unknown slug, or one no longer
listed, returns `404` with `{ "error": "not_found", "message": "…" }`.

---

## REST connect bundle — `GET /api/bundle`

One MCP client config for up to 10 listings, and how to connect the rest. It
takes the same `items` as a [shared stack](https://agentswitchboard.dev/stack?items=linear,sentry-mcp)
link, so a `/stack` link becomes the API call with `/api/bundle` in place of
`/stack`. Nothing is guessed: every address and command is copied from the
vendor's docs, as on the listing's page.

```bash
curl "https://agentswitchboard.dev/api/bundle?items=linear,sentry-mcp,playwright-mcp,postgres-mcp-pro"
```

```jsonc
{
  "summary": "3 in the config and 1 to set up from its guide",
  "stackUrl": "https://agentswitchboard.dev/stack?items=linear,sentry-mcp,playwright-mcp,postgres-mcp-pro",
  "config": {
    "mcpServers": {
      "linear": { "url": "https://mcp.linear.app/mcp" },
      "sentry-mcp": { "url": "https://mcp.sentry.dev/mcp" },
      "playwright-mcp": { "command": "npx", "args": ["@playwright/mcp@latest"] }
    }
  },
  "claudeCode": ["claude mcp add --transport http linear https://mcp.linear.app/mcp", "…"],
  "setupPrompt": "Connect Postgres MCP Pro as an MCP server, following its setup instructions at https://github.com/crystaldba/postgres-mcp",
  "items": [
    {
      // …REST search fields and authType
      "how": "config", // config | guide | other
      "server": { "url": "https://mcp.linear.app/mcp" },
      "docsUrl": "https://linear.app/developers/graphql",
      "note": "Hosted by Linear. You sign in with Linear when you first connect."
    }
    // …
  ],
  "notes": []
}
```

`how` says where each listing went: `config`, its docs give a hosted address
(preferred) or a local command; `guide`, an MCP server whose docs give
neither, so `setupPrompt` asks a coding agent to set it up from its guide;
`other`, no MCP server, so `note` gives its CLI install command, API address
or docs. `config` is `null` when nothing has an address or command. Unknown or
repeated slugs, listings no longer listed and any past ten are left out with a
note; none found is a `400` with `{ "error": "no_listings", "message", "notes" }`.

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
| `search_agents` | `query?`, `task?`, `category?`, `access?` (enum[]), `official?` (boolean), `verified?` (boolean), `auth?` (enum[]), `since?` (day or days), `sort?` (enum), `limit?` (1–50), `offset?` | `{ total, offset, limit, since?, agents[] }` |
| `get_agent` | `slug` (required) | full agent detail: skills, auth, streaming/push, tags, links, and `useItNow` (how to start using it) |
| `list_categories` | — | `{ categories: [ { slug, name, description, agentCount } ] }` |
| `compare_agents` | `slugs` (2 or 3, required) | as [`GET /api/compare`](#rest-compare--get-apicompare): `{ title, url, intro, agents[], rows[], notes }` |
| `alternatives_to` | `slug` (required), `limit?` (1–8) | as [`GET /api/agents/{slug}/alternatives`](#rest-alternatives--get-apiagentsslugalternatives) |
| `connect_bundle` | `slugs` (1 to 10, required) | as [`GET /api/bundle`](#rest-connect-bundle--get-apibundle): `{ summary, stackUrl, config, claudeCode, setupPrompt, items[], notes }` |
| `submit_listing` | `name`, `url`, `description` (required); `access?`, `category?`, `contact_email?` | `{ status, message, issueUrl?, existingSlug? }` |

All tools declare an `outputSchema` and return `structuredContent`. The six
read tools are annotated `readOnlyHint: true`, `destructiveHint: false`;
`submit_listing` is `readOnlyHint: false`, `destructiveHint: true` (it posts a public
issue the user can't take back), so clients ask before each call. Every tool also
carries its `title` in `annotations`. A request a decision tool can't
answer (fewer than two listings to compare, an unknown slug, no listing in a
bundle) is a tool error whose message says what to do next.

`submit_listing` is the only write. It files a **public GitHub issue** through
the same path as the [/submit](https://agentswitchboard.dev/submit) form and
publishes nothing: the maintainer reviews every issue by hand. `status` is
`filed`, `already_listed` (the URL matches a listing's homepage; nothing is
filed), `rate_limited`, or `unavailable`. `contact_email` is optional and goes
privately to the maintainer, never onto the issue. Limits: 5 per caller IP per
hour, one per URL per day.

**Rate limits.** 300 requests per minute per IP (HTTP 429 with `Retry-After`
past that), 3,000 per IP from Anthropic's published outbound range
(`160.79.104.0/21`), and a 64 KB request body cap. The endpoint answers CORS
preflights for any origin. Assistant platforms call from shared
server IPs, so back off and retry on 429.

**Connecting from an assistant.** Step-by-step for Grok (grok.com connectors),
Grok Bot, the xAI API `mcp` tool, Claude, and ChatGPT:
[/connect](https://agentswitchboard.dev/connect).
Discovery manifest: [`/.well-known/mcp.json`](https://agentswitchboard.dev/.well-known/mcp.json).

---

## WebMCP — `document.modelContext`

Every page registers the same six read tools (`search_agents`, `get_agent`,
`list_categories`, `compare_agents`, `alternatives_to`, `connect_bundle`) on
the W3C WebMCP API (polyfilled), so an agent viewing the site in a browser can
call them directly instead of scraping the DOM. They call the REST endpoints
above, so answers match the MCP server's. Progressive enhancement — a silent
no-op where WebMCP is unavailable.

Static declaration: [`/.well-known/webmcp.json`](https://agentswitchboard.dev/.well-known/webmcp.json).

---

## Catalog dump — `GET /agents.json`

The entire catalog as one JSON document, CORS-open, for bulk indexing.
Filter client-side on `accessMethods`, `categories`, and `official`. Each
agent carries `official`, `officialVendor` and `iconUrl`.

---

## Also for agents

- [`/for-agents`](https://agentswitchboard.dev/for-agents) — human-and-machine-readable context document (what this site is, how to use it).
- [`/llms.txt`](https://agentswitchboard.dev/llms.txt) — the [llms.txt](https://llmstxt.org/) summary.

---

## Official listings

`official: true` marks a **first-party listing from a major vendor**: the
product is built and published by the company that owns the brand, under its
official domain or GitHub org (Notion's own Notion MCP, not a community
"Notion MCP"). The vendor must be publicly traded, a frontier AI lab, or valued
around $1B+ (or a wholly owned subsidiary of one).

It is factual, not paid, and independent of the other two flags:

| Field | Meaning | Set by |
|---|---|---|
| `verified` | Code-backed checks pass: URLs load, access method declared, linked repo live | monthly sweep |
| `official` | First-party product of a vendor in [`content/official-vendors.json`](../content/official-vendors.json) | maintainers, with evidence; CI checks the `agentUrl` is on that vendor's official sources |
| `featured` | Editorial or commercial placement | maintainers only |

On the website: the **Official** filter on [`/browse?official=1`](https://agentswitchboard.dev/browse?official=1)
combines with **Verified**, **No auth needed**, categories and access methods.

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
