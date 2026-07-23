# Distribution

Where the Agent Switchboard MCP server is listed, and how to update each channel.

The server: remote streamable-HTTP at `https://agentswitchboard.dev/api/mcp` (no auth).
Tools: `search_agents`, `get_agent`, `list_categories`.

| Channel | Status | Listing | Notes |
|---|---|---|---|
| Official MCP registry | ✅ Active (published 2026-07-23) | `io.github.assafbar2/agentswitchboard` v1.0.0 | The registry MCP clients query directly |
| awesome-mcp-servers | ⏳ PR open | [punkpeye/awesome-mcp-servers#10771](https://github.com/punkpeye/awesome-mcp-servers/pull/10771) | Badge + Dockerfile requirements met; waits on Glama score + maintainer merge |
| Glama servers | ⏳ Submitted 2026-07-23 | `glama.ai/mcp/servers/assafbar2/agentswitchboard.dev` | Checks build the repo Dockerfile: start + introspection |
| Glama connectors | ◻ Not yet listed | glama.ai/mcp/connectors | Optional: submit the hosted endpoint URL |

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

**awesome-mcp-servers**: the listing line lives in their README (Search & Data Extraction
section) with a Glama score badge. Edit via PR only.
