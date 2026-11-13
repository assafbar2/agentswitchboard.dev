# Changelog

Every release of [Agent Switchboard](https://agentswitchboard.dev), newest first. The site shows the same list at [agentswitchboard.dev/changelog](https://agentswitchboard.dev/changelog), followed by every change to the directory itself.

Versions follow MAJOR.MINOR.PATCH: a minor version adds features, a patch fixes or adjusts. Versions before 2.2.0 were assigned afterwards, reconstructed from the git history. "Directory" lines summarize catalog changes since the previous release; the full log of every listing added, updated or removed is on [/changelog](https://agentswitchboard.dev/changelog), and batch by batch on [/drops](https://agentswitchboard.dev/drops). From 2.2.0 on, each minor release opens with its highlights, what you can do now with a link to try it, which [/whats-new](https://agentswitchboard.dev/whats-new) also shows.

## [2.9.3] - 2026-11-13 - What's new keeps up

### Highlights
- See every weekly drop on What's new beside the site's releases: what it added, updated and removed, and its stack of the week, each with a link to try it. The Nov 13 drop added 56 agents, and its stack ships a web app with your agent. [Try it](https://agentswitchboard.dev/whats-new#drop-2026-11-13)

### Changed
- [/whats-new](https://agentswitchboard.dev/whats-new) lists each weekly drop as well as each release, newest first. A drop's highlights are written from the same data as its page on [/drops](https://agentswitchboard.dev/drops): one line on what it added, updated and removed, linking the drop, and one on its stack of the week, linking the stack. So a drop is on What's new as soon as it merges, with nothing written by hand. The homepage's What's new block shows the newest highlights from the last 30 days, releases and drops together, up to five, and is dated by the newest of them. Until now both showed only releases with highlights, so after the 2.9.1 release and the Nov 13 drop the homepage still said Nov 10. ([#402](https://github.com/assafbar2/agentswitchboard.dev/pull/402))
- Every release from 2.9.1 on, patch releases too, opens with its highlights, and CI fails a release without them, so What's new never falls behind what ships. 2.9.1 has its highlights now. ([#402](https://github.com/assafbar2/agentswitchboard.dev/pull/402))
- [/for-agents](https://agentswitchboard.dev/for-agents#rest) shows `page` and `next` in the REST search, as `GET /api/agents` answers since 2.9.1. ([#402](https://github.com/assafbar2/agentswitchboard.dev/pull/402))

### Directory
- The [Nov 13 drop](https://agentswitchboard.dev/drops/2026-11-13): the weekly run added 56 listings, 14 of them Official, updated 2 and archived 1, with [Ship a web app with your agent](https://agentswitchboard.dev/stacks/ship-a-web-app-with-your-agent) as the stack of the week. With the same day's corrections below, the drop comes to 56 added, 6 updated and 2 archived. ([#395](https://github.com/assafbar2/agentswitchboard.dev/pull/395))
- [elizaOS](https://agentswitchboard.dev/agents/eliza), [GPT Pilot](https://agentswitchboard.dev/agents/gpt-pilot) and [MobileBuildMCP](https://agentswitchboard.dev/agents/xcodebuild-mcp) go by their projects' own names. Corrected the same day, they count among the Nov 13 drop's updates. ([#390](https://github.com/assafbar2/agentswitchboard.dev/pull/390))
- [Windsurf is Devin Desktop](https://agentswitchboard.dev/agents/codeium-windsurf) now, by Cognition AI, and its listing and comparison say "formerly Windsurf". ZCode is archived while a privacy report on it is unresolved. Both count in the Nov 13 drop. ([#398](https://github.com/assafbar2/agentswitchboard.dev/pull/398))

## [2.9.2] - 2026-11-13 - A rate limit on the REST API

### Highlights
- Call the REST API knowing its limit: 120 requests a minute per IP, then HTTP 429 with a `Retry-After` header until the minute is up. Cached answers, the static catalog pages and the MCP server don't count toward it. [Try it](https://agentswitchboard.dev/for-agents#rest)

### Changed
- The REST API (every `/api/` endpoint except `/api/mcp`) allows 120 requests per minute per IP. Past that it answers HTTP 429 with a `Retry-After` header and a JSON error (`{ "error": "rate_limited", "message", "retryAfterSeconds" }`) until the minute is up. Answers served from the CDN cache do not count, the static catalog pages (`/catalog/<n>.json`) are not limited, and the MCP server keeps its own limits. [docs/API.md](https://github.com/assafbar2/agentswitchboard.dev/blob/main/docs/API.md) and [/openapi.json](https://agentswitchboard.dev/openapi.json) (now version 1.11.0) describe the 429.

## [2.9.1] - 2026-11-13 - The catalog in pages

### Highlights
- Page through the directory: [/browse](https://agentswitchboard.dev/browse) and every filtered or search view of it show 60 listings a page, with Previous and Next, so it opens and scrolls faster on a phone. [Try it](https://agentswitchboard.dev/browse?page=2)
- Read the whole catalog in pages: /agents.json is a small index that links static pages of up to 50 listings (`/catalog/1.json` and on, each with `next`), and `GET /api/agents` takes `page` and answers with `next`. [Try it](https://agentswitchboard.dev/for-agents#rest)

### Changed
- [/browse](https://agentswitchboard.dev/browse) and every filtered or search view of it show 60 listings a page, with Previous and Next links and "Page 2 of 17 · 61–120 of 985" under the cards; later pages are `?page=2` and on. The count above the cards, the filters, the sort and the agent view are as before, and changing a filter, the sort or the search goes back to page 1. A page is about 290 KB of HTML instead of 3.6 MB, so the directory opens and scrolls faster on a phone. Crawlers are kept off `?page=` like every other key the page reads. ([#394](https://github.com/assafbar2/agentswitchboard.dev/pull/394))
- `GET /api/agents` takes `page` (from 1, in steps of `limit`) as well as `offset`, and its answer adds `next`: the same query one page on, or `null` on the last page. The page size is unchanged (10 by default, up to 50), and so is every listing in `agents`. ([#394](https://github.com/assafbar2/agentswitchboard.dev/pull/394))
- [/agents.json](https://agentswitchboard.dev/agents.json) is a small index instead of the whole catalog in one file: the total, the links to the listings in static pages of up to 50 (`/catalog/1.json` and on, each with `next`), and the REST search and MCP endpoints. Each page carries every field the single file did. Anything that read `agents` from /agents.json reads the pages instead; `total` is still in the index. ([#394](https://github.com/assafbar2/agentswitchboard.dev/pull/394))

## [2.9.0] - 2026-11-10 - Nine more tasks

### Highlights
- Find the tools for product analytics, BI dashboards and data pipelines: ask about funnels and session replays, query dashboards and semantic models, or run pipelines and trace lineage. [Try it](https://agentswitchboard.dev/tasks/analyze-product-usage)
- Run CI/CD and end-to-end tests from an agent: start builds, read why a run failed, and write and fix tests for web and mobile apps. [Try it](https://agentswitchboard.dev/tasks/run-ci-cd-pipelines)
- Build sites and internal apps, draw diagrams and 3D models, send documents for signature, and manage sign-in and zero-trust access. [Try it](https://agentswitchboard.dev/tasks/build-websites-and-internal-apps)

### Added
- Nine tasks on [/tasks](https://agentswitchboard.dev/tasks), 47 in all: analyze product usage, query BI dashboards, manage data pipelines and catalogs, run CI/CD pipelines, test web and mobile apps, secure identity and network access, create and sign documents, draw diagrams and 3D models, and build websites and internal apps. Each has its own page, share card and `GET /api/tasks/<slug>`, appears on /browse as `?task=`, and is what the homepage's "I need an agent to…" box opens when you name it ("query BI dashboards", "e-signature"). Together they fit 76 listings: 27 of the 33 from the Nov 6 drop that fit no task until now, such as Pendo, ThoughtSpot, Dagster, Bitrise, Momentic, Okta, PandaDoc, Excalidraw and Retool, and 49 already in the directory, such as PostHog, Tableau, CircleCI, BrowserStack, DocuSign, Miro and Webflow. ([#371](https://github.com/assafbar2/agentswitchboard.dev/pull/371))

### Directory
- Aperture by Tailscale's description says it authenticates users by their tailnet identity, as Tailscale's docs say, so it fits secure identity and network access. ([#371](https://github.com/assafbar2/agentswitchboard.dev/pull/371))

## [2.8.7] - 2026-11-03 - Submissions in the weekly drop

### Changed
- [/submit](https://agentswitchboard.dev/submit) and `CONTRIBUTING.md` say how a submission is decided now. Every one, whether it comes by pull request, the form or the MCP `submit_listing` tool, is reviewed weekly, oldest first, and the decision is posted on its issue or pull request. An accepted listing or correction goes live in the next weekly drop, which credits the pull request it came from, and that pull request is closed with a link to the listing instead of being merged. ([#327](https://github.com/assafbar2/agentswitchboard.dev/pull/327))

## [2.8.6] - 2026-11-03 - Sitemap dates

### Changed
- The sitemap dates each page by its content: a listing by the day its file last changed; a category, alternatives, task, stack or comparison page by the newest listing it shows; the changelog and [/whats-new](https://agentswitchboard.dev/whats-new) by the latest release; and the drops by the latest drop. A page with nothing to date it by, such as [/about](https://agentswitchboard.dev/about), carries no date. Until now every page carried the time the sitemap was built, every deploy and again every hour, so a crawler that trusts the date fetched the whole site again each time. The sitemap is now built once per deploy. ([#326](https://github.com/assafbar2/agentswitchboard.dev/pull/326))
- robots.txt closes every share card to crawlers other than link previews, not only the compare, stack and Operator ones, and a crawler that ignores it on any card is turned away. People, link previews and assistants fetching a page for someone get every card as before. ([#326](https://github.com/assafbar2/agentswitchboard.dev/pull/326))

## [2.8.5] - 2026-11-03 - Lighter pages

### Changed
- Pages are lighter and load less in the background. A link now loads the page behind it when you point at it, tab to it or touch it, instead of every link on screen loading its page as soon as it shows, and the markup that cards, badges, the footer and the changelog repeat is carried by short shared classes. A listing page is about 30% smaller and a category page about half its old size; nothing looks different. ([#325](https://github.com/assafbar2/agentswitchboard.dev/pull/325))
- Crawlers get the plain [/browse](https://agentswitchboard.dev/browse), [/compare](https://agentswitchboard.dev/compare) and [/operator](https://agentswitchboard.dev/operator) pages, not the endless mixes a query makes of them. robots.txt closes those queries, shared stack links and their share cards to crawlers other than link previews, asks crawlers to wait five seconds between requests, and closes the site to SEO-tool crawlers; a crawler that ignores it on a compare, stack or Operator query or its card is turned away. People, link previews and assistants fetching a page for someone get every page as before. ([#325](https://github.com/assafbar2/agentswitchboard.dev/pull/325))
- Category pages' structured data names and links each listing without repeating its description. ([#325](https://github.com/assafbar2/agentswitchboard.dev/pull/325))
- The e2e checks run against a local production build by default. Against a deployment only the smoke and edge checks run, unless `E2E_FULL=1`, since every request to a deployment counts toward its usage. ([#325](https://github.com/assafbar2/agentswitchboard.dev/pull/325))

## [2.8.4] - 2026-11-03 - MIT license text

### Fixed
- `LICENSE` is the standard MIT text again, without the scope note, so GitHub recognises the repository as MIT. The scope stays in `LICENSE-DATA`, `content/LICENSE.md` and the README. ([#324](https://github.com/assafbar2/agentswitchboard.dev/pull/324))

## [2.8.3] - 2026-11-03 - Advertise

### Changed
- [/advertise](https://agentswitchboard.dev/advertise) now explains Sponsored slots: where a slot shows (the homepage, the latest weekly drop and the Sponsored label), what it never changes (search results, tasks, the Operator, and AI-assistant answers through the MCP server), the 1-, 4- and 12-week packages, who qualifies, and how a request is reviewed and paid by an emailed link. "Request a slot" opens a prefilled email. Prices are on request for now. ([#323](https://github.com/assafbar2/agentswitchboard.dev/pull/323))

### Removed
- The Pro Access page. /pro now redirects to /advertise, and the footer no longer links it. ([#323](https://github.com/assafbar2/agentswitchboard.dev/pull/323))

## [2.8.2] - 2026-11-03 - Cursor plugin

### Added
- A Cursor plugin for the Cursor Marketplace: [plugins/agent-switchboard](https://github.com/assafbar2/agentswitchboard.dev/tree/main/plugins/agent-switchboard) adds the Agent Switchboard MCP server to Cursor in one install, with no account or key. Until the marketplace lists it, add the server by URL as [/connect](https://agentswitchboard.dev/connect) shows. ([#322](https://github.com/assafbar2/agentswitchboard.dev/pull/322))

## [2.8.1] - 2026-11-02 - Code and data licenses

### Changed
- The licenses now say the same thing everywhere: the code is MIT, and the catalog data, every listing in `content/agents/*.json` and the same data at /agents.json, the REST API and the MCP server, is CC BY-NC 4.0, in a new `LICENSE-DATA` file. The MIT `LICENSE` notes that it covers the code, [/terms](https://agentswitchboard.dev/terms) has a Licenses section with the same wording, and the README, CONTRIBUTING and the pull request template say submitted listings are contributed under CC BY-NC 4.0. ([#321](https://github.com/assafbar2/agentswitchboard.dev/pull/321))

## [2.8.0] - 2026-11-02 - Sponsored

### Highlights
- See which listings are paid placements: each says Sponsored wherever it shows, and paying never moves a listing in search, tasks or the Operator. [Try it](https://agentswitchboard.dev/about#sponsored)

### Added
- A Sponsored label for paid placements, starting with AgentMail, Agent Switchboard and Barnir Hired. A sponsored listing says Sponsored on its card everywhere, from /browse to task, stack and drop pages; on its own page, with a line saying the placement never changes where it ranks; in compare; in the Switchboard's readout; and in the text-only views. The homepage has a Sponsored slot, boxed in ink apart from the editor's picks, and so does the latest drop page. [/about](https://agentswitchboard.dev/about#sponsored) says what Sponsored means: a paid placement, reviewed first, that never changes search results or their order, tasks, alternatives, compare or the Operator, and is separate from Featured, Official and Verified. ([#318](https://github.com/assafbar2/agentswitchboard.dev/pull/318))
- `sponsored` on every listing in the REST API and [/agents.json](https://agentswitchboard.dev/agents.json), described in llms.txt, index.md, /for-agents and skill.md. MCP tool results never carry it, and neither do the decision endpoints they share; the OpenAPI document is now version 1.10.0. ([#318](https://github.com/assafbar2/agentswitchboard.dev/pull/318))

### Changed
- The homepage's editor's picks no longer include paid placements: AgentMail and Barnir Hired moved to the Sponsored slot, and here.now is now the Editor's Pick. ([#318](https://github.com/assafbar2/agentswitchboard.dev/pull/318))

### Removed
- The free-text `sponsorLabel` field. `"sponsored": true` is now the only paid label, and the Editor's Pick label comes from the homepage picks alone. ([#318](https://github.com/assafbar2/agentswitchboard.dev/pull/318))

## [2.7.5] - 2026-11-02 - Organic answers for assistants

### Changed
- Assistants get organic results: the MCP server and the page's WebMCP tools no longer list featured listings first, and their results leave out `featured` and every other placement field, as the Claude and ChatGPT directories require. The website and the REST API are unchanged; REST search and alternatives take `order=organic` for the same order. ([#317](https://github.com/assafbar2/agentswitchboard.dev/pull/317))

## [2.7.4] - 2026-11-02 - MCP sign-in

### Directory
- Lovable, v0, Hex and Runway now say you sign in with your account when you connect their MCP server, as their docs say, instead of asking for an API key; each description says what their API needs instead. ([#319](https://github.com/assafbar2/agentswitchboard.dev/pull/319))

## [2.7.3] - 2026-11-02 - Missing spaces

### Fixed
- Three sentences on [/connect](https://agentswitchboard.dev/connect#troubleshooting) and [/privacy](https://agentswitchboard.dev/privacy) ran two words together after inline code or bold text ("/api/mcpand", "use it.Make", "submit_listingtool"). ([#320](https://github.com/assafbar2/agentswitchboard.dev/pull/320))

## [2.7.2] - 2026-11-02 - Ready for the connector directories

### Changed
- The MCP server meets the Claude Connectors Directory and ChatGPT plugin directory rules: every tool carries its title and explicit read-only, destructive and open-world hints, `submit_listing` is marked destructive so assistants ask before each public issue it files, its description says a retry files again, and tool results are compact JSON, so they cost fewer tokens. ([#316](https://github.com/assafbar2/agentswitchboard.dev/pull/316))
- The MCP endpoint answers CORS preflights for any origin, so browser-based MCP clients can call it, and Claude's published outbound range gets a larger per-IP budget, since every Claude user of the connector shares those addresses. ([#316](https://github.com/assafbar2/agentswitchboard.dev/pull/316))
- The [privacy page](https://agentswitchboard.dev/privacy) now says what the MCP server receives from assistants (tool arguments only, never your conversation), why data is used, how long each kind is kept, and every provider that receives it. [/connect](https://agentswitchboard.dev/connect#troubleshooting) has a troubleshooting section. ([#316](https://github.com/assafbar2/agentswitchboard.dev/pull/316))

### Added
- `/.well-known/openai-apps-challenge` serves the token OpenAI's plugin portal asks for to verify the domain, from the `OPENAI_APPS_CHALLENGE` setting. ([#316](https://github.com/assafbar2/agentswitchboard.dev/pull/316))

## [2.7.1] - 2026-11-02 - Vendor MCP servers

### Directory
- 15 listings now carry their vendor's own MCP setup, each copied from the vendor's docs: hosted MCP addresses for Lovable, Replit Agent, v0, Hex, Runway, Zoom, Grafana, Honeycomb, Airtable, Xero and AgentMail, and the MCP access method with its setup guide for Snowflake Cortex and Databricks AI, whose addresses are per account. Gmail MCP and Google Sheets MCP now point at Google's official remote MCP servers (Developer Preview) instead of Smithery's, and are Official. ([#315](https://github.com/assafbar2/agentswitchboard.dev/pull/315))

## [2.7.0] - 2026-11-02 - The Switchboard

### Highlights
- See every listing in the directory on one board, a jack for each in its category's panel, and point at one to see what it is. [Try it](https://agentswitchboard.dev/switchboard)
- Light up only the newest drop's listings on the board, and share the whole board as one image. [Try it](https://agentswitchboard.dev/switchboard?week=1)
- Ask the switchboard for a whole job in your own words, like “read my Notion, file Linear tickets, ping me on Slack”, and get a tool for each part, with why it was picked. [Try it](https://agentswitchboard.dev/operator?q=read+my+Notion,+file+Linear+tickets,+ping+me+on+Slack)
- Connect every tool the operator picks with one MCP config, or compare each pick with two more that fit. [Try it](https://agentswitchboard.dev/operator?q=monitor+errors+with+Sentry+and+open+Jira+tickets#connect)

### Added
- The Switchboard: [/switchboard](https://agentswitchboard.dev/switchboard) shows every listing in the directory as a jack on one board, in a panel for its category, oldest first. Official listings are filled in, and the newest drop's additions are lit, lighting up one after another as the page opens unless your device asks for reduced motion. On November 2 that is 900 listings in 22 panels, 328 of them Official and 59 lit from the October 31 drop. Point at a jack, or reach it with the keyboard, to see its name, who makes it and how it can be used, with a link to open it; on a phone, the first tap on a jack shows it and the second opens it. Show one category, or only the newest drop's listings: the address keeps the choice (`/switchboard?category=security&week=1`), so a view can be linked. With JavaScript off, the whole board shows and every jack is a link, and the text-only view lists every jack, panel by panel. The newest drop's page links its listings lit on the board, and the footer, llms.txt, index.md and /for-agents link the board. ([#312](https://github.com/assafbar2/agentswitchboard.dev/pull/312))
- The board as one image, [/switchboard/card.png](https://agentswitchboard.dev/switchboard/card.png): every listing as a jack, the newest drop's lit, in a 1200×630 PNG. It is the page's share card, the page offers it as a download, and it is redrawn with every drop. ([#312](https://github.com/assafbar2/agentswitchboard.dev/pull/312))
- The Operator: [/operator](https://agentswitchboard.dev/operator) takes a whole job in your own words, such as “read my Notion, file Linear tickets, ping me on Slack”, and puts each part through to a tool from the directory. Commas, full stops, new lines, “then” and “and” split the request into parts, up to 6, and each part goes to the task it names, by the keywords of the directory's tasks. A part that names none says so and offers the nearest tasks, each a link that asks again in the task's words. Among the task's tools, best fit first, those that mention what the part names come first: a product such as “Linear”, or a thing such as “pull requests”. Ask for an MCP server, a CLI, an API or Official, and the pick has it when one of the task's tools does; when none does, the page says so. Each pick shows why it fits, from its own skills, and why it was picked ("Picked because it mentions “Linear”."), with 2 more that fit and a link to compare the three. The picks make a stack to add to My stack, to share as the request's link, or to connect all at once with one MCP client config. No AI model is involved: the stack is assembled from the directory's task map, so the same request always gets the same stack. Its share card names the tools, never the words typed. ([#314](https://github.com/assafbar2/agentswitchboard.dev/pull/314))
- Ask the switchboard on the homepage, under "I need an agent to…": the same box, whose line says as you type which parts it will put through and the task each names, with three requests to try. The footer, llms.txt, index.md and /for-agents link the Operator, and its text-only view lists each part's task, pick, why and alternatives, then the stack's connect bundle. ([#314](https://github.com/assafbar2/agentswitchboard.dev/pull/314))

### Changed
- Page views and events sent to the site's analytics no longer carry what you typed: the page address they report leaves out search words, a request to the Operator and a stack's title. ([#314](https://github.com/assafbar2/agentswitchboard.dev/pull/314))

## [2.6.0] - 2026-11-02 - Assistants

### Highlights
- Ask your assistant to compare two or three tools, and it gets the same facts, side by side, as the compare page. [Try it](https://agentswitchboard.dev/connect)
- Ask your assistant for alternatives to a tool, each with what it has in common, or for what was added to the directory this week. [Try it](https://agentswitchboard.dev/connect#tools)
- Have your assistant turn a list of tools into one MCP config to paste, every address and command copied from the vendor's docs. [Try it](https://agentswitchboard.dev/connect#tools)
- Connect every tool in a stack at once: one MCP config to paste, a prompt for the ones to set up from their guides, and how to use the rest. [Try it](https://agentswitchboard.dev/stacks/research-analyst#connect)

### Added
- Three MCP tools that help an assistant help you choose and set up. `compare_agents` puts 2 or 3 listings side by side, as [/compare](https://agentswitchboard.dev/compare) does: the facts that set each apart ("Only one with a CLI"), then each field, listing by listing, with a curated comparison's intro line when there is one. `alternatives_to` returns the listings that could stand in for one, strongest first, as its alternatives page lists them, each with why: "Both offer API. In common: audio, speech to text, transcription." `connect_bundle` turns up to 10 listings into one MCP client config to paste (`{"mcpServers": …}`), with a `claude mcp add` command for each server in it, a prompt that has a coding agent set up the servers whose docs give no address or command, and how to connect the listings without an MCP server. Nothing in it is guessed: every address and command is copied from the vendor's docs, as on the listing's page. For Linear, Sentry, Playwright MCP and Postgres MCP Pro, the config holds the first three and Postgres MCP Pro goes to its setup guide. ([#310](https://github.com/assafbar2/agentswitchboard.dev/pull/310))
- The same answers over plain HTTP, for scripts and connector platforms: `GET /api/compare?a=<slug>&b=<slug>` takes the parameters of a /compare link, `GET /api/agents/<slug>/alternatives` follows the address of the alternatives page, and `GET /api/bundle?items=<slug>,<slug>` takes the `items` of a shared stack link. In the browser, WebMCP has the three tools too. ([#310](https://github.com/assafbar2/agentswitchboard.dev/pull/310))
- `since` on `GET /api/agents`, the MCP tool `search_agents` and WebMCP: `since=7` keeps what was added to the directory in the last 7 days (59 listings on November 2), `since=2026-10-01` what was added on or after that day. The MCP server is now version 1.7.0, the OpenAPI document 1.8.0. ([#310](https://github.com/assafbar2/agentswitchboard.dev/pull/310))
- Connect them all, on every stack's page, curated or shared: one MCP client config for the listings whose docs give a server address or command, with a `claude mcp add` command for each; a prompt that has a coding agent set up the MCP servers whose docs give neither; and how to use the listings without an MCP server. Each listing says what it needs to sign in and links its setup guide. [The research analyst stack](https://agentswitchboard.dev/stacks/research-analyst#connect) has all three kinds; on My stack, Connect them all opens your stack's shared page there. `GET /api/stacks` gives each stack a `bundleUrl`, the `GET /api/bundle` call for its listings, and the OpenAPI document is now 1.9.0. ([#311](https://github.com/assafbar2/agentswitchboard.dev/pull/311))

## [2.5.0] - 2026-11-02 - Come back

### Highlights
- See everything added to the directory in the last 30 days on one page, grouped by the weekly drop that brought it in. [Try it](https://agentswitchboard.dev/new)
- Spot new listings by their New tag, and see how many listings each category gained in the last 30 days. [Try it](https://agentswitchboard.dev/categories/infrastructure)
- Filter the directory's change log to what was added, updated or removed, in one category or all, and link the result. [Try it](https://agentswitchboard.dev/changelog?action=added&category=infrastructure#directory-changes)
- Catch up on what each release lets you do, with a link to try it, and follow every release and weekly drop in your feed reader. [Try it](https://agentswitchboard.dev/whats-new#follow)
- Keep the tools you're setting up in your own stack as you browse, then share it as one link that opens as a page anyone can read. [Try it](https://agentswitchboard.dev/stack?items=figma-mcp-server,linear,github-mcp,vercel-mcp,sentry-mcp&title=From%20design%20to%20production)

### Added
- New listings: [/new](https://agentswitchboard.dev/new) puts everything added to the directory in the last 30 days on one page, grouped by the weekly drop that brought it in, newest first, each group linking its drop. On November 2 that is 302 listings from five drops, 100 of them official. The page has its own share card and a text-only view, and the homepage, footer, [/drops](https://agentswitchboard.dev/drops), /changelog, llms.txt, index.md and /for-agents link it. ([#305](https://github.com/assafbar2/agentswitchboard.dev/pull/305))
- A New tag on the cards of listings added in the last 30 days, on /browse, on category, task, stack and alternatives pages, and under Related Agents. A category page says how many of its listings are new and links them, newest first: [Infrastructure & Ops](https://agentswitchboard.dev/categories/infrastructure) reads "105 new in 30 days". ([#305](https://github.com/assafbar2/agentswitchboard.dev/pull/305))
- Filters for the directory's change log on [/changelog](https://agentswitchboard.dev/changelog): show only what was added, updated or removed, in one category or all, each with how many changes it keeps. The address keeps the choice (`/changelog?action=removed&category=infrastructure`), so a filtered log can be linked; with JavaScript off, the whole log shows as before. ([#305](https://github.com/assafbar2/agentswitchboard.dev/pull/305))
- What's new: [/whats-new](https://agentswitchboard.dev/whats-new) says what each release since 2.2.0 lets you do, one line per feature, each with a Try it link to the page where you can try it, and links each release's full notes on /changelog. For 30 days after a release, the homepage opens with its highlights; after that, one line links /whats-new. The page has its own share card, with the latest release's first three highlights, and a text-only view; the footer, /changelog, llms.txt, index.md and /for-agents link it. Each Try it link is checked against the pages the site generates before it goes live, so none leads to a missing page. ([#306](https://github.com/assafbar2/agentswitchboard.dev/pull/306))
- Feeds of every release and weekly drop, newest first, for feed readers: [/feed.xml](https://agentswitchboard.dev/feed.xml) (RSS) and [/atom.xml](https://agentswitchboard.dev/atom.xml) (Atom). A release's entry lists its highlights with their Try it links; a drop's names the listings it added, updated and removed. Every page points feed readers to them, and /whats-new and the footer link them. ([#306](https://github.com/assafbar2/agentswitchboard.dev/pull/306))
- My stack: keep up to 10 listings you're setting up together, as you browse. Listing cards, from /browse to category, task and stack pages, have a My stack button beside Compare, and so does every listing page; once you keep one, the header shows how many. On [/my-stack](https://agentswitchboard.dev/my-stack) you can give the stack a title, put its listings in order, take some out, compare them and copy its link. It needs no account: the stack is kept in your browser, not on our servers. With JavaScript off, the buttons stay hidden. The footer links My stack. ([#308](https://github.com/assafbar2/agentswitchboard.dev/pull/308))
- Shared stacks: a stack's link, `/stack?items=<slug>,<slug>&title=<title>`, opens as a page anyone can read, with the listings in order, the ways each can be used, a link to compare them and its own share card ([one from design to production](https://agentswitchboard.dev/stack?items=figma-mcp-server,linear,github-mcp,vercel-mcp,sentry-mcp&title=From%20design%20to%20production)). Edit a copy opens it in your own My stack to change and share again; the link you opened stays as it was. A listing that has left the directory keeps its place, struck through, so an old link still makes sense, and a name the directory doesn't know is left out with a note. Shared stacks are kept out of search results. llms.txt, index.md and /for-agents explain the link, so an assistant can hand you a stack. ([#308](https://github.com/assafbar2/agentswitchboard.dev/pull/308))
- A curated stack's page can now compare its first three tools in one click, and add all of them to My stack. ([#308](https://github.com/assafbar2/agentswitchboard.dev/pull/308))

## [2.4.0] - 2026-11-02 - Decide & act

### Highlights
- Start using a listing from its page: copy its MCP client config, add it to Cursor or Claude in one click, or copy its install command. [Try it](https://agentswitchboard.dev/agents/figma-mcp-server)
- Put up to three listings side by side, with what sets each one apart. [Try it](https://agentswitchboard.dev/compare/firecrawl-vs-crawl4ai-vs-jina-reader)
- Browse curated comparisons of close alternatives, each saying what they share and where they differ. [Try it](https://agentswitchboard.dev/compare)
- Let your assistant set a listing up for you: the directory's MCP tool `get_agent` returns its ready-made client config and install command. [Try it](https://agentswitchboard.dev/connect)

### Added
- "Use it now" on listing pages, under the description: how to start using the listing, taken from its own docs. Its "Try this first" prompts come first, then a part for each way it can be used. An MCP server gets its client config to copy, Add to Cursor and Add to Claude buttons, the Claude Code command, and the address to add in Grok or ChatGPT (Figma's is `https://mcp.figma.com/mcp`); a server whose address isn't known yet gets a prompt to paste into your coding agent instead. A CLI gets its install command (Claude Code: `curl -fsSL https://claude.ai/install.sh | bash`), an API its base URL and the sign-in it needs in plain words, each with a link to its setup guide. 118 MCP servers have their address or launch command, 99 CLIs their install command and 102 APIs their base URL, each copied from the product's docs and checked against them; 316 listings link their setup guide. Nothing is filled in by guesswork: a listing without these details links to its own page. Every command is shown in full, so it can be copied by hand with JavaScript off, and the text-only view lists the same details. ([#302](https://github.com/assafbar2/agentswitchboard.dev/pull/302))
- `mcpEndpoint`, `mcpCommand`, `install`, `quickstartUrl` and `apiBaseUrl` for assistants and scripts, on REST, [/agents.json](https://agentswitchboard.dev/agents.json), MCP and WebMCP. `GET /api/agents/<slug>` and the MCP tool `get_agent` also return `useItNow`: the panel as data, with the ready-made MCP client config. The MCP server is now version 1.6.0, the OpenAPI document 1.7.0. ([#302](https://github.com/assafbar2/agentswitchboard.dev/pull/302))
- The [submit form](https://agentswitchboard.dev/submit) asks how to start using the product (its MCP server address, install command, quickstart link or API base URL), for its Use it now panel. ([#302](https://github.com/assafbar2/agentswitchboard.dev/pull/302))
- Compare: put up to three listings side by side. Listing cards, from /browse to category, task and stack pages, have a Compare button, and so does every listing page; picks wait in a tray at the bottom of the window, on every page, and a fourth asks you to remove one first. The comparison, at `/compare?a=…&b=…&c=…`, shows what each listing is, who makes it, the sign-in it needs, its MCP server address or launch command, install command and API base URL, its skills and categories, and its Use it now links, all from the listing's own data. The first row says what sets each one apart ("Only one with a CLI", "No auth required", "Most skills (12)"), and a row where every column agrees is shown once, dimmed. A listing's page compares it with its two closest alternatives in one click, and so does its alternatives page. Each comparison has a link to copy and its own share card. With JavaScript off, every comparison link still opens, and the text-only view lists the same rows. ([#304](https://github.com/assafbar2/agentswitchboard.dev/pull/304))
- Curated comparisons: [/compare](https://agentswitchboard.dev/compare) lists 13 sets of close alternatives, each on its own page with one line on what they share and where they differ, from [Deepgram vs AssemblyAI](https://agentswitchboard.dev/compare/deepgram-vs-assemblyai) to [Firecrawl vs Crawl4AI vs Jina Reader](https://agentswitchboard.dev/compare/firecrawl-vs-crawl4ai-vs-jina-reader). A listing's page links the comparisons it is in, and the footer links /compare. Curated pages are in the sitemap; any other mix is kept out of search results. ([#304](https://github.com/assafbar2/agentswitchboard.dev/pull/304))

## [2.3.0] - 2026-11-01 - Find it faster

### Highlights
- Start from the job, not a product name: say what you need done and get the tools that do it, best fit first. [Try it](https://agentswitchboard.dev/#i-need-an-agent-to)
- Browse tasks, from querying a database to taking payments, each with the listings that fit it and why. [Try it](https://agentswitchboard.dev/tasks)
- Get suggestions as you type in the search box: listings with their icons, then categories, vendors and tasks. [Try it](https://agentswitchboard.dev/browse)
- Narrow a search to Verified listings, or to those you can try without a key or sign-in, and sort by newest or most skills. [Try it](https://agentswitchboard.dev/browse?q=postgres&verified=1&auth=none)
- When a search finds nothing, see the nearest spelling and which words or filters to drop. [Try it](https://agentswitchboard.dev/browse?q=postgress)

### Added
- Search filters for **Verified** and **No auth needed** (listings you can try without a key or sign-in) beside Official on [/browse](https://agentswitchboard.dev/browse), and a Sort menu: best match, newest, most skills or A–Z. Under the result count, a line shows how many of the results each filter would keep: a search for postgres reads "6 Official · all Verified · 3 No auth needed · 4 API · 15 MCP · 8 CLI". ([#296](https://github.com/assafbar2/agentswitchboard.dev/pull/296))
- `verified`, `auth` and `sort` for assistants and scripts, on `GET /api/agents`, the MCP tool `search_agents` and WebMCP: ask for the newest MCP servers that need no key with `access=mcp&auth=none&sort=newest`. The MCP server is now version 1.4.0, the OpenAPI document 1.5.0. ([#296](https://github.com/assafbar2/agentswitchboard.dev/pull/296))
- A search on [/browse](https://agentswitchboard.dev/browse) that finds nothing no longer ends at "try a different search". The page names the words nothing in the directory uses, suggests the nearest spelling ("Did you mean postgres?"), offers to drop each word or filter that rules everything out, with how many results each brings back, previews the closest matches, and suggests two categories. The text-only view lists the same links. ([#298](https://github.com/assafbar2/agentswitchboard.dev/pull/298))
- Suggestions as you type in the search box, on the homepage and [/browse](https://agentswitchboard.dev/browse). From the second letter it lists up to five matching listings with their icons, then matching categories and official vendors with how many listings each has. Arrow keys and Enter, or a click, open the listing's page or /browse filtered to that category or vendor; Esc closes the list, and Enter with nothing highlighted runs the full search as before. The box loads one 17 KB file of names the first time you click into it, so each keystroke is answered in the browser, with no round trip to the server. ([#299](https://github.com/assafbar2/agentswitchboard.dev/pull/299))
- Tasks: start from the job instead of a product name. [/tasks](https://agentswitchboard.dev/tasks) lists 38, from "query a database" and "search the web" to "transcribe audio" and "take payments", each with how many listings do it. A task's page shows the 12 that fit best, each with why, taken from the listing's own skills (Postgres MCP Pro: "SQL Execution: Runs queries against Postgres…"), then its official listings, related tasks and the stacks its tools are in, and has its own share card. On /browse, `?task=query-a-database` narrows the directory to the task's 46 listings, best fit first; every filter and the sort still work, one click removes the task, and a search inside a task that finds nothing offers to drop it. The footer links /tasks. ([#300](https://github.com/assafbar2/agentswitchboard.dev/pull/300))
- `task` for assistants and scripts, on `GET /api/agents`, the MCP tool `search_agents` and WebMCP: `task=query-a-database&access=mcp` returns the MCP servers that query a database, best fit first. `GET /api/tasks` lists every task with how many listings fit it, and `GET /api/tasks/<slug>` returns one with all its listings, why each fits, related tasks and stacks. The MCP server is now version 1.5.0, the OpenAPI document 1.6.0. ([#300](https://github.com/assafbar2/agentswitchboard.dev/pull/300))
- "I need an agent to…" on the homepage, under the search box: say the job in your own words and Go opens the task it names ("read my inbox" opens send and read email, "query postgres" opens query a database) or, when the words name no task, runs them as a search. Before you press it, the line under the box says which it will do and offers the closest tasks, or a search instead. Eight common tasks sit beside the box as chips, and atop [/browse](https://agentswitchboard.dev/browse) when nothing is chosen yet, where a chip keeps the sort; the text-only view lists them with how many listings fit. The search box's suggestions now include tasks too: typing postgres offers "query a database · 46 agents". ([#301](https://github.com/assafbar2/agentswitchboard.dev/pull/301))

### Fixed
- The MCP server's manifest at `/.well-known/mcp.json` gave an old version number, and the OpenAPI document listed three MCP tools instead of four. ([#296](https://github.com/assafbar2/agentswitchboard.dev/pull/296))

## [2.2.0] - 2026-11-01 - Share & discover

### Highlights
- Browse each weekly drop: what it added, Official listings first, and what it updated and removed. [Try it](https://agentswitchboard.dev/drops)
- Copy a ready-made first prompt from a listing's page, built from one of its own skills. [Try it](https://agentswitchboard.dev/agents/box-mcp)
- See a listing's closest alternatives, each saying what it has in common with it. [Try it](https://agentswitchboard.dev/agents/firecrawl/alternatives)
- Pick up a stack: tools that work together for one job, in order, each saying what it does there. [Try it](https://agentswitchboard.dev/stacks/research-analyst)

### Added
- Changelog: every site release is now recorded here and shown on [/changelog](https://agentswitchboard.dev/changelog), above the directory's own change log. Earlier versions were reconstructed from the git history. ([#287](https://github.com/assafbar2/agentswitchboard.dev/pull/287))
- Real icons for 890 of the 900 listings, on cards, the homepage and listing pages. Each is fetched once from the product's own site or its GitHub organization, reviewed by eye, and served from agentswitchboard.dev. A listing without one shows its initial on yellow. ([#289](https://github.com/assafbar2/agentswitchboard.dev/pull/289))
- `iconUrl` in REST, [/agents.json](https://agentswitchboard.dev/agents.json), MCP and WebMCP results: an absolute link to the listing's 128px icon, or `null`. The MCP server is now version 1.3.0. ([#289](https://github.com/assafbar2/agentswitchboard.dev/pull/289))
- Share cards: every listing and category has its own preview image when its link is shared on X, LinkedIn, Slack and elsewhere. A listing's card shows its icon, name, provider, Official and Verified labels, access methods and category; a category's shows its listing count and sample icons. ([#290](https://github.com/assafbar2/agentswitchboard.dev/pull/290))
- Weekly drops: each batch of listings has its own page with what was added (Official first), updated and removed, and its own share card. [/drops](https://agentswitchboard.dev/drops) lists all 26 since March, newest first, plus anything changed since the last one; the homepage, footer, /changelog, llms.txt and index.md link them. Pages are generated from the directory change log, so a new batch gets its page as soon as it lands. ([#291](https://github.com/assafbar2/agentswitchboard.dev/pull/291))
- "Try this first" on listing pages: up to three ready-to-paste prompts with a copy button, each built from one of the listing's own skills, so none is made up. MCP listings get prompts for your assistant ("Use Box MCP server to search files: ‹what you're looking for›"), API and CLI listings prompts for your coding agent. 735 of the 747 listings with skills have them, in the text-only view too. ([#292](https://github.com/assafbar2/agentswitchboard.dev/pull/292))
- Alternatives pages: 704 listings have a page at `/agents/<slug>/alternatives` with up to 8 alternatives, strongest match first, each saying what it has in common with the listing: the access methods both offer and the skills or tags they share. Only listings with at least 3 genuine alternatives get a page, linked as "See N alternatives" under Related Agents, with its own share card. ([#294](https://github.com/assafbar2/agentswitchboard.dev/pull/294))
- Stacks: [/stacks](https://agentswitchboard.dev/stacks) collects listings that work together for one job, in order, each saying what it does for that job: a research analyst in five tools, a no-key MCP starter pack, a team of coding agents, a realtime voice agent, and monitoring for agents in production. The stack of the week, built around a weekly drop's new listings, is on the homepage and on its drop page; the first ships iPhone and Android apps from one coding agent with Apple's Xcode MCP and Google's Android CLI. Every stack has its own share card, and assistants can read them at `GET /api/stacks`. ([#295](https://github.com/assafbar2/agentswitchboard.dev/pull/295))

### Changed
- The site's own preview image shows live listing counts and vendor logos. It moved to [/card.png](https://agentswitchboard.dev/card.png); the old `/opengraph-image` address redirects there. ([#290](https://github.com/assafbar2/agentswitchboard.dev/pull/290))
- Related Agents pairs listings on what they do, not where they run or how they are built. A shared platform or trait (Google Cloud, Claude Code, human-in-the-loop, no-code, real-time, a licence or a funding round) no longer makes two listings related on its own. Neither does one term split across two tags ("time series" in a monitoring tool, "time series forecasting" in a model platform) or two forms of one word ("deploy" and "deployment"). Multi-agent frameworks now pair with each other (PraisonAI with AG2, Google ADK and Microsoft Agent Framework; LangGraph with AutoGen and CrewAI), as do real-time voice frameworks such as LiveKit Agents, Pipecat and TEN. ([#294](https://github.com/assafbar2/agentswitchboard.dev/pull/294))

### Fixed
- On phones, the homepage's "Latest drop" box puts its icons above the text, which had been squeezed into a column a few words wide. ([#295](https://github.com/assafbar2/agentswitchboard.dev/pull/295))
- Usage counts for the API and the machine-readable docs no longer include the site's own link prefetches. Each visit to [/for-agents](https://agentswitchboard.dev/for-agents) was counted as calls to the API endpoints, `/openapi.json` and `/skill.md` it links to, and each visit to [/terms](https://agentswitchboard.dev/terms) as a call to `GET /api/agents`. ([#295](https://github.com/assafbar2/agentswitchboard.dev/pull/295))

### Security
- Closed an open image proxy: the image optimizer fetched images from any https host, so anyone could route images through the site. Icons are now plain files. ([#289](https://github.com/assafbar2/agentswitchboard.dev/pull/289))

## [2.1.5] - 2026-10-31 - Grok Bot on X

### Added
- Use the directory from X: a [Grok Bot section](https://agentswitchboard.dev/connect#grok-bot) on /connect and a homepage callout. Tag @bot under any post and the answer lands in the Grok Bot app. ([#279](https://github.com/assafbar2/agentswitchboard.dev/pull/279))

### Fixed
- Homepage: Top Agents stays in one column instead of splitting across two. ([#280](https://github.com/assafbar2/agentswitchboard.dev/pull/280))

### Directory
- Weekly drop (Oct 30): 58 listings added, 5 updated, including Apple's Xcode MCP, Google's Android CLI, Microsoft's Copilot SDK, and Box, JFrog and New Relic MCP servers. 900 listed, 328 Official.

## [2.1.4] - 2026-10-30 - Use it from Grok, Claude and ChatGPT

### Added
- [/connect](https://agentswitchboard.dev/connect): step-by-step setup for adding the directory as an MCP server in Grok, Claude and ChatGPT. ([#276](https://github.com/assafbar2/agentswitchboard.dev/pull/276))
- MCP tool `submit_listing`: an assistant can file a listing suggestion for human review. ([#276](https://github.com/assafbar2/agentswitchboard.dev/pull/276))

### Security
- Rate limits on the MCP server and on listing submissions. ([#276](https://github.com/assafbar2/agentswitchboard.dev/pull/276))

## [2.1.3] - 2026-10-29 - Social cards that refresh

### Fixed
- Social cards use a content-hashed image URL, so X and others fetch the new card when it changes.
- Issues found by the first full test run against the live site.

### Changed
- A live end-to-end test suite now checks the production site: navigation, search, listings, machine endpoints, accessibility, SEO tags and phone layouts.

## [2.1.2] - 2026-10-28 - The Exchange Directory look

### Changed
- New look: a phone-book directory with Barlow Semi Condensed type, heavy ink rules, signal-yellow section bars and dotted leaders between names and details.
- Header, footer and view toggle restyled, with an agent bar at the top of every page pointing agents to the machine-readable endpoints.
- Homepage laid out in directory columns with a thumb-index category rail; the rail also appears on category and browse pages.

### Fixed
- Badge contrast, and the undefined Premium tier removed.

### Directory
- Barnir Hired added as a featured, sponsored listing; Manufact split out from mcp-use; free-claude-code archived.

## [2.1.1] - 2026-10-24 - Quality pass

### Added
- A written definition of the Verified badge wherever it appears.

### Changed
- Search reads queries word by word, and access words such as "mcp" or "cli" filter results instead of matching text. Active filters survive a new search.
- Listing pages show genuine related agents (same category, shared access method, rare shared keywords), developer facts, and honest structured data.
- Cards show full names, a labelled Verified badge and a provider line, with lighter markup.
- Analytics: Google Analytics removed; calls from agents and reads of the machine-readable docs are counted instead.
- API and MCP expose `featured`, accept `extension` for browser extensions, and the manifest matches the live schema.
- One access-method vocabulary and written flag definitions across llms.txt, /for-agents and skill.md.

### Fixed
- [/index.md](https://agentswitchboard.dev/index.md), the Markdown twin of the homepage, no longer returns HTTP 500.
- Accessibility: AA text contrast, a visible hero, phone-width layout fixes and correct category counts.
- Submissions keep the submitter's email off the public GitHub issue.
- WebMCP runs the same search as the remote MCP server.
- Catalog reads are bounded, fixing failures under load.

### Directory
- Weekly drop (Oct 16): 31 added, 4 updated. 52 more added from the submission backlog; 54 listings verified; Midjourney, Smithery and a duplicate archived. 842 listed.

## [2.1.0] - 2026-10-10 - Official badge

### Added
- Official badge for first-party listings from major vendors, with an Official filter and "More from ‹vendor›" links. ([#194](https://github.com/assafbar2/agentswitchboard.dev/pull/194))

### Directory
- Weekly drop (Oct 2): 84 added; monthly maintenance updated 5 listings. ([#173](https://github.com/assafbar2/agentswitchboard.dev/pull/173))
- Weekly drop (Oct 9): 76 added, 8 updated, 1 archived. 762 listed. ([#195](https://github.com/assafbar2/agentswitchboard.dev/pull/195))

## [2.0.8] - 2026-09-25 - A stricter Verified bar

### Added
- A stricter Verified bar, and curated homepage slots for the Editor's Pick, featured and newest listings. ([#135](https://github.com/assafbar2/agentswitchboard.dev/pull/135))

### Changed
- The catalog data is licensed CC BY-NC 4.0 (the code stays MIT), stated in the OpenAPI description too. ([#136](https://github.com/assafbar2/agentswitchboard.dev/pull/136), [#138](https://github.com/assafbar2/agentswitchboard.dev/pull/138))

### Fixed
- Drifted links: 8 renamed repositories, 46 moved hosts and docs pages, 2 dead links. ([#137](https://github.com/assafbar2/agentswitchboard.dev/pull/137))

### Directory
- Weekly drop (Sep 25): 33 added, 6 updated; headlong archived. 603 listed. ([#133](https://github.com/assafbar2/agentswitchboard.dev/pull/133))

## [2.0.7] - 2026-09-19 - Ready for assistants

### Added
- [skill.md](https://agentswitchboard.dev/skill.md), a catalog REST endpoint shaped for assistants, terms of use, and a 512px icon. ([#109](https://github.com/assafbar2/agentswitchboard.dev/pull/109))

### Changed
- Privacy policy and terms of use are easier to find. ([#110](https://github.com/assafbar2/agentswitchboard.dev/pull/110))

### Directory
- ModelShortlist, AgentOps Apify Bundle and MDZHB added. 571 listed.

## [2.0.6] - 2026-09-18 - REST search and richer MCP

### Added
- Plain REST search at [/api/agents](https://agentswitchboard.dev/api/agents), documented in [docs/API.md](https://github.com/assafbar2/agentswitchboard.dev/blob/main/docs/API.md).
- MCP tools return output schemas and structured content; `search_agents` gained real pagination and an `access` filter.
- WebMCP is declared in the page markup, so crawlers that only fetch HTML can find the in-browser tools.

### Directory
- Weekly drop (Sep 13): 31 added. ([#99](https://github.com/assafbar2/agentswitchboard.dev/pull/99))
- Community pull requests merged after their endpoints were checked: msgboard, RenooLab, SandBase Harness, Artifactories, BitFun, ImagineVid. ([#101](https://github.com/assafbar2/agentswitchboard.dev/pull/101), [#103](https://github.com/assafbar2/agentswitchboard.dev/pull/103), [#104](https://github.com/assafbar2/agentswitchboard.dev/pull/104))
- Weekly drop (Sep 18): 30 added, 2 updated. 568 listed. ([#108](https://github.com/assafbar2/agentswitchboard.dev/pull/108))

## [2.0.5] - 2026-09-08 - Fewer rebuilds

### Changed
- Pages no longer regenerate on a timer; they rebuild when the catalog changes, which only happens on deploy. ([#88](https://github.com/assafbar2/agentswitchboard.dev/pull/88))

### Directory
- Weekly drop (Sep 2): 38 added. 500 listed. ([#45](https://github.com/assafbar2/agentswitchboard.dev/pull/45))

## [2.0.4] - 2026-08-30 - WebMCP

### Added
- WebMCP: the catalog's search tools are exposed inside the page, so browser agents can call them directly.
- Autonomous Agents category, launched with 9 listings including Grok Bot and Claude Cowork.

### Changed
- Pages made legible to the agents the directory catalogs: plain structure, stable labels, machine-readable links.

### Directory
- Weekly drop (Aug 15): 30 added. ([#25](https://github.com/assafbar2/agentswitchboard.dev/pull/25))
- Weekly drop (Aug 24): 28 added, 1 updated. User submissions What Are You Building and Stripe Link added. 462 listed.

## [2.0.3] - 2026-08-10 - llms.txt from the live catalog

### Changed
- [/llms.txt](https://agentswitchboard.dev/llms.txt) is generated from the catalog on every build instead of written by hand.

### Directory
- Weekly drop (Aug 10): 38 added, 1 updated, 1 archived. 399 listed.

## [2.0.2] - 2026-08-06 - Deploy fix

### Fixed
- A corrupted changelog file that broke deploys was repaired.

### Directory
- Weekly drops (Jul 25 and Jul 31): 58 added, 1 updated. ([#6](https://github.com/assafbar2/agentswitchboard.dev/pull/6), [#11](https://github.com/assafbar2/agentswitchboard.dev/pull/11))
- Framelink and Figma Context MCP merged into one listing (same product). Sentry MCP and OutreachAgent added. 362 listed. ([#14](https://github.com/assafbar2/agentswitchboard.dev/pull/14))

## [2.0.1] - 2026-07-24 - Licenses

### Added
- Licenses: MIT for the code, CC BY 4.0 for the catalog data.
- Maintainer verification for the Glama MCP registry.

## [2.0.0] - 2026-07-23 - Open source

### Added
- The catalog moved from a hosted CMS into the open GitHub repository: one JSON file per listing, validated on every pull request. Anyone can propose a listing or a fix by pull request.
- [/changelog](https://agentswitchboard.dev/changelog), with the history of every listing backfilled.
- A listing form at [/submit](https://agentswitchboard.dev/submit) for people who don't use GitHub.
- The directory's MCP server listed in MCP registries, with a Dockerfile for registry checks and a distribution guide.
- Contributor docs, and logging of which clients call the MCP server.
- Umami traffic analytics. ([#5](https://github.com/assafbar2/agentswitchboard.dev/pull/5))

### Directory
- 302 listings moved over, plus the directory's own listing. 303 listed. Hilt Pay Agent Gateway added just before the move.

## [1.9.0] - 2026-07-17 - The directory as an MCP server

### Added
- An MCP server for the directory itself at /api/mcp, so assistants can search the catalog.
- A weekly link checker that finds dead and moved links.

### Directory
- Weekly drops (Jul 17): Zero by ZeroClick plus 25 more.

## [1.8.0] - 2026-07-10 - Reliability and security

### Fixed
- Live bugs fixed and security and reliability hardened.

### Changed
- Architecture consolidated into one data layer for every page and endpoint.

### Directory
- Weekly drop (Jul 6): 36 added.

## [1.7.0] - 2026-06-15 - Orchestration

### Added
- Orchestration category; 6 listings recategorized into it.

### Directory
- Weekly drop (Jun 7): 14 added. Weekly drop (Jun 15): 3 added, plus Sentry MCP.

## [1.6.0] - 2026-05-22 - Communication

### Added
- Communication category.

### Changed
- Homepage: Clawvisor pinned as a featured Top Agent; the newest-listings slots trimmed to two.

### Directory
- Weekly drops and audits in May: 5, 3, 4 and 15 added, then 23 and 19 on May 22. Agent Payment Safety Audit Desk added from a submission.

## [1.5.0] - 2026-04-29 - For humans and for agents

### Added
- A Human / Agent view toggle on every page. The agent view is a compact plain-text version for AI agents and LLM tools, including category pages.
- `createdAt` and `updatedAt` for every listing in [/agents.json](https://agentswitchboard.dev/agents.json).

### Directory
- Weekly drop and audit (Apr 17): 13 and 16 added.

## [1.4.0] - 2026-04-13 - Readable by agents

### Added
- The first agent-readable layer: [/llms.txt](https://agentswitchboard.dev/llms.txt), [/agents.json](https://agentswitchboard.dev/agents.json) and [/for-agents](https://agentswitchboard.dev/for-agents).
- Weekly drop tooling for adding batches of listings.

### Changed
- Homepage stats merged into the hero, moving Top Agents up the page.

### Directory
- First catalog audit: 21 added.

## [1.3.0] - 2026-04-11 - Ready to share and to find

### Added
- Open Graph tags, canonical URLs and structured data on every page, plus related agents and richer category pages.
- A generated social card image for link previews.
- Homepage labels: Editor's Pick, Featured and New, with automatic slot filling.

### Changed
- Contact email is barnir@agentmail.to everywhere.

### Fixed
- The social card rendered blank on agent and sub-pages.

## [1.2.0] - 2026-04-09 - Four new categories

### Added
- Memory, Browser, Vector DB and Voice categories, with 21 new listings.

### Changed
- Light mode is the default theme.

### Fixed
- A page hydration mismatch caused by the theme toggle.

### Directory
- Diarize.io and Microsoft's Playwright MCP added; Intercom Fin gained its CLI.

## [1.1.0] - 2026-03-31 - Commerce, analytics and a real icon

### Added
- Commerce & Payments category, with Colab MCP, NemoClaw, Shopify, Rox, Oracle 26ai and Wonderful.
- Vercel Analytics.
- The switchboard icon, replacing the default favicon.

### Changed
- Search-engine titles and descriptions, and new hero copy.

### Fixed
- Search no longer crashes on listings whose skills are plain strings.

## [1.0.0] - 2026-03-22 - Launch

### Added
- Agent Switchboard: a homepage, a searchable and filterable directory, category pages, and a page for every agent with its skills, access methods and authentication.
- Light and dark themes.
