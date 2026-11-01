// Listing pages /agents/<slug> on the live site, checked against the public
// API record for the same slug (app/agents/[slug]/page.tsx, lib/public-api.ts).
import { test, expect } from './fixtures.mjs';

const UA = { 'user-agent': 'asb-e2e (listings)' };

// A mix: sponsored, featured placements, official vendors, and every access
// method (api, mcp, cli, browser-extension).
const SLUGS = [
  'barnir-hired',   // sponsored, mcp only
  'agentmail',      // api + mcp + cli
  'claude-code',    // official (Anthropic), cli + api
  'playwright-mcp', // official (Microsoft), mcp + cli
  'codex-cli',      // official, cli + mcp
  'kong',           // official, api + cli + mcp
  'manus',          // official, api only
  'hermes-agent',   // official, cli only
  'cline',          // browser-extension only
  'browseros',      // browser-extension + cli
  'apollo-io',      // api + browser-extension
  'typesense',      // api only
  'opencode',       // cli only
];

const ACCESS_LABELS = { api: 'API', mcp: 'MCP', cli: 'CLI', 'browser-extension': 'Extension' };
const AUTH_LABELS = { apiKey: 'API Key', oauth2: 'OAuth 2.0', bearer: 'Bearer Token', none: 'None' };

async function apiRecord(request, slug) {
  const res = await request.get(`/api/agents/${slug}`, { headers: UA });
  expect(res.status(), `/api/agents/${slug}`).toBe(200);
  return res.json();
}

// The human-view container of the listing (div.human-only.container-wide.section).
const listing = (page) => page.locator('div.human-only.section');

test.describe('listing pages match the API record', () => {
  for (const slug of SLUGS) {
    test(`/agents/${slug}: 200, h1, access, auth, categories match API`, async ({ page }) => {
      const rec = await apiRecord(page.request, slug);
      const res = await page.goto(`/agents/${slug}`);
      expect(res.status()).toBe(200);
      const root = listing(page);
      await expect(root.getByRole('heading', { level: 1 })).toHaveText(rec.name);

      const accessRow = root.locator('dl > div').filter({ has: page.locator('dt', { hasText: 'Access' }) });
      const shown = (await accessRow.locator('dd span').allTextContents()).map((s) => s.trim());
      expect(shown).toEqual(rec.accessMethods.map((m) => ACCESS_LABELS[m]));

      const authRow = root.locator('dl > div').filter({ has: page.locator('dt', { hasText: 'Auth' }) });
      await expect(authRow.locator('dd')).toHaveText(AUTH_LABELS[rec.authType]);

      const catHrefs = await root.locator('a[href^="/categories/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(catHrefs).toEqual(rec.categories.map((c) => `/categories/${c}`));

      if (rec.skills.length) {
        const skillNames = await root.locator('h2:has-text("Skills") + ul h3').allTextContents();
        expect(skillNames).toEqual(rec.skills.map((s) => s.name));
      }
    });
  }
});

test('Visit Agent and provider links are absolute http(s), open in a new tab, and match the API', async ({ page }) => {
  for (const slug of SLUGS.slice(0, 6)) {
    const rec = await apiRecord(page.request, slug);
    await page.goto(`/agents/${slug}`);
    const root = listing(page);
    const visit = root.getByRole('link', { name: /Visit Agent/ });
    await expect(visit, slug).toHaveAttribute('href', rec.homepage);
    expect(rec.homepage, slug).toMatch(/^https?:\/\//);
    await expect(visit).toHaveAttribute('target', '_blank');
    await expect(visit).toHaveAttribute('rel', /noopener/);
    const provider = root.getByRole('link', { name: rec.provider, exact: true }).first();
    await expect(provider, slug).toHaveAttribute('href', rec.providerUrl);
    expect(rec.providerUrl, slug).toMatch(/^https?:\/\//);
  }
});

test('category links on sampled listings all resolve (200)', async ({ page }) => {
  const hrefs = new Set();
  for (const slug of SLUGS) {
    const rec = await apiRecord(page.request, slug);
    rec.categories.forEach((c) => hrefs.add(`/categories/${c}`));
  }
  expect(hrefs.size).toBeGreaterThan(2);
  for (const href of hrefs) {
    const res = await page.request.get(href, { headers: UA });
    expect(res.status(), href).toBe(200);
  }
});

test('Related Agents links on listings resolve to published listings', async ({ page }) => {
  const hrefs = new Set();
  for (const slug of ['agentmail', 'claude-code', 'playwright-mcp']) {
    await page.goto(`/agents/${slug}`);
    const rel = listing(page).locator('div:has(> h2:has-text("Related Agents")) a[href^="/agents/"]');
    // "See N alternatives" under the grid is a page, not a listing (43-alternatives covers it).
    const list = (await rel.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).filter((h) => !h.endsWith('/alternatives'));
    expect(list.length, `${slug} related`).toBeGreaterThan(0);
    expect(list, `${slug} links to itself`).not.toContain(`/agents/${slug}`);
    list.forEach((h) => hrefs.add(h));
  }
  for (const href of [...hrefs].slice(0, 15)) {
    const res = await page.request.get(`/api${href}`, { headers: UA });
    expect(res.status(), `/api${href}`).toBe(200);
  }
});

test('JSON-LD SoftwareApplication parses and matches the record', async ({ page }) => {
  for (const slug of ['agentmail', 'kong', 'cline']) {
    const rec = await apiRecord(page.request, slug);
    await page.goto(`/agents/${slug}`);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((b) => JSON.parse(b));
    const app = parsed.flat().find((s) => s['@type'] === 'SoftwareApplication');
    expect(app, `${slug} SoftwareApplication`).toBeTruthy();
    expect(app.name).toBe(rec.name);
    expect(app.url).toBe(rec.homepage);
    expect(app.provider.name).toBe(rec.provider);
    expect(app.offers, 'no pricing claim').toBeUndefined();
  }
});

test('official listing shows the Official badge and a working "More from <vendor>" link', async ({ page }) => {
  const rec = await apiRecord(page.request, 'playwright-mcp');
  expect(rec.official).toBe(true);
  await page.goto('/agents/playwright-mcp');
  const root = listing(page);
  // The header block (h1's parent) holds the listing's own badges; Related Agents cards carry their own.
  const header = root.getByRole('heading', { level: 1 }).locator('..');
  await expect(header.getByText('Official', { exact: true })).toBeVisible();
  await expect(root.getByText(`Official listing: built and published by ${rec.officialVendor}.`)).toBeVisible();
  const more = root.getByRole('link', { name: `More from ${rec.officialVendor}` });
  const href = await more.getAttribute('href');
  expect(href).toMatch(/^\/browse\?official=1&vendor=[a-z0-9-]+$/);
  const res = await page.goto(href);
  expect(res.status()).toBe(200);
  await expect(page.locator('a[href="/agents/playwright-mcp"]').first()).toBeVisible();
});

test('non-official listing has no Official badge or vendor line', async ({ page }) => {
  const rec = await apiRecord(page.request, 'agentmail');
  expect(rec.official).toBe(false);
  await page.goto('/agents/agentmail');
  const root = listing(page);
  const header = root.getByRole('heading', { level: 1 }).locator('..');
  await expect(header.getByText('Official', { exact: true })).toHaveCount(0);
  await expect(root.getByText(/Official listing:/)).toHaveCount(0);
});

test('sponsored listing (Barnir Hired) discloses its sponsor label on its page', async ({ page }) => {
  // content/agents/barnir-hired.json carries "sponsorLabel": "Sponsored".
  await page.goto('/agents/barnir-hired');
  const header = listing(page).getByRole('heading', { level: 1 }).locator('..');
  await expect(header.getByText('Sponsored', { exact: true })).toBeVisible();
});

test('archived free-claude-code is absent from /api/agents and its detail endpoint 404s', async ({ page }) => {
  const search = await page.request.get('/api/agents?q=free-claude-code&limit=50', { headers: UA });
  expect(search.status()).toBe(200);
  const body = await search.json();
  expect(body.agents.map((a) => a.slug)).not.toContain('free-claude-code');
  const detail = await page.request.get('/api/agents/free-claude-code', { headers: UA });
  expect(detail.status()).toBe(404);
  expect((await detail.json()).error).toBe('not_found');
});

test('archived free-claude-code listing page is a 404 (notFound())', async ({ page }) => {
  const res = await page.goto('/agents/free-claude-code');
  expect(res.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/404/);
});

test('unknown slug returns the 404 page with noindex and recovery links', async ({ page }) => {
  const res = await page.goto('/agents/asb-e2e-no-such-agent-xyz');
  expect(res.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('404 — no agent on this line');
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('link', { name: 'Browse all agents' })).toHaveAttribute('href', '/browse');
});

test('/agents/<slug>.md is not a route (404); the markdown alternate is /index.md', async ({ page }) => {
  // Source has no per-listing Markdown; layout.tsx links rel=alternate text/markdown to /index.md.
  const md = await page.request.get('/agents/claude-code.md', { headers: UA });
  expect(md.status()).toBe(404);
  await page.goto('/agents/claude-code');
  const alt = page.locator('link[rel="alternate"][type="text/markdown"]');
  await expect(alt).toHaveAttribute('href', '/index.md');
  const res = await page.request.get('/index.md', { headers: UA });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/markdown');
  expect(await res.text()).toMatch(/^# Agent Switchboard/);
});

test('canonical URL is the absolute listing URL from the API', async ({ page }) => {
  const rec = await apiRecord(page.request, 'codex-cli');
  await page.goto('/agents/codex-cli');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', rec.url);
  await expect(page).toHaveTitle(new RegExp(`^${rec.name}`));
});

test("og:image and twitter:image are the listing's own card: absolute, versioned, a 1200x630 PNG", async ({ page }) => {
  await page.goto('/agents/agentmail');
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
  const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  expect(tw).toBe(og);
  for (const url of [og, tw]) {
    expect(url).toMatch(/^https:\/\/agentswitchboard\.dev\/agents\/agentmail\/card\.png\?v=[0-9a-f]{8}$/);
    const res = await page.request.get(url, { headers: UA });
    expect(res.status(), url).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    const buf = await res.body();
    // PNG IHDR: width at bytes 16-19, height at 20-23.
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
  }
});

test('text-only view shows the record fields (slug, access, auth) and hides the human view', async ({ page }) => {
  const rec = await apiRecord(page.request, 'agentmail');
  await page.goto('/agents/agentmail');
  const bar = page.getByRole('complementary', { name: 'For AI agents' });
  await bar.getByRole('button', { name: /Switch to text-only view/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
  await expect(listing(page)).toBeHidden();
  const agentView = page.locator('div.agent-only').last();
  await expect(agentView).toBeVisible();
  await expect(agentView.locator('.agent-accent').first()).toHaveText(rec.slug);
  const row = (key) => agentView.locator('.agent-row').filter({ has: page.locator('span.agent-dim', { hasText: new RegExp(`^${key}$`) }) });
  await expect(row('access').locator('.agent-accent')).toHaveText(rec.accessMethods.join(' · '));
  await expect(row('auth').locator('.agent-accent')).toHaveText(rec.authType);
  await expect(row('url').locator('.agent-accent')).toHaveText(rec.homepage);
  expect(await page.evaluate(() => localStorage.getItem('viewMode'))).toBe('agent');
});

test('listing pages log no app console errors and make no writes', async ({ page, blocked }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${page.url()}: pageerror ${e.message}`));
  for (const slug of ['barnir-hired', 'cline', 'kong']) {
    await page.goto(`/agents/${slug}`, { waitUntil: 'networkidle' });
  }
  // Aborted analytics/sentry beacons surface as net::ERR_FAILED; not app errors.
  const appErrors = errors.filter((e) => !/ERR_FAILED|_vercel|sentry|418/.test(e));
  expect(appErrors).toEqual([]);
  expect(blocked).toEqual([]);
});

test.describe('mobile listing', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('listing page has no horizontal overflow at 375px and keeps h1 + Visit Agent visible', async ({ page }) => {
    for (const slug of ['agentmail', 'playwright-mcp']) {
      await page.goto(`/agents/${slug}`);
      const root = listing(page);
      await expect(root.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(root.getByRole('link', { name: /Visit Agent/ })).toBeVisible();
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw, `${slug} scrollWidth`).toBeLessThanOrEqual(cw);
    }
  });
});
