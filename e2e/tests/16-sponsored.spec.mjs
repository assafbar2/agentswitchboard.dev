// Sponsored listings: the label wherever a listing appears, the Sponsored slot
// on the homepage and the latest drop page, and `sponsored` in REST and
// /agents.json but never in MCP results. The listings come from
// content/agents/*.json ("sponsored": true). /advertise is how a sponsor asks
// for a slot.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.mjs';
import { BASE } from '../target.mjs';
import { loadCatalog } from '../catalog.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const UA = { 'user-agent': 'Mozilla/5.0 asb-e2e (sponsored)' };
const MCP_HEADERS = { ...UA, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };

const LISTINGS = readdirSync(`${REPO}/content/agents`)
  .map((f) => JSON.parse(readFileSync(`${REPO}/content/agents/${f}`, 'utf8')))
  .filter((a) => a.status === 'published');
const SPONSORED = LISTINGS.filter((a) => a.sponsored)
  .map((a) => ({ slug: a.slug, name: a.name }))
  .sort((a, b) => a.name.localeCompare(b.name));
const SPONSORED_SLUGS = SPONSORED.map((a) => a.slug);
const UNPAID = LISTINGS.find((a) => !a.sponsored && a.slug === 'here-now') ?? LISTINGS.find((a) => !a.sponsored);

const human = (page) => page.locator('main .human-only');
const slot = (page) => human(page).locator('[data-sponsored-slot]');
const hrefsOf = (locator) => locator.evaluateAll((els) => els.map((e) => e.getAttribute('href').replace('/agents/', '')));

async function getJson(request, path) {
  const res = await request.get(path, { headers: UA });
  expect(res.status(), path).toBe(200);
  return res.json();
}

async function callTool(request, name, args) {
  const res = await request.post('/api/mcp', {
    headers: MCP_HEADERS,
    data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
  });
  expect(res.status(), name).toBe(200);
  const text = await res.text();
  const data = (res.headers()['content-type'] ?? '').includes('text/event-stream')
    ? text.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).filter(Boolean).pop()
    : text;
  const { result } = JSON.parse(data);
  return result.structuredContent ?? JSON.parse(result.content[0].text);
}

test('the approved sponsors are AgentMail, Agent Switchboard and Barnir Hired', () => {
  expect(SPONSORED_SLUGS.sort()).toEqual(['agentmail', 'agentswitchboard', 'barnir-hired']);
});

test.describe('homepage', () => {
  test('the Sponsored slot lists every sponsored listing A→Z, each labelled, with what Sponsored means', async ({ page }) => {
    await page.goto('/');
    const box = slot(page);
    await expect(box).toBeVisible();
    await expect(box.getByRole('heading', { level: 2 })).toHaveText(`Sponsored · ${SPONSORED.length}`);
    const rows = box.locator('a[href^="/agents/"]');
    expect(await hrefsOf(rows)).toEqual(SPONSORED.map((a) => a.slug));
    for (let i = 0; i < SPONSORED.length; i++) {
      await expect(rows.nth(i).getByText('Sponsored', { exact: true })).toBeVisible();
    }
    await expect(box.getByRole('link', { name: 'What Sponsored means' })).toHaveAttribute('href', '/about#sponsored');
    await expect(box.getByText(/never change search results/)).toBeVisible();
  });

  test('the slot is boxed in ink, not the yellow bar of the editorial sections', async ({ page }) => {
    await page.goto('/');
    const heading = slot(page).getByRole('heading', { level: 2 });
    const [slotBg, topBg] = await Promise.all([
      heading.evaluate((el) => getComputedStyle(el).backgroundColor),
      human(page).locator('section[aria-labelledby="top-agents"] .dir-bar').evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(slotBg).not.toBe(topBg);
    expect(await slot(page).evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('2px');
  });

  test("Top Agents, the editor's picks, has no sponsored listing", async ({ page }) => {
    await page.goto('/');
    const top = await hrefsOf(human(page).locator('section[aria-labelledby="top-agents"] a[href^="/agents/"]'));
    expect(top.length).toBeGreaterThan(0);
    for (const slug of top) expect(SPONSORED_SLUGS, slug).not.toContain(slug);
  });

  test('the text-only view lists the sponsored listings, marked', async ({ page }) => {
    await page.goto('/');
    const view = page.locator('main .agent-only');
    await expect(view.locator('[data-sponsored-slot] .agent-section-title')).toHaveText(/^sponsored · paid placements/);
    for (const { slug } of SPONSORED) {
      await expect(view.locator(`a[href="/agents/${slug}"]`).filter({ hasText: '(sponsored)' })).toHaveCount(1);
    }
  });
});

test.describe('drop pages', () => {
  test('the latest drop has the Sponsored slot; an older drop does not', async ({ page }) => {
    await page.goto('/drops');
    // /drops lists every drop newest first.
    const links = await human(page)
      .locator('a[href^="/drops/20"]')
      .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
    expect(links.length).toBeGreaterThan(1);
    const [latest, older] = links;
    await page.goto(latest);
    await expect(slot(page)).toBeVisible();
    expect(await hrefsOf(slot(page).locator('a[href^="/agents/"]'))).toEqual(SPONSORED.map((a) => a.slug));
    await page.goto(older);
    await expect(slot(page)).toHaveCount(0);
  });
});

test.describe('the label wherever the listing appears', () => {
  for (const { slug, name } of SPONSORED) {
    test(`${name}'s page shows Sponsored and says it never changes ranking`, async ({ page }) => {
      await page.goto(`/agents/${slug}`);
      const header = human(page).getByRole('heading', { level: 1 }).locator('..');
      await expect(header.getByText('Sponsored', { exact: true })).toBeVisible();
      await expect(header.getByText(/never changes where this listing ranks/)).toBeVisible();
      await expect(header.getByText("Editor's Pick")).toHaveCount(0);
      await expect(page.locator('main .agent-only')).toContainText('true · paid placement');
    });
  }

  test('an unpaid listing has no Sponsored label', async ({ page }) => {
    await page.goto(`/agents/${UNPAID.slug}`);
    const header = human(page).getByRole('heading', { level: 1 }).locator('..');
    await expect(header.getByText('Sponsored', { exact: true })).toHaveCount(0);
  });

  test('a search result card carries the label', async ({ page }) => {
    await page.goto('/browse?q=agentmail');
    const card = human(page).locator('.cmp-card').filter({ has: page.locator('a[href="/agents/agentmail"]') }).first();
    await expect(card.getByText('Sponsored', { exact: true })).toBeVisible();
  });

  test('a compare column carries the label', async ({ page }) => {
    await page.goto(`/compare?a=agentmail&b=${UNPAID.slug}`);
    const heads = human(page).locator('table.cmp-table thead th');
    await expect(heads.nth(0).getByText('Sponsored', { exact: true })).toBeVisible();
    await expect(heads.nth(1).getByText('Sponsored', { exact: true })).toHaveCount(0);
  });

  test('/about explains Sponsored next to Verified', async ({ page }) => {
    await page.goto('/about#sponsored');
    const section = page.locator('main section#sponsored');
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('Sponsored');
    await expect(section).toContainText('never changes search results or their order');
    await expect(section.getByRole('link', { name: 'Advertise' })).toHaveAttribute('href', '/advertise');
  });
});

test.describe('machine surfaces expose the flag and nothing more', () => {
  test('the /agents.json catalog marks exactly the sponsored listings and defines the flag', async () => {
    const { index, agents } = await loadCatalog(BASE, UA);
    expect(index.description).toContain('Sponsored: a paid placement');
    for (const a of agents) expect(typeof a.sponsored, a.slug).toBe('boolean');
    expect(agents.filter((a) => a.sponsored).map((a) => a.slug).sort()).toEqual([...SPONSORED_SLUGS].sort());
  });

  test('REST search and detail carry sponsored', async ({ request }) => {
    const detail = await getJson(request, '/api/agents/agentmail');
    expect(detail.sponsored).toBe(true);
    const search = await getJson(request, `/api/agents?q=${encodeURIComponent(UNPAID.name)}&limit=10`);
    const hit = search.agents.find((a) => a.slug === UNPAID.slug);
    expect(hit, `${UNPAID.name} in its own search`).toBeTruthy();
    expect(hit.sponsored).toBe(false);
  });

  // Connector directories reject MCP servers that serve sponsored placements.
  test('no MCP tool result mentions sponsorship', async ({ request }) => {
    const results = [
      await callTool(request, 'search_agents', { query: 'agentmail', limit: 5 }),
      await callTool(request, 'get_agent', { slug: 'barnir-hired' }),
      await callTool(request, 'compare_agents', { slugs: ['agentmail', UNPAID.slug] }),
      await callTool(request, 'alternatives_to', { slug: 'agentmail' }),
      await callTool(request, 'connect_bundle', { slugs: ['agentmail', 'agentswitchboard'] }),
    ];
    for (const result of results) expect(JSON.stringify(result)).not.toMatch(/sponsor/i);
  });

  test('llms.txt and /for-agents define the flag', async ({ page }) => {
    const llms = await (await page.request.get('/llms.txt', { headers: UA })).text();
    expect(llms).toContain('a `sponsored` flag also marks paid placements. Sponsored: a paid placement');
    await page.goto('/for-agents');
    await expect(page.locator('main')).toContainText('Sponsored: a paid placement');
  });
});

test.describe('/advertise, the manual sponsor flow', () => {
  test('says where a slot shows, what it never changes, and that it never reaches AI assistants', async ({ page }) => {
    await page.goto('/advertise');
    const main = page.locator('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Advertise with Us');
    const what = main.locator('section[aria-labelledby="what"]');
    await expect(what.getByText('Sponsored', { exact: true })).toBeVisible();
    await expect(what.getByRole('link', { name: 'homepage' })).toHaveAttribute('href', '/');
    await expect(what.getByRole('link', { name: 'weekly drop' })).toHaveAttribute('href', '/drops');
    const never = main.locator('section[aria-labelledby="never"]');
    await expect(never).toContainText('Search results or their order, tasks, alternatives, compare or the Operator');
    await expect(never).toContainText('sponsorship never appears in those results');
    await expect(never.getByRole('link', { name: 'What Sponsored means' })).toHaveAttribute('href', '/about#sponsored');
    await expect(main.locator('section[aria-labelledby="qualifies"]')).toContainText('Verified checks');
  });

  test('lists fixed, priced packages, with no way to pay on the page', async ({ page }) => {
    await page.goto('/advertise');
    const packages = page.locator('main [data-sponsor-packages] > li');
    await expect(packages).toHaveCount(3);
    await expect(packages.getByRole('heading', { level: 3 })).toHaveText(['1 week', '4 weeks', '12 weeks']);
    for (const [i, price] of ['$29', '$99', '$249'].entries()) await expect(packages.nth(i)).toContainText(price);
    const section = page.locator('main section[aria-labelledby="packages"]');
    await expect(section).not.toContainText('Contact for pricing');
    await expect(section).toContainText('come off the day the first paying sponsor goes live');
    expect(await page.locator('main a[href*="stripe"], main a[href*="buy."], main form, main button').count()).toBe(0);
  });

  test('"Request a slot" opens a prefilled email to the maintainer', async ({ page }) => {
    await page.goto('/advertise');
    const href = await page.getByRole('link', { name: /Request a slot/ }).getAttribute('href');
    const url = new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('barnir@agentmail.to');
    expect(url.searchParams.get('subject')).toBe('Sponsored slot request — Agent Switchboard');
    expect(url.searchParams.get('body')).toContain('Package (1 week, 4 weeks, 12 weeks):');
  });

  test('/pro redirects to /advertise', async ({ request }) => {
    const res = await request.get('/pro', { headers: UA, maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toMatch(/\/advertise$/);
  });
});
