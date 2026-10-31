/**
 * Smoke-tests the MCP server with the official SDK client over Streamable HTTP.
 * Never files a submission: submit_listing is only called with an
 * already-listed URL and with invalid input.
 *
 *   node scripts/mcp-smoke.mjs [https://agentswitchboard.dev/api/mcp]
 *
 * Set VERCEL_BYPASS to a Protection Bypass for Automation secret to reach a
 * protected preview deployment.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.argv[2] ?? 'http://localhost:3000/api/mcp');
const headers = process.env.VERCEL_BYPASS ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS } : {};

const client = new Client({ name: 'asb-smoke', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }));

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures += 1;
}

const info = client.getServerVersion();
check('initialize', info?.name === 'agentswitchboard', `${info?.name} ${info?.version}`);
check('server instructions', (client.getInstructions() ?? '').includes('submit_listing'));

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
check('tools/list', names.join(',') === 'get_agent,list_categories,search_agents,submit_listing', names.join(', '));
for (const t of tools) {
  check(`${t.name} readOnlyHint`, t.annotations?.readOnlyHint === (t.name !== 'submit_listing'));
}

const cats = await client.callTool({ name: 'list_categories', arguments: {} });
const categories = cats.structuredContent?.categories ?? [];
check('list_categories', categories.length > 0, `${categories.length} categories`);

const search = await client.callTool({ name: 'search_agents', arguments: { query: 'browser automation', limit: 5 } });
check('search_agents query', search.structuredContent?.agents?.length > 0, `total ${search.structuredContent?.total}`);

const category = categories[0]?.slug;
const official = await client.callTool({
  name: 'search_agents',
  arguments: { official: true, category, limit: 50 },
});
const offAgents = official.structuredContent?.agents ?? [];
check(
  `search_agents official + category=${category}`,
  offAgents.every((a) => a.official && a.categories.includes(category)),
  `${official.structuredContent?.total} results`
);

const detail = await client.callTool({ name: 'get_agent', arguments: { slug: 'playwright-mcp' } });
check('get_agent', detail.structuredContent?.slug === 'playwright-mcp', detail.structuredContent?.name);

const missing = await client.callTool({ name: 'get_agent', arguments: { slug: 'no-such-agent-asb' } });
check('get_agent unknown slug is a tool error', missing.isError === true);

const dup = await client.callTool({
  name: 'submit_listing',
  arguments: {
    name: detail.structuredContent?.name ?? 'Playwright MCP',
    url: detail.structuredContent?.agentUrl,
    description: 'Smoke test duplicate check. This must not file an issue.',
  },
});
check('submit_listing already listed', dup.structuredContent?.status === 'already_listed', dup.structuredContent?.existingSlug);

let invalidRejected = false;
try {
  const bad = await client.callTool({ name: 'submit_listing', arguments: { name: 'x', url: 'nope', description: 'short' } });
  invalidRejected = bad.isError === true;
} catch {
  invalidRejected = true;
}
check('submit_listing rejects invalid input', invalidRejected);

await client.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
