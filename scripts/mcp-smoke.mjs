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
check(
  'tools/list',
  names.join(',') === 'alternatives_to,compare_agents,connect_bundle,get_agent,list_categories,search_agents,submit_listing',
  names.join(', ')
);
for (const t of tools) {
  const write = t.name === 'submit_listing';
  const a = t.annotations ?? {};
  check(`${t.name} readOnlyHint`, a.readOnlyHint === !write);
  // Claude and ChatGPT directory review: a title, and every hint an explicit boolean.
  check(
    `${t.name} directory annotations`,
    Boolean(t.title) && a.title === t.title && a.destructiveHint === write && typeof a.openWorldHint === 'boolean',
    `destructiveHint ${a.destructiveHint}, openWorldHint ${a.openWorldHint}`
  );
}

const preflight = await fetch(url, {
  method: 'OPTIONS',
  headers: { ...headers, Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' },
});
check(
  'CORS preflight',
  preflight.ok && preflight.headers.get('access-control-allow-origin') === '*' &&
    /mcp-protocol-version/i.test(preflight.headers.get('access-control-allow-headers') ?? ''),
  `HTTP ${preflight.status}`
);

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

const recent = await client.callTool({ name: 'search_agents', arguments: { since: 30, sort: 'newest', limit: 5 } });
check(
  'search_agents since (a number of days)',
  !recent.isError && /^\d{4}-\d{2}-\d{2}$/.test(recent.structuredContent?.since ?? ''),
  `since ${recent.structuredContent?.since}, total ${recent.structuredContent?.total}`
);
const badSince = await client.callTool({ name: 'search_agents', arguments: { since: 'last week' } });
check('search_agents invalid since is a tool error', badSince.isError === true);

const compared = await client.callTool({ name: 'compare_agents', arguments: { slugs: ['deepgram', 'assemblyai'] } });
check(
  'compare_agents',
  compared.structuredContent?.agents?.length === 2 && compared.structuredContent.rows.length > 0,
  compared.structuredContent?.title
);
const alone = await client.callTool({ name: 'compare_agents', arguments: { slugs: ['deepgram'] } });
check('compare_agents with one listing is a tool error', alone.isError === true);

const alternatives = await client.callTool({ name: 'alternatives_to', arguments: { slug: 'deepgram', limit: 3 } });
const alts = alternatives.structuredContent?.alternatives ?? [];
check('alternatives_to', alts.length > 0 && alts.length <= 3, `${alternatives.structuredContent?.total} alternatives`);

const bundle = await client.callTool({
  name: 'connect_bundle',
  arguments: { slugs: ['linear', 'playwright-mcp', 'postgres-mcp-pro', 'deepgram'] },
});
const servers = Object.keys(bundle.structuredContent?.config?.mcpServers ?? {});
check('connect_bundle', servers.includes('linear') && servers.includes('playwright-mcp'), bundle.structuredContent?.summary);

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
