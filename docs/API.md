# Agent Switchboard — API

Agent Switchboard is machine-consumable four ways. All of them are **read-only,
need no authentication, are CORS-open, and read the same cached catalog**
([`lib/catalog.ts`](../lib/catalog.ts)), so results always match the website.
The two exceptions are writes that publish nothing: a listing suggestion
(`submit_listing`) and a [missing-tool request](#rest-missing-tool--post-apimissing-tool).

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
| **REST missing tool** | saying nothing in the directory does a job | `POST /api/missing-tool` |
| **MCP server** | MCP clients (Grok, Claude, ChatGPT, Cursor, …) | `POST /api/mcp` |
| **WebMCP** | agents viewing the page in a browser | `document.modelContext` |
| **Catalog dump** | bulk / offline indexing | `GET /agents.json` (index) → `GET /catalog/{n}.json` |

Base URL: `https://agentswitchboard.dev`

**Rate limits.** The REST endpoints (every `/api/` route except `/api/mcp`)
allow 120 requests per minute per IP. Past that they answer HTTP 429 with a
`Retry-After` header (seconds until the window resets) and a JSON body:

```jsonc
{
  "error": "rate_limited",
  "message": "Rate limit exceeded: 120 requests per minute per IP. Retry after 42 seconds.",
  "retryAfterSeconds": 42
}
```

Successful answers are CDN-cached for 5 minutes (`s-maxage=300`), and a repeat
served from that cache does not count. Wait `Retry-After` seconds before
retrying; for bulk reads, use the static catalog pages (`/catalog/{n}.json`),
which are not limited. The MCP server has its own limits ([below](#mcp-server--post-apimcp)).

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
| `order` | string | — | `organic` ignores featured placement: the default order and ties become A→Z. The MCP server and WebMCP always list this way. |
| `limit` | integer | `10` | Clamped to `1..50`. |
| `offset` | integer | `0` | Number of results to skip, for pagination. Wins over `page` when both are sent. |
| `page` | integer | `1` | Page number from 1, in steps of `limit`: `page=3&limit=20` is `offset=40`. |

### Response

```jsonc
{
  "total": 568,      // full match count, before limit/offset
  "offset": 0,
  "limit": 10,
  "next": "https://agentswitchboard.dev/api/agents?limit=10&offset=10", // null on the last page
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
      "featured": false,
      "sponsored": false
    }
    // …
  ]
}
```

Paginate with `total` + `offset` + `limit`, `page`, or by following `next`:
the same query one page on (as `offset`), or `null` when this page is the
last. A page holds at most 50 listings; for bulk work, read the
[catalog dump](#catalog-dump--get-agentsjson). `Cache-Control` is
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
curl "https://agentswitchboard.dev/api/agents?access=mcp&category=code-devtools&limit=20&page=2"

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
  "total": 47,
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

## REST missing tool — `POST /api/missing-tool`

Tell the maintainer that the directory has nothing for a job, after a search
found nothing that fits: the plain-HTTP twin of the MCP `request_missing_tool`
tool. It is recorded privately for the weekly review, which uses these
requests to decide what to look for and add. Nothing is published, no issue is
opened, and there is no reply.

```bash
curl -X POST "https://agentswitchboard.dev/api/missing-tool" \
  -H 'content-type: application/json' \
  -d '{"need": "file expense reports in Expensify", "tried": "expensify", "access": ["mcp"]}'
```

| Field | | |
|---|---|---|
| `need` | required | The job no listing does, 10–500 characters. Describe the job, not the user |
| `tried` | optional | The search words that found nothing, up to 200 characters |
| `category` | optional | The closest category slug |
| `access` | optional | `api`, `mcp`, `cli`, `browser-extension` |

`202 { "status": "recorded", "message" }` when it is recorded; `400
{ "error": "invalid_request", "message" }` for a body that is not JSON, a
missing or short `need`, or an unknown field; `429 { "status": "rate_limited",
"message" }` with `Retry-After` past 10 per caller IP per hour. Email addresses
and phone numbers are removed before it is recorded, and the record keeps no IP
address. Never cached; CORS-open.

A search that matches no listing at all, on `GET /api/agents`, MCP
`search_agents` or [/browse](https://agentswitchboard.dev/browse), is recorded
the same way with its words and filters.

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
| `request_missing_tool` | `need` (10–500 characters, required); `tried?`, `category?`, `access?` (enum[]) | `{ status, message }`, as [`POST /api/missing-tool`](#rest-missing-tool--post-apimissing-tool) |

All tools declare an `outputSchema` and return `structuredContent`. Results are organic: they never list featured listings first, and they leave out `featured` and any other placement field. The six
read tools are annotated `readOnlyHint: true`, `destructiveHint: false`;
`submit_listing` is `readOnlyHint: false`, `destructiveHint: true` (it posts a public
issue the user can't take back), so clients ask before each call.
`request_missing_tool` is `readOnlyHint: false`, `destructiveHint: false`,
`openWorldHint: false`: it records a private note and changes nothing public. Every tool also
carries its `title` in `annotations`. A request a decision tool can't
answer (fewer than two listings to compare, an unknown slug, no listing in a
bundle) is a tool error whose message says what to do next.

`submit_listing` files a **public GitHub issue** through
the same path as the [/submit](https://agentswitchboard.dev/submit) form and
publishes nothing: the maintainer reviews every issue by hand. `status` is
`filed`, `already_listed` (the URL matches a listing's homepage; nothing is
filed), `rate_limited`, or `unavailable`. `contact_email` is optional and goes
privately to the maintainer, never onto the issue. Limits: 5 per caller IP per
hour, one per URL per day.

`request_missing_tool` says the directory has nothing for a job, after a
search found nothing that fits. It is recorded privately for the weekly
review, which uses these requests to decide what to look for and add; nothing
is published, no issue is opened, and there is no reply. Describe the job,
not the user: email addresses and phone numbers are removed before it is
recorded. `status` is `recorded` or `rate_limited` (10 per caller IP per hour).
A `search_agents` call that matches no listing is recorded the same way, with
its words and filters.

**Rate limits.** 300 requests per minute per IP (HTTP 429 with `Retry-After`
past that), 3,000 per IP from Anthropic's published outbound ranges
(`160.79.104.0/21`, `153.61.208.0/20`), and a 64 KB request body cap. The endpoint answers CORS
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

A small index of the catalog, CORS-open, for bulk indexing. No single request
returns the whole catalog: the listings are in static pages of at most 50 at
`/catalog/{n}.json`, featured first, then A→Z, built once per deploy.

```jsonc
// GET /agents.json
{
  "source": "Agent Switchboard — https://agentswitchboard.dev",
  "description": "…what the flags mean…",
  "schemaVersion": 2,          // 1 was the single-file dump (until 2.9.1)
  "generated": "2026-11-13T12:00:00.000Z",
  "total": 985,
  "pageSize": 50,
  "pageCount": 20,
  "pages": ["https://agentswitchboard.dev/catalog/1.json", "…", "https://agentswitchboard.dev/catalog/20.json"],
  "search": {
    "rest": "https://agentswitchboard.dev/api/agents?limit=50&page=1",
    "mcp": "https://agentswitchboard.dev/api/mcp",
    "openapi": "https://agentswitchboard.dev/openapi.json",
    "docs": "https://agentswitchboard.dev/llms.txt"
  }
}

// GET /catalog/1.json
{
  "schemaVersion": 2,
  "index": "https://agentswitchboard.dev/agents.json",
  "total": 985, "pageSize": 50, "page": 1, "pageCount": 20, "offset": 0,
  "prev": null,
  "next": "https://agentswitchboard.dev/catalog/2.json", // null on the last page
  "agents": [ /* up to 50 listings */ ]
}
```

Fetch `pages` in order, or follow `next` from page 1. Any other file under
`/catalog/` is a 404. The index and the pages change only when a release
deploys: `Cache-Control` is `public, max-age=3600, s-maxage=86400`, and a
deploy replaces them at the edge straight away.

Each listing in `agents` carries every one of these fields, `null` (or `[]`)
when the listing has no value:

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Display name. |
| `slug` | string | Stable ID; `GET /api/agents/{slug}` has the full listing, with skills. |
| `url` | string | The listing's page on this site. |
| `iconUrl` | string \| null | 128px PNG served by Agent Switchboard (see [REST search](#rest-search--get-apiagents)). |
| `homepage` | string \| null | The product's own site. |
| `provider` | string \| null | Who makes it. |
| `providerUrl` | string \| null | The provider's site. |
| `description` | string | One or two sentences on what it does. |
| `categories` | string[] | Category slugs (`GET /api/categories`). |
| `accessMethods` | string[] | `api`, `mcp`, `cli`, `browser-extension`. |
| `authType` | string | How the product authenticates: `none` (no key or sign-in), `apiKey`, `bearer` or `oauth2`. The site's "No auth needed" filter and `auth=none` keep `none`. |
| `tags` | string[] | Free-form tags. |
| `verified` | boolean | We checked it works: its URLs load and its declared access responds. Re-checked monthly. |
| `official` | boolean | See [Official listings](#official-listings). |
| `officialVendor` | string \| null | The vendor's name when `official`. |
| `featured` | boolean | Sorts first in the catalog order; set by the maintainer. |
| `sponsored` | boolean | A paid placement; never changes the order. |
| `tier` | string | `free` or `premium`. |
| `createdAt` | string \| null | When it was listed (ISO 8601). |
| `updatedAt` | string \| null | When the listing last changed (ISO 8601). |
| `mcpEndpoint` | string \| null | The vendor's hosted MCP server address, from its docs. |
| `mcpCommand` | string \| null | The command that runs its MCP server locally. |
| `install` | object \| null | The CLI install command from the vendor's docs: `{ "type": "npm" \| "pip" \| "brew" \| "docker" \| "binary", "command" }`. |
| `quickstartUrl` | string \| null | The vendor's setup or getting-started page. |
| `apiBaseUrl` | string \| null | Base URL of the vendor's public API. |

Skills are not in the pages, to keep them small: read them from
`GET /api/agents/{slug}` or the MCP `get_agent` tool. Filter client-side on
`accessMethods`, `categories`, `authType` and `official`. To find tools for a
job, search with [`GET /api/agents`](#rest-search--get-apiagents) or the MCP
server instead.

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

It is factual, not paid, and independent of the other flags:

| Field | Meaning | Set by |
|---|---|---|
| `verified` | Code-backed checks pass: URLs load, access method declared, linked repo live | monthly sweep |
| `official` | First-party product of a vendor in [`content/official-vendors.json`](../content/official-vendors.json) | maintainers, with evidence; CI checks the `agentUrl` is on that vendor's official sources |
| `featured` | Editorial placement; sorts first when there is no search text | maintainers only |
| `sponsored` | Paid placement: a Sponsored label and a spot in the Sponsored slot on the homepage and the latest drop page. Never changes ranking, tasks, alternatives, compare or the Operator. In REST and `/agents.json` only, never in MCP or WebMCP results or the decision endpoints | maintainers only |

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
