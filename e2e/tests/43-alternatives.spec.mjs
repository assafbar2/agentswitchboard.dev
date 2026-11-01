// Alternatives pages: /agents/<slug>/alternatives (lib/related.ts
// alternativesPage), their share cards, the "See N alternatives" link on
// listing pages and the 404 for listings without a page. Each alternative is
// checked against its own API record.
// Read-only: only GETs (via fetch at collection time, page.goto and page.request).
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (alternatives)' };

// app/sitemap.ts lists every listing and every alternatives page.
const sitemap = await (await fetch(`${BASE}/sitemap.xml`, { headers: UA })).text();
const LISTINGS = [...sitemap.matchAll(/\/agents\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
const PAGES = [...sitemap.matchAll(/\/agents\/([a-z0-9-]+)\/alternatives<\/loc>/g)].map((m) => m[1]);
const WITHOUT = LISTINGS.filter((slug) => !PAGES.includes(slug));
// Real-time voice frameworks and browser tools: categories with many genuine peers.
const SAMPLE = ['livekit-agents', 'safari-mcp', 'deepgram', PAGES[0], PAGES[PAGES.length - 1]];

const human = (page) => page.locator('.human-only');
const rows = (page) => human(page).locator('section[aria-labelledby="alternatives"] ol > li');

async function apiRecord(request, slug) {
  const res = await request.get(`/api/agents/${slug}`, { headers: UA });
  expect(res.status(), `/api/agents/${slug}`).toBe(200);
  return res.json();
}

async function itemList(page) {
  const lists = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((e) => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter((j) => j && j['@type'] === 'ItemList'));
  expect(lists).toHaveLength(1);
  return lists[0];
}

test('the sitemap lists an alternatives page for most listings, each a listed slug', () => {
  expect(PAGES.length).toBeGreaterThan(LISTINGS.length * 0.6);
  expect(new Set(PAGES).size).toBe(PAGES.length);
  for (const slug of PAGES) expect(LISTINGS, slug).toContain(slug);
  expect(WITHOUT.length).toBeGreaterThan(0);
});

for (const slug of [...new Set(SAMPLE)]) {
  test(`/agents/${slug}/alternatives: 3 to 8 alternatives, each sharing its category and a way to connect`, async ({ page }) => {
    const listing = await apiRecord(page.request, slug);
    const res = await page.goto(`/agents/${slug}/alternatives`);
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Alternatives to ${listing.name}`);

    const n = await rows(page).count();
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(8);
    await expect(page).toHaveTitle(new RegExp(`^Alternatives to .+ — ${n} similar tools? \\|`));
    await expect(human(page).locator('section[aria-labelledby="alternatives"] .dir-bar')).toContainText(`· ${n}`);
    await expect(human(page).locator(`a[href="/agents/${slug}"]`).first()).toContainText(listing.name);

    const hrefs = await rows(page).locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(new Set(hrefs).size).toBe(n);
    for (const [i, href] of hrefs.entries()) {
      const altSlug = href.replace('/agents/', '');
      expect(altSlug).not.toBe(slug);
      const alt = await apiRecord(page.request, altSlug);
      expect(alt.categories, altSlug).toContain(listing.categories[0]);
      const shared = alt.accessMethods.filter((m) => listing.accessMethods.includes(m));
      expect(shared.length, altSlug).toBeGreaterThan(0);
      const why = rows(page).nth(i).locator('p').filter({ hasText: /^Why/ });
      await expect(why).toHaveText(/^Why Both offer .+\. In common: .+\.$/);
    }

    const list = await itemList(page);
    expect(list.numberOfItems).toBe(n);
    expect(list.itemListElement.map((item) => item.url)).toEqual(hrefs.map((h) => `${ORIGIN}${h}`));
  });
}

test('the share card is the page\'s own, versioned, and a PNG', async ({ page }) => {
  const slug = 'livekit-agents';
  await page.goto(`/agents/${slug}/alternatives`);
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
  const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content');
  expect(og).toBe(tw);
  expect(og).toMatch(new RegExp(`^${ORIGIN}/agents/${slug}/alternatives/card\\.png\\?v=[0-9a-f]{8}$`));
  const card = await page.request.get(og.replace(ORIGIN, ''), { headers: UA });
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toContain('image/png');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/agents/${slug}/alternatives`);
});

test('a listing page links its alternatives page with the same count', async ({ page }) => {
  const slug = 'livekit-agents';
  await page.goto(`/agents/${slug}/alternatives`);
  const n = await rows(page).count();
  await page.goto(`/agents/${slug}`);
  const link = human(page).getByRole('link', { name: `See ${n} alternatives` });
  await expect(link).toHaveAttribute('href', `/agents/${slug}/alternatives`);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/agents/${slug}/alternatives$`));
});

test('a listing with too few alternatives has no page and no link to one', async ({ page }) => {
  const slug = WITHOUT[0];
  await page.goto(`/agents/${slug}`);
  await expect(human(page).getByRole('link', { name: /^See \d+ alternatives$/ })).toHaveCount(0);
  const res = await page.goto(`/agents/${slug}/alternatives`);
  expect(res.status()).toBe(404);
  const card = await page.request.get(`/agents/${slug}/alternatives/card.png`, { headers: UA });
  expect(card.status()).toBe(404);
});

test('an unknown listing\'s alternatives page is a 404', async ({ page }) => {
  const res = await page.goto('/agents/not-a-real-listing-xyz/alternatives');
  expect(res.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
});

test('text-only view lists the same alternatives with what they share', async ({ page }) => {
  const slug = 'livekit-agents';
  await page.goto(`/agents/${slug}/alternatives`);
  const hrefs = await rows(page).locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
  await page.goto(`/agents/${slug}/alternatives`);
  const agentView = page.locator('.agent-only');
  await expect(agentView).toBeVisible();
  await expect(agentView).toContainText(`/agents/${slug}/alternatives`);
  const listed = await agentView.locator('a.agent-row[href^="/agents/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(listed.slice(0, hrefs.length)).toEqual(hrefs);
  for (const href of hrefs) {
    const row = agentView.locator(`a.agent-row[href="${href}"]`).first();
    await expect(row.locator('span').nth(1)).toHaveText(/^(api|mcp|cli|browser-extension)(\+(api|mcp|cli|browser-extension))*$/);
    await expect(row.locator('span').nth(2)).not.toBeEmpty();
  }
});
