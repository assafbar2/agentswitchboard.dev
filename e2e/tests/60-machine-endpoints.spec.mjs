// Machine endpoints on the live site: llms.txt, index.md, content negotiation,
// agents.json, REST API, skill.md, robots, sitemap, .well-known, openapi, MCP.
// GET only, plus JSON-RPC POSTs to /api/mcp (read-only tools).
import { test, expect } from './fixtures.mjs';

const UA = 'Mozilla/5.0 asb-e2e (machine endpoint tests)';
const H = { 'user-agent': UA };
const REAL_SLUG = 'playwright-mcp';
// status: "archived" in content/agents/*.json at HEAD
const ARCHIVED_SLUGS = ['midjourney', 'blender-mcp', 'smithery', 'framelink', 'headlong'];
const MCP_HEADERS = { ...H, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };

async function getJson(request, path) {
  const res = await request.get(path, { headers: H });
  expect(res.status(), `${path} status`).toBe(200);
  return { res, body: await res.json() };
}

/** Parse a JSON-RPC reply that may come back as JSON or as an SSE stream. */
async function rpcBody(res) {
  const text = await res.text();
  const ct = res.headers()['content-type'] ?? '';
  if (ct.includes('text/event-stream')) {
    const datas = text
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .filter(Boolean);
    expect(datas.length, 'SSE stream carries a data line').toBeGreaterThan(0);
    return JSON.parse(datas[datas.length - 1]);
  }
  return JSON.parse(text);
}

let rpcId = 1;
async function mcp(request, method, params = {}) {
  const res = await request.post('/api/mcp', {
    headers: MCP_HEADERS,
    data: { jsonrpc: '2.0', id: rpcId++, method, params },
  });
  expect(res.status(), `${method} status`).toBe(200);
  return rpcBody(res);
}
async function callTool(request, name, args = {}) {
  const body = await mcp(request, 'tools/call', { name, arguments: args });
  expect(body.error, `${name} JSON-RPC error`).toBeUndefined();
  return body.result;
}

test.describe('text docs', () => {
  test('/llms.txt is plain text, links /api/mcp and lists the three MCP tools', async ({ request }) => {
    const res = await request.get('/llms.txt', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^text\/plain/);
    const body = await res.text();
    expect(body).toMatch(/^# Agent Switchboard/);
    expect(body).toContain('https://agentswitchboard.dev/api/mcp');
    expect(body).toContain('Tools: search_agents, get_agent, list_categories');
  });

  test('/llms.txt agent and category counts match the live API', async ({ request }) => {
    const text = await (await request.get('/llms.txt', { headers: H })).text();
    const { body: catalog } = await getJson(request, '/agents.json');
    const { body: cats } = await getJson(request, '/api/categories');
    const m = text.match(/curated directory of (\d+) AI agents/);
    expect(m, 'agent count sentence present').not.toBeNull();
    expect(Number(m[1])).toBe(catalog.total);
    const c = text.match(/## Categories \((\d+) total\)/);
    expect(Number(c[1])).toBe(cats.categories.length);
  });

  test('/index.md is markdown with the MCP endpoint and Vary: Accept', async ({ request }) => {
    const res = await request.get('/index.md', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^text\/markdown/);
    expect(res.headers()['vary'] ?? '').toMatch(/Accept/i);
    const body = await res.text();
    expect(body).toMatch(/^# Agent Switchboard/);
    expect(body).toContain('/api/mcp');
    expect(body).not.toMatch(/<html/i);
  });

  test('/ with Accept: text/markdown returns markdown and Vary: Accept', async ({ request }) => {
    const res = await request.get('/', { headers: { ...H, accept: 'text/markdown' } });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^text\/markdown/);
    expect(res.headers()['vary'] ?? '').toMatch(/(^|,\s*)Accept(,|$)/i);
    const body = await res.text();
    expect(body).toMatch(/^# Agent Switchboard/);
    expect(body).not.toMatch(/<!DOCTYPE html/i);
  });

  test('/ with a browser Accept returns HTML and Vary: Accept', async ({ request }) => {
    const res = await request.get('/', {
      headers: { ...H, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^text\/html/);
    expect(res.headers()['vary'] ?? '').toMatch(/(^|,\s*)Accept(,|$)/i);
    expect(await res.text()).toMatch(/<html/i);
  });

  test('/skill.md has skill frontmatter, markdown type and open CORS', async ({ request }) => {
    const res = await request.get('/skill.md', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^text\/markdown/);
    expect(res.headers()['access-control-allow-origin']).toBe('*');
    const body = await res.text();
    expect(body).toMatch(/^---\nname: agent-switchboard\ndescription: /);
    expect(body).toContain('# Agent Switchboard');
  });

  test('/SKILL.md serves the same body as /skill.md', async ({ request }) => {
    const lower = await request.get('/skill.md', { headers: H });
    const upper = await request.get('/SKILL.md', { headers: H });
    expect(upper.status()).toBe(200);
    expect(await upper.text()).toBe(await lower.text());
  });
});

test.describe('catalog JSON', () => {
  test('/agents.json is valid JSON whose total matches its list and /api/agents', async ({ request }) => {
    const { res, body } = await getJson(request, '/agents.json');
    expect(res.headers()['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(body.agents)).toBe(true);
    expect(body.total).toBe(body.agents.length);
    expect(body.total).toBeGreaterThan(100);
    const { body: api } = await getJson(request, '/api/agents?limit=1');
    expect(api.total).toBe(body.total);
    const slugs = new Set(body.agents.map((a) => a.slug));
    expect(slugs.size, 'slugs are unique').toBe(body.agents.length);
  });

  test('/agents.json leaves out archived listings', async ({ request }) => {
    const { body } = await getJson(request, '/agents.json');
    const slugs = new Set(body.agents.map((a) => a.slug));
    expect(ARCHIVED_SLUGS.filter((s) => slugs.has(s))).toEqual([]);
  });

  test('/api/agents items carry slug, name and accessMethods', async ({ request }) => {
    const { res, body } = await getJson(request, '/api/agents');
    expect(res.headers()['content-type']).toMatch(/application\/json/);
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(0);
    expect(body.agents).toHaveLength(10);
    for (const a of body.agents) {
      expect(typeof a.slug).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(Array.isArray(a.accessMethods)).toBe(true);
      expect(a.url).toBe(`https://agentswitchboard.dev/agents/${a.slug}`);
    }
  });

  test('/api/agents search for an archived name returns no archived listing', async ({ request }) => {
    const { body } = await getJson(request, '/api/agents?q=midjourney&limit=50');
    expect(body.agents.map((a) => a.slug)).not.toContain('midjourney');
  });

  test('/api/agents?access=mcp returns only MCP listings', async ({ request }) => {
    const { body } = await getJson(request, '/api/agents?access=mcp&limit=50');
    expect(body.agents.length).toBeGreaterThan(0);
    for (const a of body.agents) expect(a.accessMethods).toContain('mcp');
  });

  test('/api/agents?category filters to that category', async ({ request }) => {
    const { body: cats } = await getJson(request, '/api/categories');
    const cat = cats.categories.find((c) => c.agentCount > 0);
    const { body } = await getJson(request, `/api/agents?category=${cat.slug}&limit=50`);
    expect(body.total).toBe(cat.agentCount);
    for (const a of body.agents) expect(a.categories).toContain(cat.slug);
  });

  test('/api/agents/<slug> returns the full record', async ({ request }) => {
    const { body } = await getJson(request, `/api/agents/${REAL_SLUG}`);
    expect(body.slug).toBe(REAL_SLUG);
    expect(body.name).toBeTruthy();
    expect(Array.isArray(body.accessMethods)).toBe(true);
    expect(Array.isArray(body.skills)).toBe(true);
    expect(body).toHaveProperty('authType');
    expect(body).toHaveProperty('homepage');
  });

  test('/api/agents/<unknown> is a JSON 404', async ({ request }) => {
    const res = await request.get('/api/agents/definitely-not-a-real-agent-asb-e2e', { headers: H });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not_found');
  });

  test('/api/agents/<archived> is a 404', async ({ request }) => {
    const res = await request.get(`/api/agents/${ARCHIVED_SLUGS[0]}`, { headers: H });
    expect(res.status()).toBe(404);
  });

  test('/api/categories lists categories whose counts add up to the catalog', async ({ request }) => {
    const { body } = await getJson(request, '/api/categories');
    expect(body.categories.length).toBeGreaterThanOrEqual(10);
    for (const c of body.categories) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      expect(typeof c.name).toBe('string');
      expect(typeof c.agentCount).toBe('number');
    }
    // Each listing belongs to at least one category, so the counts cover the catalog.
    const { body: catalog } = await getJson(request, '/agents.json');
    const sum = body.categories.reduce((n, c) => n + c.agentCount, 0);
    expect(sum).toBeGreaterThanOrEqual(catalog.total);
  });

  for (const path of ['/api/agents', '/api/categories', `/api/agents/${REAL_SLUG}`, '/agents.json', '/index.md']) {
    test(`CORS: ${path} allows any origin`, async ({ request }) => {
      const res = await request.get(path, { headers: { ...H, origin: 'https://example.com' } });
      expect(res.status()).toBe(200);
      expect(res.headers()['access-control-allow-origin']).toBe('*');
    });
  }
});

test.describe('crawler files', () => {
  test('/robots.txt allows the site, blocks /_next/ and points at the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^text\/plain/);
    const body = await res.text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).toMatch(/Allow: \/\s/);
    expect(body).toMatch(/Disallow: \/_next\//);
    expect(body).toContain('Sitemap: https://agentswitchboard.dev/sitemap.xml');
  });

  test('/sitemap.xml lists every listing and category page', async ({ request }) => {
    const res = await request.get('/sitemap.xml', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/);
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const { body: catalog } = await getJson(request, '/agents.json');
    const { body: cats } = await getJson(request, '/api/categories');
    const agentLocs = locs.filter((u) => u.startsWith('https://agentswitchboard.dev/agents/'));
    const catLocs = locs.filter((u) => u.startsWith('https://agentswitchboard.dev/categories/'));
    expect(agentLocs.length).toBe(catalog.total);
    expect(catLocs.length).toBe(cats.categories.length);
    expect(locs).toContain(`https://agentswitchboard.dev/agents/${REAL_SLUG}`);
    expect(locs.filter((u) => ARCHIVED_SLUGS.some((s) => u.endsWith(`/agents/${s}`)))).toEqual([]);
  });

  test('10 sitemap URLs spread across the file all return 200', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml', { headers: H })).text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const step = Math.floor(locs.length / 10);
    const sample = Array.from({ length: 10 }, (_, i) => locs[i * step]);
    const bad = [];
    for (const url of sample) {
      const r = await request.get(url, { headers: H, maxRedirects: 0 });
      if (r.status() !== 200) bad.push(`${r.status()} ${url}`);
    }
    expect(bad).toEqual([]);
  });
});

test.describe('manifests', () => {
  test('/.well-known/mcp.json names the remote endpoint and the three tools', async ({ request }) => {
    const { res, body } = await getJson(request, '/.well-known/mcp.json');
    expect(res.headers()['content-type']).toMatch(/json/);
    expect(body.remotes).toContainEqual({ type: 'streamable-http', url: 'https://agentswitchboard.dev/api/mcp' });
    expect(body.tools.map((t) => t.name).sort()).toEqual(['get_agent', 'list_categories', 'search_agents']);
  });

  test('/.well-known/webmcp.json declares the document.modelContext tools', async ({ request }) => {
    const { body } = await getJson(request, '/.well-known/webmcp.json');
    expect(body.surface).toBe('document.modelContext');
    expect(body.remote.url).toBe('https://agentswitchboard.dev/api/mcp');
    expect(body.tools.map((t) => t.name).sort()).toEqual(['get_agent', 'list_categories', 'search_agents']);
  });

  test('/openapi.json is OpenAPI 3.1 covering the REST paths, with CORS', async ({ request }) => {
    const { res, body } = await getJson(request, '/openapi.json');
    expect(res.headers()['access-control-allow-origin']).toBe('*');
    expect(body.openapi).toMatch(/^3\.1/);
    for (const p of ['/api/agents', '/api/agents/{slug}', '/api/categories', '/agents.json', '/api/mcp']) {
      expect(Object.keys(body.paths)).toContain(p);
    }
  });
});

test.describe('MCP server /api/mcp', () => {
  test('GET answers 405 with a JSON-RPC error', async ({ request }) => {
    const res = await request.get('/api/mcp', { headers: { ...H, accept: 'application/json, text/event-stream' } });
    expect(res.status()).toBe(405);
    const body = JSON.parse(await res.text());
    expect(body.jsonrpc).toBe('2.0');
    expect(body.error).toBeTruthy();
    expect(typeof body.error.code).toBe('number');
  });

  test('initialize returns serverInfo and tool capability', async ({ request }) => {
    const body = await mcp(request, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'asb-e2e', version: '1.0.0' },
    });
    expect(body.error).toBeUndefined();
    expect(body.result.serverInfo.name).toBe('agentswitchboard');
    expect(body.result.serverInfo.version).toBeTruthy();
    expect(body.result.capabilities.tools).toBeTruthy();
  });

  test('tools/list lists search_agents, get_agent and list_categories', async ({ request }) => {
    const body = await mcp(request, 'tools/list');
    expect(body.error).toBeUndefined();
    const names = body.result.tools.map((t) => t.name).sort();
    expect(names).toEqual(['get_agent', 'list_categories', 'search_agents']);
    const search = body.result.tools.find((t) => t.name === 'search_agents');
    expect(Object.keys(search.inputSchema.properties)).toEqual(
      expect.arrayContaining(['query', 'category', 'access', 'official', 'limit', 'offset'])
    );
  });

  test('search_agents with a query returns matching results', async ({ request }) => {
    const result = await callTool(request, 'search_agents', { query: 'playwright', limit: 5 });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    expect(data.total).toBeGreaterThan(0);
    expect(data.agents.length).toBeGreaterThan(0);
    expect(data.agents.length).toBeLessThanOrEqual(5);
    expect(data.agents.map((a) => a.slug)).toContain(REAL_SLUG);
  });

  test('search_agents agrees with GET /api/agents for the same query', async ({ request }) => {
    const result = await callTool(request, 'search_agents', { query: 'email', limit: 10 });
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    const { body } = await getJson(request, '/api/agents?q=email&limit=10');
    expect(data.total).toBe(body.total);
    expect(data.agents.map((a) => a.slug)).toEqual(body.agents.map((a) => a.slug));
  });

  test('get_agent for a real slug returns that record', async ({ request }) => {
    const result = await callTool(request, 'get_agent', { slug: REAL_SLUG });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    expect(data.slug).toBe(REAL_SLUG);
    expect(data.url).toBe(`https://agentswitchboard.dev/agents/${REAL_SLUG}`);
    const { body: rest } = await getJson(request, `/api/agents/${REAL_SLUG}`);
    expect(data.name).toBe(rest.name);
    expect(data.accessMethods).toEqual(rest.accessMethods);
  });

  test('get_agent for an unknown slug is a graceful tool error', async ({ request }) => {
    const result = await callTool(request, 'get_agent', { slug: 'definitely-not-a-real-agent-asb-e2e' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No agent with slug');
  });

  test('list_categories matches GET /api/categories', async ({ request }) => {
    const result = await callTool(request, 'list_categories');
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    const { body } = await getJson(request, '/api/categories');
    expect(data.categories.map((c) => [c.slug, c.agentCount])).toEqual(
      body.categories.map((c) => [c.slug, c.agentCount])
    );
  });
});
