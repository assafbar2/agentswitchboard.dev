# Changelog

Every release of [Agent Switchboard](https://agentswitchboard.dev), newest first. The site shows the same list at [agentswitchboard.dev/changelog](https://agentswitchboard.dev/changelog), followed by every change to the directory itself.

Versions follow MAJOR.MINOR.PATCH: a minor version adds features, a patch fixes or adjusts. Versions before 2.2.0 were assigned afterwards, reconstructed from the git history. "Directory" lines summarize catalog changes since the previous release; the full log of every listing added, updated or removed is on [/changelog](https://agentswitchboard.dev/changelog), and batch by batch on [/drops](https://agentswitchboard.dev/drops).

## [2.2.0] - 2026-11-01 - Share & discover

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
