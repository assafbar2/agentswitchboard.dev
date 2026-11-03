// Machine endpoints on the live site: llms.txt, index.md, content negotiation,
// agents.json, REST API, skill.md, robots, sitemap, .well-known, openapi, MCP.
// GET only, plus JSON-RPC POSTs to /api/mcp (read-only tools, and submit_listing
// only on paths that return before an issue is filed).
import * as fs from 'fs';
import { test, expect } from './fixtures.mjs';
import { BASE } from '../target.mjs';

const ORIGIN = 'https://agentswitchboard.dev';
const UA = 'Mozilla/5.0 asb-e2e (machine endpoint tests)';
const H = { 'user-agent': UA };
const REAL_SLUG = 'playwright-mcp';
// status: "archived" in content/agents/*.json at HEAD
const ARCHIVED_SLUGS = ['midjourney', 'blender-mcp', 'smithery', 'framelink', 'headlong'];
const MCP_HEADERS = { ...H, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
const READ_TOOLS = ['alternatives_to', 'compare_agents', 'connect_bundle', 'get_agent', 'list_categories', 'search_agents'];

const content = (file) => JSON.parse(fs.readFileSync(new URL(`../../content/${file}`, import.meta.url), 'utf8'));
const CATALOG = (await (await fetch(`${BASE}/agents.json`, { headers: H })).json()).agents;
const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`, { headers: H })).text();
const pick = (found, what) => {
  if (!found) throw new Error(`no published listing ${what}`);
  return found;
};
const CURATED = content('comparisons.json')[0];
const WITH_ALTERNATIVES = pick(sitemapXml.match(/\/agents\/([a-z0-9-]+)\/alternatives<\/loc>/)?.[1], 'with an alternatives page');
const hasMcp = (a) => a.accessMethods.includes('mcp');
const HOSTED = pick(CATALOG.find((a) => hasMcp(a) && a.mcpEndpoint), 'with an mcpEndpoint');
const LOCAL = pick(CATALOG.find((a) => hasMcp(a) && a.mcpCommand && !a.mcpEndpoint), 'with only an mcpCommand');
const GUIDED = pick(CATALOG.find((a) => hasMcp(a) && !a.mcpEndpoint && !a.mcpCommand), 'with an MCP server and no address or command');
const NO_MCP = pick(CATALOG.find((a) => !hasMcp(a)), 'without an MCP server');
const BUNDLE = [GUIDED, HOSTED, NO_MCP, LOCAL];
const compareQuery = (slugs) => slugs.map((slug, i) => `${'abc'[i]}=${slug}`).join('&');
// MCP answers are organic: REST bodies minus paid-placement fields, ranked as ?order=organic ranks them.
const PLACEMENT = new Set(['featured', 'featuredUntil', 'sponsored', 'sponsorLabel', 'tier']);
const organic = (body) => JSON.parse(JSON.stringify(body, (key, value) => (PLACEMENT.has(key) ? undefined : value)));

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
  test('/llms.txt is plain text, links /api/mcp and lists the MCP tools', async ({ request }) => {
    const res = await request.get('/llms.txt', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^text\/plain/);
    const body = await res.text();
    expect(body).toMatch(/^# Agent Switchboard/);
    expect(body).toContain('https://agentswitchboard.dev/api/mcp');
    expect(body).toContain(
      'Tools: search_agents, get_agent, list_categories, compare_agents, alternatives_to, connect_bundle, submit_listing'
    );
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
    // Known gap: Vercel's prerendered HTML drops Vary: Accept (see next.config.ts).
    // Marked as expected to fail, so it flags the day the header comes through.
    test.fail();
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

  test('/api/agents?verified=true returns only Verified listings', async ({ request }) => {
    const { body } = await getJson(request, '/api/agents?verified=true&limit=50');
    expect(body.total).toBeGreaterThan(0);
    for (const a of body.agents) expect(a.verified).toBe(true);
  });

  test('/api/agents?auth= keeps listings with any of the given auth types', async ({ request }) => {
    const total = async (auth) => (await getJson(request, `/api/agents?limit=1${auth ? `&auth=${auth}` : ''}`)).body.total;
    const none = await total('none');
    const apiKey = await total('apiKey');
    expect(none).toBeGreaterThan(0);
    expect(apiKey).toBeGreaterThan(0);
    expect(await total('none,apiKey')).toBe(none + apiKey);
    expect(await total('NONE')).toBe(none);
    expect(await total('bogus')).toBe(await total(''));
    const { body } = await getJson(request, '/api/agents?auth=none&limit=5');
    for (const a of body.agents) {
      expect((await getJson(request, `/api/agents/${a.slug}`)).body.authType, a.slug).toBe('none');
    }
  });

  test('/api/agents?sort=name is A→Z and sort=newest is newest first', async ({ request }) => {
    const { body: byName } = await getJson(request, '/api/agents?sort=name&limit=50');
    const names = byName.agents.map((a) => a.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const { body: newest } = await getJson(request, '/api/agents?sort=newest&limit=8');
    const added = [];
    for (const a of newest.agents) added.push(Date.parse((await getJson(request, `/api/agents/${a.slug}`)).body.createdAt));
    expect(added).toEqual([...added].sort((a, b) => b - a));
  });

  test('/api/agents with an unknown sort keeps the default order', async ({ request }) => {
    const { body: plain } = await getJson(request, '/api/agents?q=email&limit=20');
    const { body: odd } = await getJson(request, '/api/agents?q=email&sort=oldest&limit=20');
    expect(odd.agents.map((a) => a.slug)).toEqual(plain.agents.map((a) => a.slug));
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

  for (const path of [
    '/api/agents',
    '/api/categories',
    `/api/agents/${REAL_SLUG}`,
    '/api/stacks',
    '/api/tasks',
    `/api/compare?${compareQuery(CURATED.items)}`,
    `/api/agents/${WITH_ALTERNATIVES}/alternatives`,
    `/api/bundle?items=${HOSTED.slug}`,
    '/agents.json',
    '/index.md',
  ]) {
    test(`CORS: ${path} allows any origin`, async ({ request }) => {
      const res = await request.get(path, { headers: { ...H, origin: 'https://example.com' } });
      expect(res.status()).toBe(200);
      expect(res.headers()['access-control-allow-origin']).toBe('*');
    });
  }
});

test.describe('decision endpoints', () => {
  test('/api/agents?since= keeps the listings added on or after that day, and says which day', async ({ request }) => {
    const { body: week } = await getJson(request, '/api/agents?since=7&sort=newest&limit=50');
    expect(week.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const added = (a) => (a.createdAt ?? '').slice(0, 10);
    expect(week.total).toBe(CATALOG.filter((a) => added(a) >= week.since).length);
    const bySlug = new Map(CATALOG.map((a) => [a.slug, a]));
    for (const a of week.agents) expect(added(bySlug.get(a.slug)) >= week.since, a.slug).toBe(true);

    const { body: dated } = await getJson(request, `/api/agents?since=${week.since}&limit=1`);
    expect(dated.since).toBe(week.since);
    expect(dated.total).toBe(week.total);
    const { body: plain } = await getJson(request, '/api/agents?limit=1');
    expect(plain).not.toHaveProperty('since');
  });

  test('/api/agents with a since that is neither a day nor a count is a 400', async ({ request }) => {
    for (const since of ['last-week', '2026-02-30', '0']) {
      const res = await request.get(`/api/agents?since=${since}`, { headers: H });
      expect(res.status(), since).toBe(400);
      expect((await res.json()).error, since).toBe('invalid_since');
    }
  });

  test('/api/compare answers with the compare page, each value by slug', async ({ request }) => {
    const { body } = await getJson(request, `/api/compare?${compareQuery(CURATED.items)}`);
    expect(body.url).toBe(`${ORIGIN}/compare/${CURATED.items.join('-vs-')}`);
    expect(body.intro).toBe(CURATED.intro);
    expect(body.agents.map((a) => a.slug)).toEqual(CURATED.items);
    for (const a of body.agents) {
      expect(typeof a.authType, a.slug).toBe('string');
      expect(Array.isArray(a.setsApart), a.slug).toBe(true);
    }
    expect(body.rows.length).toBeGreaterThan(5);
    for (const row of body.rows) {
      expect(Object.keys(row.values), row.key).toEqual(CURATED.items);
      expect(typeof row.same, row.key).toBe('boolean');
    }
    expect(body.notes).toEqual([]);

    const { body: mixed } = await getJson(request, `/api/compare?a=${CURATED.items[0]}&b=${REAL_SLUG}&c=not-a-real-agent-asb-e2e`);
    expect(mixed.url).toBe(`${ORIGIN}/compare?a=${CURATED.items[0]}&b=${REAL_SLUG}`);
    expect(mixed.intro).toBeNull();
    expect(mixed.notes).toEqual(['“not-a-real-agent-asb-e2e” isn’t a listing in the directory, so it is left out.']);
  });

  test('/api/compare with one listing is a 400 that names listings to put beside it', async ({ request }) => {
    const res = await request.get(`/api/compare?a=${CURATED.items[0]}`, { headers: H });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('too_few_listings');
    expect(body.message).toMatch(/^Name 2 or 3 listings to compare; only .+ was found\. Listings to put beside it: /);
    expect(body.suggestions.length).toBeGreaterThan(0);
    expect(body.suggestions.map((a) => a.slug)).not.toContain(CURATED.items[0]);
  });

  test('/api/agents/<slug>/alternatives lists its alternatives with why, and links its page', async ({ request }) => {
    const { body } = await getJson(request, `/api/agents/${WITH_ALTERNATIVES}/alternatives`);
    expect(body.agent.slug).toBe(WITH_ALTERNATIVES);
    expect(body.url).toBe(`${ORIGIN}/agents/${WITH_ALTERNATIVES}/alternatives`);
    expect(body.total).toBeGreaterThanOrEqual(3);
    expect(body.alternatives).toHaveLength(Math.min(body.total, 8));
    const [first, second] = body.alternatives.map((a) => a.slug);
    expect(body.compareUrl).toBe(`${ORIGIN}/compare?a=${WITH_ALTERNATIVES}&b=${first}&c=${second}`);
    for (const alt of body.alternatives) {
      expect(alt.why, alt.slug).toMatch(/^Both offer .+\. In common: .+\.$/);
      expect(alt.sharedAccess.length, alt.slug).toBeGreaterThan(0);
    }
    const { body: two } = await getJson(request, `/api/agents/${WITH_ALTERNATIVES}/alternatives?limit=2`);
    expect(two.alternatives.map((a) => a.slug)).toEqual([first, second]);
    expect(two.total).toBe(body.total);
  });

  test('/api/agents/<slug>/alternatives is a 404 for an unknown or archived listing', async ({ request }) => {
    const unknown = await request.get('/api/agents/definitely-not-a-real-agent-asb-e2e/alternatives', { headers: H });
    expect(unknown.status()).toBe(404);
    expect((await unknown.json()).error).toBe('not_found');
    const archived = await request.get(`/api/agents/${ARCHIVED_SLUGS[0]}/alternatives`, { headers: H });
    expect(archived.status()).toBe(404);
    expect((await archived.json()).message).toContain('is no longer listed in the directory');
  });

  test('/api/bundle makes one MCP config of the listings that have an address or command', async ({ request }) => {
    const slugs = BUNDLE.map((a) => a.slug);
    const { body } = await getJson(request, `/api/bundle?items=${slugs.join(',')},not-a-real-agent-asb-e2e`);
    expect(body.summary).toBe('2 in the config, 1 to set up from its guide and 1 without an MCP server');
    expect(body.stackUrl).toBe(`${ORIGIN}/stack?items=${slugs.join(',')}`);
    expect(body.items.map((i) => [i.slug, i.how])).toEqual([
      [GUIDED.slug, 'guide'],
      [HOSTED.slug, 'config'],
      [NO_MCP.slug, 'other'],
      [LOCAL.slug, 'config'],
    ]);
    expect(Object.keys(body.config.mcpServers)).toEqual([HOSTED.slug, LOCAL.slug]);
    expect(body.config.mcpServers[HOSTED.slug]).toEqual({ url: HOSTED.mcpEndpoint });
    const [command, ...args] = LOCAL.mcpCommand.trim().split(/\s+/);
    expect(body.config.mcpServers[LOCAL.slug]).toEqual({ command, args });
    expect(body.claudeCode).toHaveLength(2);
    expect(body.setupPrompt).toContain(GUIDED.name);
    expect(body.notes).toEqual(['“not-a-real-agent-asb-e2e” isn’t a listing in the directory, so it is left out.']);
  });

  test('/api/bundle with no listing in the directory is a 400', async ({ request }) => {
    const res = await request.get(`/api/bundle?items=not-a-real-agent-asb-e2e,${ARCHIVED_SLUGS[0]}`, { headers: H });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_listings');
    expect(body.notes).toHaveLength(2);
  });
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

  test('/robots.txt closes query pages and their cards to crawlers, not to link previews, and shuts out SEO tools', async ({ request }) => {
    const body = await (await request.get('/robots.txt', { headers: H })).text();
    const groups = body.split(/\n\s*\n/).map((g) => ({
      agents: [...g.matchAll(/^User-Agent: (.+)$/gim)].map((m) => m[1].trim()),
      disallow: [...g.matchAll(/^Disallow: (.+)$/gim)].map((m) => m[1].trim()),
    }));
    const group = (ua) => groups.find((g) => g.agents.includes(ua));
    expect(group('*').disallow).toEqual(
      expect.arrayContaining(['/browse?', '/compare?', '/stack?', '/operator?', '/compare/card.png', '/stack/card.png', '/operator/card.png']),
    );
    expect(group('*').disallow).not.toContain('/browse');
    expect(group('Twitterbot').disallow).toEqual(['/_next/']);
    expect(group('AhrefsBot').disallow).toEqual(['/']);
  });

  test('/sitemap.xml lists every listing and category page', async ({ request }) => {
    const res = await request.get('/sitemap.xml', { headers: H });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/xml/);
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const { body: catalog } = await getJson(request, '/agents.json');
    const { body: cats } = await getJson(request, '/api/categories');
    const agentLocs = locs.filter((u) => /^https:\/\/agentswitchboard\.dev\/agents\/[a-z0-9-]+$/.test(u));
    const alternativesLocs = locs.filter((u) => /^https:\/\/agentswitchboard\.dev\/agents\/[a-z0-9-]+\/alternatives$/.test(u));
    const catLocs = locs.filter((u) => u.startsWith('https://agentswitchboard.dev/categories/'));
    expect(agentLocs.length).toBe(catalog.total);
    // Only listings with enough genuine alternatives get a page (lib/related.ts).
    expect(alternativesLocs.length).toBeGreaterThan(0);
    expect(alternativesLocs.length).toBeLessThan(catalog.total);
    for (const u of alternativesLocs) expect(agentLocs, u).toContain(u.replace(/\/alternatives$/, ''));
    expect(locs.filter((u) => u.startsWith('https://agentswitchboard.dev/agents/'))).toHaveLength(
      agentLocs.length + alternativesLocs.length
    );
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
  test('/.well-known/mcp.json names the remote endpoint and the seven tools', async ({ request }) => {
    const { res, body } = await getJson(request, '/.well-known/mcp.json');
    expect(res.headers()['content-type']).toMatch(/json/);
    expect(body.remotes).toContainEqual({ type: 'streamable-http', url: 'https://agentswitchboard.dev/api/mcp' });
    expect(body.tools.map((t) => t.name).sort()).toEqual([...READ_TOOLS, 'submit_listing'].sort());
  });

  test('/.well-known/webmcp.json declares the document.modelContext tools', async ({ request }) => {
    const { body } = await getJson(request, '/.well-known/webmcp.json');
    expect(body.surface).toBe('document.modelContext');
    expect(body.remote.url).toBe('https://agentswitchboard.dev/api/mcp');
    expect(body.tools.map((t) => t.name).sort()).toEqual(READ_TOOLS);
  });

  test('/openapi.json is OpenAPI 3.1 covering the REST paths, with CORS', async ({ request }) => {
    const { res, body } = await getJson(request, '/openapi.json');
    expect(res.headers()['access-control-allow-origin']).toBe('*');
    expect(body.openapi).toMatch(/^3\.1/);
    for (const p of [
      '/api/agents',
      '/api/agents/{slug}',
      '/api/agents/{slug}/alternatives',
      '/api/categories',
      '/api/compare',
      '/api/bundle',
      '/api/stacks',
      '/api/stacks/{slug}',
      '/api/tasks',
      '/api/tasks/{slug}',
      '/agents.json',
      '/api/mcp',
    ]) {
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
    expect(body.result.instructions).toContain('submit_listing');
    expect(body.result.instructions).toContain('connect_bundle');
  });

  test('tools/list lists the six read tools and submit_listing', async ({ request }) => {
    const body = await mcp(request, 'tools/list');
    expect(body.error).toBeUndefined();
    const names = body.result.tools.map((t) => t.name).sort();
    expect(names).toEqual([...READ_TOOLS, 'submit_listing'].sort());
    for (const t of body.result.tools) {
      expect(t.annotations?.readOnlyHint, `${t.name} readOnlyHint`).toBe(t.name !== 'submit_listing');
    }
    const search = body.result.tools.find((t) => t.name === 'search_agents');
    expect(Object.keys(search.inputSchema.properties)).toEqual(
      expect.arrayContaining(['query', 'task', 'category', 'access', 'official', 'verified', 'auth', 'since', 'sort', 'limit', 'offset'])
    );
  });

  test("the manifests list each live tool's inputs and the server version", async ({ request }) => {
    const listed = await mcp(request, 'tools/list');
    const inputs = (tool) => Object.keys(tool.inputSchema.properties ?? {}).sort();
    const live = new Map(listed.result.tools.map((t) => [t.name, inputs(t)]));
    const init = await mcp(request, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'asb-e2e', version: '1.0.0' },
    });
    for (const path of ['/.well-known/mcp.json', '/.well-known/webmcp.json']) {
      const { body } = await getJson(request, path);
      for (const tool of body.tools) expect(inputs(tool), `${path} ${tool.name}`).toEqual(live.get(tool.name));
      expect(body.version, `${path} version`).toBe(init.result.serverInfo.version);
    }
  });

  test('search_agents takes verified, auth and sort like GET /api/agents', async ({ request }) => {
    const result = await callTool(request, 'search_agents', {
      access: ['mcp'],
      auth: ['none'],
      verified: true,
      sort: 'newest',
      limit: 10,
    });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    const { body } = await getJson(request, '/api/agents?access=mcp&auth=none&verified=true&sort=newest&limit=10&order=organic');
    expect(data.total).toBeGreaterThan(0);
    expect(data.total).toBe(body.total);
    expect(data.agents.map((a) => a.slug)).toEqual(body.agents.map((a) => a.slug));
  });

  test('search_agents takes a task like GET /api/agents, and lists the task slugs for an unknown one', async ({ request }) => {
    const result = await callTool(request, 'search_agents', { task: 'query-a-database', access: ['mcp'], limit: 10 });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    const { body } = await getJson(request, '/api/agents?task=query-a-database&access=mcp&limit=10&order=organic');
    expect(data.total).toBeGreaterThan(0);
    expect(data.total).toBe(body.total);
    expect(data.agents.map((a) => a.slug)).toEqual(body.agents.map((a) => a.slug));

    const unknown = await callTool(request, 'search_agents', { task: 'not-a-real-task' });
    expect(unknown.isError).toBe(true);
    expect(unknown.content[0].text).toContain('No task with slug "not-a-real-task"');
    expect(unknown.content[0].text).toContain('query-a-database');
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
    const { body } = await getJson(request, '/api/agents?q=email&limit=10&order=organic');
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

  // Never files: an already-listed URL and an invalid one both return before GitHub is called.
  test('submit_listing refuses an already-listed product without filing', async ({ request }) => {
    const { body: rest } = await getJson(request, `/api/agents/${REAL_SLUG}`);
    const result = await callTool(request, 'submit_listing', {
      name: rest.name,
      url: rest.homepage,
      description: 'asb-e2e duplicate check; this must not create an issue.',
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ status: 'already_listed', existingSlug: REAL_SLUG });
  });

  test('submit_listing validates its input', async ({ request }) => {
    const body = await mcp(request, 'tools/call', {
      name: 'submit_listing',
      arguments: { name: 'x', url: 'not a url', description: 'short' },
    });
    const failed = body.error !== undefined || body.result?.isError === true;
    expect(failed).toBe(true);
  });

  test('list_categories matches GET /api/categories', async ({ request }) => {
    const result = await callTool(request, 'list_categories');
    const data = result.structuredContent ?? JSON.parse(result.content[0].text);
    const { body } = await getJson(request, '/api/categories');
    expect(data.categories.map((c) => [c.slug, c.agentCount])).toEqual(
      body.categories.map((c) => [c.slug, c.agentCount])
    );
  });

  test('search_agents takes since like GET /api/agents, as a count or a day', async ({ request }) => {
    const result = await callTool(request, 'search_agents', { since: 30, sort: 'newest', limit: 10 });
    expect(result.isError).toBeFalsy();
    const { body } = await getJson(request, '/api/agents?since=30&sort=newest&limit=10&order=organic');
    expect(result.structuredContent.since).toBe(body.since);
    expect(result.structuredContent.total).toBe(body.total);
    expect(result.structuredContent.agents.map((a) => a.slug)).toEqual(body.agents.map((a) => a.slug));
    const dated = await callTool(request, 'search_agents', { since: body.since, limit: 1 });
    expect(dated.structuredContent.total).toBe(body.total);

    const invalid = await callTool(request, 'search_agents', { since: 'last-week' });
    expect(invalid.isError).toBe(true);
    expect(invalid.content[0].text).toContain('since must be a date (YYYY-MM-DD) or a number of days');
  });

  test('compare_agents answers as GET /api/compare does, and refuses a single listing', async ({ request }) => {
    const result = await callTool(request, 'compare_agents', { slugs: CURATED.items });
    expect(result.isError).toBeFalsy();
    const { body } = await getJson(request, `/api/compare?${compareQuery(CURATED.items)}`);
    expect(result.structuredContent).toEqual(organic(body));

    const one = await callTool(request, 'compare_agents', { slugs: [CURATED.items[0]] });
    expect(one.isError).toBe(true);
    expect(one.content[0].text).toMatch(/^Name 2 or 3 listings to compare; only .+ was found\. Listings to put beside it: /);
  });

  test('alternatives_to answers as GET /api/agents/<slug>/alternatives does', async ({ request }) => {
    const result = await callTool(request, 'alternatives_to', { slug: WITH_ALTERNATIVES, limit: 3 });
    expect(result.isError).toBeFalsy();
    const { body } = await getJson(request, `/api/agents/${WITH_ALTERNATIVES}/alternatives?limit=3&order=organic`);
    expect(result.structuredContent).toEqual(organic(body));
    expect(body.alternatives).toHaveLength(3);

    const unknown = await callTool(request, 'alternatives_to', { slug: 'definitely-not-a-real-agent-asb-e2e' });
    expect(unknown.isError).toBe(true);
    expect(unknown.content[0].text).toContain('No agent with slug');
  });

  test('connect_bundle answers as GET /api/bundle does, and refuses a list with no listing', async ({ request }) => {
    const slugs = BUNDLE.map((a) => a.slug);
    const result = await callTool(request, 'connect_bundle', { slugs });
    expect(result.isError).toBeFalsy();
    const { body } = await getJson(request, `/api/bundle?items=${slugs.join(',')}`);
    expect(result.structuredContent).toEqual(organic(body));

    const none = await callTool(request, 'connect_bundle', { slugs: ['definitely-not-a-real-agent-asb-e2e'] });
    expect(none.isError).toBe(true);
    expect(none.content[0].text).toMatch(/^Name 1 to 10 listings by slug\./);
  });
});
