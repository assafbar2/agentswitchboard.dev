# Contributing to AgentSwitchboard.dev

## Directory Submission

To submit an agent for listing in the directory, visit `/submit` on the site or open a pull request.

### Requirements

- The agent must expose a public Streamable HTTP MCP endpoint.
- The agent must have a public HTTP API.
- Read access must work without authentication (anonymous access).
- The service must be open-source with a permissive license (MIT, Apache-2.0, etc.).

### How to Submit

1. Fork this repository.
2. Add your agent entry to `.github/agents.json`.
3. Update `README.md` with your agent in the table.
4. Open a pull request with a clear description of your agent and its MCP endpoint.

### agents.json Schema

```json
{
  "agents": [
    {
      "name": "Agent Name",
      "url": "https://example.com",
      "mcpEndpoint": "https://example.com/mcp",
      "description": "Brief description of the agent.",
      "tags": ["tag1", "tag2"],
      "github": "https://github.com/example/repo",
      "license": "MIT",
      "submitter": "contact@example.com"
    }
  ]
}
