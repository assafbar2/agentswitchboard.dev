# Distribution

Where the Agent Switchboard MCP server is listed, and how to update each channel.

The server: remote streamable-HTTP at `https://agentswitchboard.dev/api/mcp` (no auth).
Tools: `search_agents`, `get_agent`, `list_categories`, `compare_agents`, `alternatives_to`, `connect_bundle`, `recommend`, `submit_listing`, `request_missing_tool`.
User-facing setup steps per assistant: [/connect](https://agentswitchboard.dev/connect).

**AI-assistant surfaces are always organic.** The MCP server and the WebMCP tools rank by
relevance or A→Z, and never return or rank by `featured`, `sponsored`, `sponsorLabel` or
`tier`. Directory policies forbid ads: Anthropic's [Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy)
4.C excludes "advertisements, sponsored content, paid product placements", and OpenAI's
[plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines) say plugins
"must not serve advertisements". Paid placement lives only on the website and the REST API.
[tests/organic-surfaces.test.ts](tests/organic-surfaces.test.ts) fails if a placement field
or a placement-dependent order reaches either surface.

| Channel | Status | Listing | Notes |
|---|---|---|---|
| Official MCP registry | ✅ Active (v1.2.0 published 2026-10-31) | `io.github.assafbar2/agentswitchboard` v1.2.0 | The registry MCP clients query directly; PulseMCP ingests from it |
| awesome-mcp-servers | ⏳ PR open | [punkpeye/awesome-mcp-servers#10771](https://github.com/punkpeye/awesome-mcp-servers/pull/10771) | Badge + Dockerfile requirements met; waits on Glama score + maintainer merge |
| Glama servers | ⏳ Submitted 2026-07-23 | `glama.ai/mcp/servers/assafbar2/agentswitchboard.dev` | Checks build the repo Dockerfile: start + introspection |
| Glama connectors | ◻ Not yet listed | glama.ai/mcp/connectors | Optional: submit the hosted endpoint URL |
| Grok / Grok Bot | ◻ Not in Grok's connector list | — | Grok has a curated list of brand connectors (44 on 2026-11-02) with no public submission route; users add it by URL (grok.com/connectors → Custom, or ask a Bot); steps on /connect |
| Claude Connectors Directory | ◻ Ready to submit | — | Assaf submits at claude.ai/directory/manage (paid Claude plan). Custom connector by URL works today; /connect has a prefilled install link |
| ChatGPT plugin directory | ◻ Ready to submit | — | Assaf uploads a plugin ZIP at platform.openai.com (verified identity) and sets `OPENAI_APPS_CHALLENGE` in Vercel for domain verification. Custom MCP plugin by URL works today |
| GitHub MCP Registry (github.com/mcp, VS Code) | ◻ Not listed | — | Curated from the official registry by manual onboarding: request in github/github-mcp-server discussions or partnerships@github.com |
| Cursor Marketplace | ◻ Ready to submit | [plugins/agent-switchboard](plugins/agent-switchboard) | Assaf applies at cursor.com/marketplace/publish (Cursor sign-in) with this repo's URL; Cursor reviews it by hand |
| Smithery | ◻ Not listed | — | Publish the hosted URL at smithery.ai/new (Smithery account) |
| Microsoft 365 Copilot connectors | ◻ Not listed | — | Partner Center, verified publisher; every tool needs a title and `readOnlyHint` (already set) |

## Updating

**Official registry** (new version): bump `version` in [server.json](server.json), then

```sh
mcp-publisher login github   # device flow
mcp-publisher publish
```

Verify: `curl "https://registry.modelcontextprotocol.io/v0/servers?search=agentswitchboard"`

**Glama**: re-indexes from the repo; keep the [Dockerfile](Dockerfile) booting the site so
`/api/mcp` answers `initialize`. Local check:

```sh
npm run build && PORT=3100 npm start &
curl -s -X POST http://localhost:3100/api/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"check","version":"1.0"}}}'
```

**Cursor Marketplace**: the plugin lives in [plugins/agent-switchboard](plugins/agent-switchboard)
(Cursor Plugin format: `.cursor-plugin/plugin.json`, `mcp.json`, `assets/logo.svg`, `README.md`),
registered by [.cursor-plugin/marketplace.json](.cursor-plugin/marketplace.json) at the repo root.
Cursor reviews every update before it ships, so bump `version` in the plugin's `plugin.json` when
its files change. [tests/cursor-plugin.test.ts](tests/cursor-plugin.test.ts) checks it against
Cursor's submission checklist and keeps its README's tool list, MCP URL and logo in step with the
server. To try it in Cursor, copy the folder to `~/.cursor/plugins/local/agent-switchboard`,
run Developer: Reload Window, and check Customize for the `agent-switchboard` MCP server.

**awesome-mcp-servers**: the listing line lives in their README (Search & Data Extraction
section) with a Glama score badge. Edit via PR only.
