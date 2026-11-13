# Agent Switchboard for Cursor

Search [Agent Switchboard](https://agentswitchboard.dev), a curated directory of AI agents, MCP
servers and agentic tools, from Cursor's agent. Ask which tool fits a job, read a listing's setup
steps, compare listings, find alternatives, and get one MCP config for several tools.

The plugin adds one MCP server, `https://agentswitchboard.dev/api/mcp` (Streamable HTTP). It needs
no account, API key or configuration. In approval prompts it appears as
`plugin-agent-switchboard-agent-switchboard`.

## Tools

| Tool | What it does |
| --- | --- |
| `search_agents` | Find listings for a job: by query, task, category, access method (MCP, API, CLI, SDK and more), sign-in type, or official and verified status |
| `get_agent` | One listing with its description, access methods, and MCP address or install command |
| `list_categories` | The directory's categories, with how many listings each has |
| `compare_agents` | Two or three listings side by side |
| `alternatives_to` | Listings that could stand in for one, with what each has in common |
| `connect_bundle` | One MCP client config for up to 10 listings, and how to connect the rest |
| `recommend` | One pick for what you need, said in a sentence, with why it fits, the next step and two alternatives |
| `submit_listing` | Suggests a missing product by filing a public GitHub issue for human review. It publishes nothing. It is marked destructive, so clients ask before calling it |
| `request_missing_tool` | Says privately that nothing in the directory does a job, for the weekly review. It publishes nothing |

Every tool except `submit_listing` and `request_missing_tool` is read-only.

## Try it

- "Find an MCP server that can query a Postgres database."
- "How do I connect the Playwright MCP server, and is it official?"
- "Compare GitHub Copilot, Cursor and Windsurf."
- "What are good alternatives to Pinecone?"
- "Give me one MCP config with Playwright MCP, GitHub MCP and Notion MCP."

## Results and privacy

Results are organic: they rank by relevance or A→Z, never by paid placement. The server receives
only the arguments of each tool call, never your conversation or code. See the
[privacy policy](https://agentswitchboard.dev/privacy).

## License

The plugin is MIT, like the rest of the repository's code. The catalog data its tools return is
CC BY-NC 4.0; see [LICENSE-DATA](https://github.com/assafbar2/agentswitchboard.dev/blob/main/LICENSE-DATA).

## Help

Setup for other assistants and troubleshooting: [agentswitchboard.dev/connect](https://agentswitchboard.dev/connect#troubleshooting).
Support: [agentswitchboard.dev/contact](https://agentswitchboard.dev/contact).
