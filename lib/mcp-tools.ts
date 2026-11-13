/**
 * The tools app/api/[transport]/route.ts registers. The logger maps any other
 * tools/call name to `unknown_tool`, so a client cannot fill the analytics
 * `call` property with arbitrary text. tests/organic-surfaces.test.ts checks
 * this list against the live tools/list.
 */
export const MCP_TOOL_NAMES: ReadonlySet<string> = new Set([
  'search_agents',
  'get_agent',
  'list_categories',
  'compare_agents',
  'alternatives_to',
  'connect_bundle',
  'recommend',
  'submit_listing',
]);
