# Agent Switchboard — improvement specs (everything except Trust Receipt)

**Version:** 2.2.01
**Date:** 2026-11-01 (PT), revised same day with Assaf's comments
**Status:** specs for review — nothing built yet
**Scope:** every recommendation from the capability review except "Trust receipt". Includes real icons and the smaller details. Vendor claim/listing-health (old 11) and the agent-ready vendor badge (old 12) are **dropped** and no longer spec'd.
**Companion:** [Capability review canvas](https://cursor.com/canvas/store-feca6060-8c98-4491-aeb9-422ed5eb956a/548191f4-bdfd-4a65-a535-611cd58000d6)

## What changed in this revision

1. **Task-first finder moved to P0** (Spec 2) — it serves the visitor who arrives with a job, not a keyword.
2. **Compare tray now holds up to 3 listings** (Spec 5), not 4 — three columns stay readable, especially on mobile.
3. **Collections & stacks explained in plain terms** (Spec 7), with examples.
4. **Purpose of MCP decision tools stated explicitly** (Spec 8).
5. **Task-first finder vs The Operator** — the difference, and why the Operator is not first, explained in Specs 2 and 9.
6. **Dropped:** vendor claim & listing-health view, and the agent-ready vendor badge.

## How this is prioritized

Ranked by **expected usage**: how many visitors hit the surface × how often × how much it unblocks them. Not by novelty, revenue, or what is most fun to build.

| Tier | Meaning |
|---|---|
| **P0** | Touches nearly every session. Ship first. |
| **P1** | Touches a large minority, or creates a return/share loop. |
| **P2** | A nicer front-end on an engine that already exists, or brand/share value. Later. |

Catalog facts (2026-11-01): 900 published listings; access API 595 / MCP 475 / CLI 444 / browser-extension 25; auth API-key 434 / none 252 / OAuth 173 / bearer 41; 328 Official, 896 Verified; 153 listings have no skills; **only 1 of 900 has an `iconUrl`**; no pricing, license, install, or last-checked fields in the schema.

### Priority summary

| # | Spec | Tier | Main audience | Size |
|---|---|---|---|---|
| 1 | Search & discovery upgrade | P0 | Every visitor | M |
| 2 | Task-first finder ("I need to…") | P0 | Visitors with a job, not a keyword | M |
| 3 | Real icons & scannable cards | P0 | Every visitor | M |
| 4 | "Use it now" activation panel | P0 | Listing-page visitors | M |
| 5 | Compare tray (max 3) & shareable compare pages | P0 | Deciders (high intent) | M |
| 6 | Freshness radar (New / Updated / weekly drop / RSS) | P1 | Returning visitors, agents | S–M |
| 7 | Collections & stacks | P1 | Returning visitors, sharers | M |
| 8 | MCP decision tools (`compare_agents`, `alternatives_to`, `new_since`, bundles) | P1 | Assistants & their users | M |
| 9 | The Operator (homepage chat → wired stack) | P2 | New visitors, press/share | L |
| 10 | Live Switchboard (plugboard visualization) | P2 | Sharers, social | M |

Sizes are relative engineering effort (S/M/L), not calendar estimates.

## Cross-cutting rules (apply to every spec)

1. **No accounts.** State lives in the URL (shareable) or `localStorage` (personal). Anything that seems to need an account is redesigned around shareable URLs first.
2. **Git-as-CMS stays.** New catalog fields land in `content/agents/*.json`, validated by `scripts/validate-content.ts` in CI, shipped through the existing PR flow. No database, no admin panel.
3. **One catalog, every surface.** Web, REST (`/api/agents`), MCP (`/api/mcp`), WebMCP and `agents.json` expose the same fields/filters in the same release, so an assistant never contradicts the website.
4. **Performance budget.** Browse stays statically rendered; per-card payload must not grow materially (the lean-card constraint in `components/AgentCard.tsx` stands). New client JS only where interaction demands it.
5. **Accessibility.** Keyboard-operable, visible focus, `aria-pressed`/`aria-expanded` where stateful, ≥44px touch targets — matching `CatalogFilters` / `SearchBar` patterns.
6. **Analytics.** Each feature ships Vercel Analytics events in `snake_case` (precedent: `webmcp_call`). No raw query text stored — bucket by length and result count.
7. **Agent view stays in sync.** New routes get the `.agent-only` text treatment and, where relevant, entries in `/for-agents`, `/llms.txt`, `app/index.md/route.ts`.
8. **Editorial voice.** Newsprint styling, no gradients, no star ratings, no engagement bait. "Cool" comes from utility and craft.

---

## Spec 1 — Search & discovery upgrade (P0)

**Objective.** Make the front door answer in one attempt. Search is the highest-traffic interaction and today it is one keyword box, three filter groups, and no recovery when it fails.

**Current state.** `lib/search.ts` ranks well (synonyms, access-word parsing, field weighting), but: no autocomplete; filters only category / Official / vendor / access; no Verified filter; no sort; zero-result state says "try a different search" and stops (`app/browse/page.tsx`).

**Functional requirements**

1.1 **Autocomplete.** After ≥2 characters: grouped dropdown — *Agents* (top 5), *Categories* (with counts), *Vendors* (Official, with counts), *Tags* (top 3). ↑/↓ + Enter + Esc. An agent goes to its page; anything else to a pre-filtered `/browse`.
1.2 **Verified filter.** `Verified` chip beside `Official` in `CatalogFilters`; `verified=1` URL param; honored by REST and MCP `search_agents`.
1.3 **Sort.** Relevance (default with query), Newest (`createdAt`), Most skills, A–Z. `sort=` param. Newest finally surfaces the weekly drop inside browse.
1.4 **No-results recovery.** Show (a) which term/filter excluded everything, one-click removal each; (b) "closest matches" rerunning with the weakest required term dropped, labeled as relaxed; (c) the two nearest categories. Never a dead end.
1.5 **Result explanation line.** "47 tools for *postgres* — 6 Official · 31 Verified · 22 MCP", derived from the result set.
1.6 **Details.** `No auth needed` chip (`authType=none`). A `Free` chip only once a real pricing field exists — never infer price from `authType` (documented trap in `app/agents/[slug]/page.tsx`).

**Data/API.** No schema change. `verified` + `sort` on `/api/agents`; `verified` on MCP `search_agents`; WebMCP mirrors.

**Analytics.** `search_submit`, `search_zero_results`, `autocomplete_select`, `filter_change`, `sort_change`, `recovery_click`.

**Acceptance.** ≥95% of zero-result pages offer a recovery that itself returns results; autocomplete <100ms from the in-memory catalog.

**Dependencies.** None. First build.

---

## Spec 2 — Task-first finder, "I need to…" (P0)

**Objective.** Keyword search assumes the visitor knows the vocabulary. Many arrive with a job instead: "have my agent read my email", "query a database", "watch a website for changes". Let them start from the job.

**Why P0 now.** Categories are taxonomy, not jobs — nobody new wakes up wanting "Orchestration". The task is the most common real intent behind a visit, and this is the deterministic, indexable, zero-marginal-cost way to serve it (contrast Spec 9).

**Current state.** Categories are the only guided path. The ranker already supports synonym expansion (`lib/search.ts`), which is exactly the mechanism a task layer needs.

**Functional requirements**

2.1 **Entry.** A ruled block under the homepage hero and atop `/browse`: "I need an agent to…" with task chips plus a free-text box.
2.2 **Task taxonomy.** Checked-in `content/tasks.json`, ~25 tasks at launch. Each: label ("Query a database"), plain-language blurb, mapped categories, required/preferred access methods, 3–5 keyword expansions for the ranker. Editorial content, reviewed like categories.
2.3 **Flow.** A task lands on `/browse` pre-filtered, with an explanation banner ("Showing tools for *query a database* — API/MCP, ranked by database skills") and one-click removal. Free text runs the same expansion: matched task if any, plus raw terms.
2.4 **Task landing pages.** `/tasks/<slug>`, server-rendered and indexable: the task, top listings with a one-line "why it fits" (from skills), the Official subset called out, related tasks. High-intent search landing pages.
2.5 **Agent parity.** `/api/tasks` exposes the taxonomy so assistants can map jobs → filters themselves; `search_agents` already expresses the rest.

**Data/API.** New `content/tasks.json` + `/api/tasks`. No agent schema change.

**Analytics.** `task_select`, `task_search` (matched vs unmatched — unmatched phrasings are the taxonomy's to-do list), `task_to_listing_click`.

**Acceptance.** Each launch task returns ≥3 relevant listings or is cut; a task page answers "what should I use to do X?" without the visitor knowing any product or category name.

**Dependencies.** None. Spec 9 (Operator) is later built *on top of* this taxonomy and ranking, not instead of it.

---

## Spec 3 — Real icons & scannable cards (P0)

**Objective.** 899 of 900 listings render as a letter in a yellow square. Real brand marks make browse scannable, the site alive, and listings shareable.

**Current state.** `iconUrl` is in the schema and renders on the detail page only; cards ignore it. `next.config.ts` allows any HTTPS image host, but the plan below avoids hotlinking anyway.

**Functional requirements**

3.1 **Sourcing pipeline.** `scripts/fetch-icons.ts` (run manually / with the weekly drop, never at request time), in order: (a) existing `iconUrl`; (b) favicon / apple-touch-icon from `providerUrl`, then `agentUrl`; (c) GitHub org avatar for GitHub URLs. Minimum 64×64, square-ish, ≤50KB processed.
3.2 **Store locally.** Normalize to 128×128 (PNG/WebP/SVG), commit to `public/icons/<slug>.<ext>`, point `iconUrl` at the local path. No hotlink breakage, no third-party tracking on our pages.
3.3 **Rendering.** 28×28 on cards, 56×56 on the detail page, same component inside compare and stacks. Yellow letter tile remains the fallback. Icons decorative (`alt=""`) — the name sits beside them.
3.4 **Review gate.** The script opens a PR with a contact-sheet grid of all new icons, so wrong or adversarial logos are rejected at a glance. Vendor-supplied `iconUrl` in a PR takes precedence over a fetched one.
3.5 **Details.** Icons sit on a fixed light chip so dark logos survive dark mode. Fetched SVGs are sanitized (scripts/handlers stripped) before commit — treat them as untrusted input.

**Data/API.** `iconUrl` meaning unchanged (usually local now); add it to REST/MCP summaries (cards already carry it).

**Analytics.** None beyond existing page metrics.

**Acceptance.** ≥85% of published listings show a real icon; zero card layout shift (fixed box reserved); contact-sheet review takes minutes.

**Dependencies.** None. Makes Spec 5 (compare) and Spec 7 (stacks) read far better.

---

## Spec 4 — "Use it now" activation panel (P0)

**Objective.** Every listing page ends at "Visit Agent", so the visitor's real job — connect it, install it, call it — happens off-site unaided. This panel does that job on the page.

**Current state.** Detail page: access methods, auth, skills, tags, one outbound link. `/connect` has excellent *generic* MCP instructions, nothing listing-specific. No install/quickstart fields in the schema.

**Functional requirements**

4.1 **Placement.** Under the description on `app/agents/[slug]/page.tsx`, titled **Use it now**, one tab (or ruled row) per access method the listing actually has.
4.2 **MCP tab** (475 listings): copy-ready client JSON using the listing's own endpoint where known; "Add to Claude" prefilled-connector link (the `/connect` pattern), Cursor install link, Grok/ChatGPT instruction anchors. Copy button with confirmation state.
4.3 **CLI tab** (444): install + first-run command where supplied (4.6); otherwise a plainly-labeled docs link. **Never invent a command.**
4.4 **API tab** (595): base URL, auth restated in plain words ("you'll need an API key from the provider"), a minimal example request only where supplied (4.6). No fabricated endpoints.
4.5 **Feed the other systems.** "Add to compare" (Spec 5) and "Add to stack" (Spec 7) actions live in this panel.
4.6 **New optional schema fields** (validated; absence renders nothing):
   - `install`: `{ type: "npm"|"pip"|"brew"|"binary"|"docker", command: string }`
   - `mcpEndpoint`: URL when it differs from `agentUrl`
   - `quickstartUrl`: URL
   Backfill only from maintainers/vendors (submit form + PR template gain the fields); no scraped guesses.
4.7 **For agents.** Panel content appears in the page's agent view and in MCP `get_agent` output (`mcpEndpoint`, `install` when present).

**Data/API.** Schema additions above; REST detail + `get_agent` expose them; `agents.json` follows automatically.

**Analytics.** `useit_copy` (method), `useit_deeplink` (client), `useit_docs_click`. Target: panel interaction in ≥25% of listing-page sessions, so "Visit Agent" stops being the only measured activation.

**Acceptance.** Every MCP listing shows a working copy block; zero fabricated commands; no layout shift; content readable with JS off.

**Dependencies.** Spec 7 for the full "stack" action; ships with compare integration (Spec 5) regardless.

---

## Spec 5 — Compare tray (max 3) & shareable compare pages (P0)

**Objective.** The site says "browse, compare, integrate" everywhere and offers no compare. High-intent visitors choosing between, say, three Postgres MCP servers currently open tabs and squint. **The tray holds at most 3** — three columns stay readable on desktop and stack cleanly on mobile; a fourth column is where comparison tables turn into mush.

**Current state.** `lib/related.ts` already computes genuine alternatives (same primary category + shared access method + rarity-weighted keyword overlap) — the hardest input already exists.

**Functional requirements**

5.1 **Tray.** `+ Compare` toggle on every card and listing page. Slim tray bar (bottom on mobile, rail on desktop) holds **up to 3**, persists in `localStorage`, survives navigation. Adding a 4th prompts "remove one to add this" — it never silently drops the oldest.
5.2 **Compare view.** `/compare?a=<slug>&b=<slug>[&c=<slug>]` — URL-driven, shareable, server-rendered (links unfurl, pages index). Rows: description, provider, Official vendor, Verified, access methods, auth, skill count + names (expandable), streaming, push, categories, tags, added date, and per-column **Use it now** actions (Spec 4). No red/green "winner" coloring; rows where all three agree are de-emphasized.
5.3 **Alternatives shortcut.** Under Related Agents on a listing page: one click compares this listing against its top related alternatives (from `lib/related.ts`), capped at 3 total.
5.4 **Fact lines.** Atop the view, template-generated one-liners per column — "Only one with a CLI", "No auth required", "Official — by Notion". From the compared fields only, never an LLM at request time. No winner declared.
5.5 **Guards.** Unknown/archived slugs dropped with a note; duplicates removed; >3 truncated with a note. Bare `/compare` shows an explainer plus curated comparisons (5.6).
5.6 **Curated comparisons.** Checked-in `content/comparisons.json` (pairs + one editorial intro line) at `/compare/<a>-vs-<b>` with proper metadata — only pairs with real search demand, sourced from related-agent clusters, maintainer-approved.

**Data/API.** No catalog schema change. Assistant parity arrives in Spec 8.

**Analytics.** `compare_add`, `compare_view` (2 vs 3 columns; curated vs user-built), `compare_share`.

**Acceptance.** A cold visitor opening a shared compare URL sees the identical table (SSR); the tray never covers content on mobile; "which has a CLI / needs no auth / is Official" is answerable without leaving the page.

**Dependencies.** Spec 3 (icons) and Spec 4 (per-column actions) improve it; neither blocks v1.

---

## Spec 6 — Freshness radar (P1)

**Objective.** The directory changes weekly, but a returning visitor can't see what changed — and neither can an assistant. Freshness is the cheapest retention loop there is.

**Current state.** `content/changelog.json` renders as one flat list at `/changelog`; "latest additions" appears only inside the six homepage Top Agent slots; no feed; MCP has no recency filter.

**Functional requirements**

6.1 **New & updated.** `/new`: added in the last 30 days (from `createdAt`), grouped by week. `/changelog` gains action filters (added/updated/removed) and a category filter. "New" badge on cards under 30 days old (the `new` label already exists in `lib/types.ts`).
6.2 **Weekly drop pages.** `/drops/<YYYY-MM-DD>` generated from changelog + `createdAt`: count, the adds with one-liners, new Official vendors, updates. This is the page the weekly X post should link to. Optional maintainer intro via `content/drops.json`.
6.3 **Feeds.** RSS 2.0 + Atom at `/feed.xml` (all changes), one item per add/update, footer-linked. No email newsletter — operational burden, out of scope.
6.4 **Category freshness.** "N new this month" in category headers when N>0.
6.5 **Agent parity.** `new_since` filtering for REST/MCP (Spec 8); `/new` gets the agent view; feeds listed on `/for-agents`.

**Data/API.** Existing `createdAt`/`updatedAt` + changelog. **Required fix:** content tooling (`scripts/weekly-drop.ts`, `scripts/cms.ts`) must bump `updatedAt` on any entry change, or "recently updated" will lie.

**Analytics.** `new_page_view`, `feed_click`, drop-page social referrals.

**Acceptance.** "What arrived this week?" is one click from the footer; a drop page exists with zero manual page-building.

**Dependencies.** 6.5 rides with Spec 8; the rest is independent.

---

## Spec 7 — Collections & stacks (P1)

**In plain terms.** A **collection** is a saved shortlist — a playlist, but for agents: "tools I'm evaluating for my support bot". A **stack** is a published, editorial version of the same thing — a recipe of listings that together do one job: a *Solo founder stack* (an email agent + a browser agent + a memory store + a scheduler), a *No-auth MCP starter pack*, *Official coding tools only*. Collections are personal and private-by-default; stacks are curated, named, and meant to be linked and shared. Both exist so a visitor can leave with more than one listing — the Switchboard's unit of value stops being a single agent and becomes a working set.

**Why it matters.** Today every visit is one-and-done: find one tool, leave. Collections give people a reason to save, return, and share; stacks give *you* an editorial product to publish weekly ("the stack for X") that no raw directory has.

**Functional requirements**

7.1 **Personal collections (no account).** "Add to stack" on cards, listing pages, and the Use-it-now panel (Spec 4.5) saves to a current collection in `localStorage`. Rename it, remove items, see it at `/my-stack`. Nothing leaves the browser until the user shares (7.2).
7.2 **Shareable snapshots.** "Share" encodes the collection as `/stack/<slug,slug,…>` (plus an optional title) — the URL *is* the collection, server-rendered like compare (Spec 5), so it unfurls and can be bookmarked, posted, or handed to an assistant. Editing a shared link forks it; there is no sync and no account.
7.3 **Curated stacks.** Checked-in `content/stacks.json`: title, one-line promise, ordered listings each with a "why it's here" line, optional task link (Spec 2). Rendered at `/stacks/<slug>`, listed at `/stacks`. Maintainer- or community-authored via PR, reviewed like listings. Launch with 5–8 stacks, not fifty.
7.4 **One-click use.** Every stack view offers the Spec 8 bundle export (add all its MCP listings to an assistant at once) and a compare view of its members (Spec 5, first 3 + note).
7.5 **Details.** Counts and duplicates handled sanely (a listing appears once; re-adding bumps it to the top with a note); archived listings render struck-through with a "removed from the directory" note rather than vanishing, so old shared links still explain themselves.

**Data/API.** `content/stacks.json`; no agent schema change. Stack contents exposed read-only at `/api/stacks` for assistants.

**Analytics.** `stack_add`, `stack_share`, `stack_view` (curated vs shared vs personal), `stack_bundle_export`.

**Acceptance.** A visitor can build a 5-tool shortlist, send the link to a teammate, and the teammate sees the identical, fully rendered page cold; a curated stack can be published with one JSON file and a PR.

**Dependencies.** Spec 4 (add actions), Spec 5 (compare members), Spec 8 (bundle export). v1 can ship 7.1–7.3 before 8 lands.

---

## Spec 8 — MCP decision tools (P1)

**Purpose, plainly.** The MCP server today can *look things up* (`search_agents`, `get_agent`, `list_categories`) but cannot help anyone *decide*. So when a user asks Grok or Claude "which of these should I use?", "what's an alternative to X?", "what's new this week?", or "set those up for me", the assistant gets raw search results and has to improvise the actual answer — or give up. These four tools give assistants the same judgment surfaces the website has, so the answer an assistant gives is structured, sourced, and identical to what the site would say. The audience is indirect but large: everyone who meets this directory through an assistant instead of a browser.

**Functional requirements**

8.1 **`compare_agents`** — input: 2–3 slugs (matching the Spec 5 cap). Output: the compare table as structured data (access, auth, skills, Official vendor, Verified, streaming/push, added date) plus the same template fact-lines the web compare shows. No declared winner.
8.2 **`alternatives_to`** — input: a slug. Output: up to 4 alternatives from the existing related-agents logic (`lib/related.ts`), each with the shared keywords that qualified it, so the assistant can say *why* it's an alternative.
8.3 **`new_since`** — a `since` (date or days) filter on `search_agents`, powering "what's new" answers from Spec 6 data.
8.4 **`connect_bundle`** — input: 1–10 slugs. Output: ready-to-paste MCP client config for every MCP-capable listing in the set, per-listing connect notes (auth, endpoint), and links for the rest. This is the machine twin of a stack (Spec 7.4): an assistant can offer "I've found your stack — here's the bundle to add it".
8.5 **Parity rule.** All four ship simultaneously in REST (`/api/agents` params, `/api/compare`, `/api/stacks`), WebMCP, and the docs (`docs/API.md`, `/for-agents`, `/connect`, `skill.md`). Rate limits and logging match the existing MCP wrapper.

**Data/API.** No catalog schema change; reads the same catalog. `addedAt` already flows through `get_agent`.

**Analytics.** Existing `asb_consumer` MCP logging extended with the new tool names; watch which tools assistants actually call before building more.

**Acceptance.** Asking an assistant "compare the top two Postgres MCP servers and give me the config for the better fit for a CLI workflow" returns the structured comparison, a factual distinction (not an invented verdict), and a paste-ready bundle — with links to the same compare page a human would see.

**Dependencies.** Spec 5 (compare semantics and the cap of 3), Spec 6 (`new_since` data hygiene), Spec 4.6 fields for bundle completeness. Can ship incrementally: 8.3 first, 8.1/8.2 next, 8.4 last.

---

## Spec 9 — The Operator (P2)

**Task-first finder vs The Operator — the difference.** They solve the same problem (a visitor with a job, not a keyword) at two different layers:

- **Task-first finder (Spec 2)** is a *map*: ~25 human-written tasks, chips, landing pages. Deterministic — the same task always returns the same curated mapping, refined by the existing ranker. It is indexable by Google, shareable as links, works with no JavaScript magic, costs nothing per use, and an editor controls exactly what it recommends.
- **The Operator** is a *conversation*: a chat box that takes free-form, multi-part jobs ("my agent needs to read my Notion, file Linear tickets, and ping me on Slack") and assembles a stack across categories on the fly. More flexible, more impressive — and more expensive, slower, harder to keep honest, and invisible to search engines.

**Why the Operator is not first.** (1) Most visitors never use site chat widgets, but every visitor can click a chip — the finder captures most of the value at a fraction of the cost. (2) The Operator is only as good as the mapping underneath it; building it first means improvising that mapping inside a chat, unsupervised. Built second, it stands on Spec 2's taxonomy, Spec 1's ranker, and Spec 7's stacks, so its recommendations are the same ones the editors stand behind. (3) The finder's landing pages bring in search traffic forever; a chat box brings in none. Ship the map, then give it a voice.

**Functional requirements (when built)**

9.1 **Positioning.** A distinct block on the homepage ("Ask the switchboard") and an entry from `/tasks`. Framed as an operator taking a request, never as a generic chatbot.
9.2 **Engine order.** (a) Match the request against Spec 2's task taxonomy; (b) rank within/between tasks with `lib/search.ts`; (c) compose a stack (Spec 7 format). An LLM may *re-rank and phrase* the result only after (a)–(b) produce candidates — it may not invent listings, fields, or verdicts. Every claim in the reply links to a listing or task page.
9.3 **Output.** A stack view (not just prose): the chosen listings with why each is there, the Spec 8.4 bundle to add them, a compare link (first 3), and "show me the task page instead" for every task used.
9.4 **Guardrails.** Rate-limited per IP like MCP submit; answers cached for identical normalized requests; a request that matches nothing says so and offers the two nearest tasks — the Spec 1.4 recovery philosophy, in chat form.
9.5 **Honesty in UI.** Results carry "Assembled from the directory's task map" so users can tell curated logic from generated text.

**Analytics.** `operator_open`, `operator_submit` (matched-task count), `operator_bundle_export`, `operator_fallback_task_click`. Kill-switch metric: if bundle export per session is not meaningfully above the task finder's, the chat front-end is decoration and gets demoted.

**Acceptance.** "I need my agent to read my email and summarize it every morning" returns a stack (email agent + scheduler/orchestration listing) with a working bundle and task-page links — and the identical request returns the identical stack tomorrow.

**Dependencies.** Specs 1, 2, 7, 8. This is deliberately last among the discovery features.

---

## Spec 10 — Live Switchboard (plugboard visualization) (P2)

**Objective.** The brand is a switchboard; make one. A single shareable visual of the whole catalog that makes 900 listings, 328 Official, and the weekly pulse *felt* rather than stated.

**Functional requirements**

10.1 **The board.** `/switchboard`: all 900 listings as jacks on a plugboard, grouped by category (22 sections, labeled), Official listings in the accent treatment, this week's additions lit. Rendered as server-generated inline SVG — no canvas/WebGL, no client-side data fetch; the page must weigh little more than the data it draws.
10.2 **Interaction.** Hover/tap a jack → name, provider, access methods, link through. Category toggle lights a whole section. A "this week" toggle lights only the latest drop (Spec 6 data). Fully usable as static image with JS off.
10.3 **Social export.** A build-time-rendered PNG of the board (current week lit) for X/social cards, regenerated with each drop — the weekly post's image, made by the site itself.
10.4 **Details.** Respects `prefers-reduced-motion` (no pulse animation); jacks are real links in the agent/text view so the page stays accessible and crawlable.

**Analytics.** `board_view`, `board_jack_click`, `board_week_toggle`.

**Acceptance.** The board loads fast, every jack reaches its listing in one click, and the exported PNG is recognizable at timeline-thumbnail size.

**Dependencies.** Spec 6 (weekly change data). Pure brand/share value — that is why it is P2 despite being the most "cool" item here.

---

## Suggested build order

1. Spec 1 (search) → 2. Spec 2 (task finder) → 3. Spec 3 (icons) → 4. Spec 4 (Use it now) → 5. Spec 5 (compare, max 3) → 6. Spec 6 (freshness) → 7. Spec 7 (collections & stacks) → 8. Spec 8 (MCP decision tools, incrementally) → 9. Spec 10 (board) whenever a drop needs a social asset → 10. Spec 9 (Operator) once the taxonomy has real usage data.

## Explicitly not in these specs

- **Trust receipt** — excluded at Assaf's request (2026-11-01). Nothing here displays verification evidence or check history publicly.
- **Vendor claim & listing-health view; agent-ready vendor badge** — dropped at Assaf's request (2026-11-01). Vendors keep using the PR/submit flow like everyone else.
- **User accounts, star ratings/reviews, marketplace/checkout, email newsletter, per-request LLM verdicts** — unchanged from the review: they fight the curated, no-account, git-as-CMS model that keeps the site trustworthy and cheap to run.

