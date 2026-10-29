// Search and /browse: query matching, filters, URL state, counts vs the public API.
// Source: components/SearchBar.tsx, components/CatalogFilters.tsx,
// components/AccessMethodFilter.tsx, app/browse/page.tsx, lib/search.ts,
// app/api/agents/route.ts, components/CategoryRail.tsx.
import { test, expect } from './fixtures.mjs';

const UA = { 'user-agent': 'Mozilla/5.0 asb-e2e' };

/** Total matches from the public REST API (same catalog + search as /browse). */
async function apiTotal(page, params) {
  const qs = new URLSearchParams({ ...params, limit: '1' }).toString();
  const res = await page.request.get(`/api/agents?${qs}`, { headers: UA });
  expect(res.status()).toBe(200);
  return (await res.json()).total;
}

async function apiSlugs(page, params, limit = 50) {
  const qs = new URLSearchParams({ ...params, limit: String(limit) }).toString();
  const res = await page.request.get(`/api/agents?${qs}`, { headers: UA });
  expect(res.status()).toBe(200);
  return (await res.json()).agents.map((a) => a.slug);
}

const human = (page) => page.locator('.human-only');
const countBar = (page) => human(page).locator('h2.dir-bar');
const cards = (page) => human(page).locator('a[href^="/agents/"]:has(h3)');
const cardFor = (page, slug) => human(page).locator(`a[href="/agents/${slug}"]:has(h3)`);
const searchBox = (page) => human(page).getByRole('search').getByRole('searchbox');

/** The number shown in the yellow count bar ("51 agents listed"), or 0 for "No agents found". */
async function shownCount(page) {
  const text = (await countBar(page).innerText()).trim();
  if (/^No agents found/i.test(text)) return 0;
  const m = text.match(/^(\d+)/);
  expect(m, `count bar text: ${text}`).not.toBeNull();
  return Number(m[1]);
}

test.describe('search queries', () => {
  test('"agentmail" lists AgentMail as the only result', async ({ page }) => {
    const res = await page.goto('/browse?q=agentmail');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Results for “agentmail”');
    await expect(countBar(page)).toHaveText('1 agent matched');
    await expect(cards(page)).toHaveCount(1);
    await expect(cardFor(page, 'agentmail')).toBeVisible();
  });

  test('"postgres" ranks Postgres MCP Pro first and matches the API total', async ({ page }) => {
    await page.goto('/browse?q=postgres');
    const total = await apiTotal(page, { q: 'postgres' });
    expect(total).toBeGreaterThan(1);
    await expect(countBar(page)).toHaveText(`${total} agents matched`);
    await expect(cards(page).first()).toHaveAttribute('href', '/agents/postgres-mcp-pro');
  });

  test('"claude code" puts Claude Code first', async ({ page }) => {
    await page.goto('/browse?q=claude%20code');
    await expect(cards(page).first()).toHaveAttribute('href', '/agents/claude-code');
    await expect(cards(page).first().locator('h3')).toHaveText('Claude Code');
  });

  test('search is case-insensitive (AGENTMAIL == agentmail)', async ({ page }) => {
    await page.goto('/browse?q=AGENTMAIL');
    await expect(countBar(page)).toHaveText('1 agent matched');
    await expect(cardFor(page, 'agentmail')).toBeVisible();
  });

  test('a nonsense query shows the empty state', async ({ page }) => {
    await page.goto('/browse?q=zzqxjvnonsense');
    await expect(countBar(page)).toHaveText('No agents found');
    await expect(cards(page)).toHaveCount(0);
    await expect(human(page).getByText('No agents found matching “zzqxjvnonsense”')).toBeVisible();
    await expect(human(page).getByText('Try a different search or clear the filters.')).toBeVisible();
  });

  test('the page title reflects the query', async ({ page }) => {
    await page.goto('/browse?q=agentmail');
    await expect(page).toHaveTitle('"agentmail" — Search Results | Agent Switchboard');
  });

  test('the search box is prefilled with the current query', async ({ page }) => {
    await page.goto('/browse?q=postgres');
    await expect(searchBox(page)).toHaveValue('postgres');
  });

  const special = ['<script>alert(1)</script>', '%', '100% "quoted" & \'apos\'', 'c++', '\\', '!!', '日本語', 'constructor'];
  for (const q of special) {
    test(`special-character query ${JSON.stringify(q)} renders without error`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => { errors.push(`dialog: ${d.message()}`); d.dismiss(); });
      const res = await page.goto(`/browse?q=${encodeURIComponent(q)}`);
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(`“${q.trim()}”`);
      await expect(countBar(page)).toBeVisible();
      expect(await shownCount(page)).toBe(await apiTotal(page, { q }));
      expect(errors).toEqual([]);
    });
  }
});

test.describe('search box submission', () => {
  test('homepage "Look it up" box submits with Enter to /browse?q=', async ({ page }) => {
    await page.goto('/');
    const box = page.getByLabel('Look it up');
    await box.fill('agentmail');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/browse\?q=agentmail$/);
    await expect(cardFor(page, 'agentmail')).toBeVisible();
  });

  test('homepage Find button submits the query', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Look it up').fill('postgres');
    await page.getByRole('search').getByRole('button', { name: 'Find' }).click();
    await expect(page).toHaveURL(/\/browse\?q=postgres$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Results for “postgres”');
  });

  test('searching on /browse keeps the active category and access filters', async ({ page }) => {
    await page.goto('/browse?category=code-devtools&access=mcp');
    await searchBox(page).fill('github');
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/q=github/);
    const url = new URL(page.url());
    expect(url.searchParams.get('category')).toBe('code-devtools');
    expect(url.searchParams.get('access')).toBe('mcp');
    const total = await apiTotal(page, { q: 'github', category: 'code-devtools', access: 'mcp' });
    await expect(countBar(page)).toHaveText(new RegExp(`^${total} agents? matched$`));
  });

  test('submitting an empty query on /browse drops q from the URL', async ({ page }) => {
    await page.goto('/browse?q=postgres');
    await searchBox(page).fill('   ');
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/\/browse$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Browse Agents');
  });

  test('search submits navigate without any blocked write', async ({ page, blocked }) => {
    await page.goto('/');
    await page.getByLabel('Look it up').fill('agentmail');
    await page.getByLabel('Look it up').press('Enter');
    await expect(page).toHaveURL(/\/browse\?q=agentmail$/);
    expect(blocked).toEqual([]);
  });
});

test.describe('access-method filters', () => {
  const methods = [
    { key: 'mcp', label: 'MCP' },
    { key: 'api', label: 'API' },
    { key: 'cli', label: 'CLI' },
    { key: 'browser-extension', label: 'Extension' },
  ];
  for (const { key, label } of methods) {
    test(`${label} chip sets ?access=${key} and the count matches /api/agents`, async ({ page }) => {
      await page.goto('/browse');
      const chip = human(page).getByRole('button', { name: label, exact: true });
      await expect(chip).toHaveAttribute('aria-pressed', 'false');
      await chip.click();
      await expect(page).toHaveURL(new RegExp(`access=${encodeURIComponent(key)}`));
      await expect(chip).toHaveAttribute('aria-pressed', 'true');
      const total = await apiTotal(page, { access: key });
      expect(total).toBeGreaterThan(0);
      await expect(countBar(page)).toHaveText(new RegExp(`^${total} agents? listed$`));
    });
  }

  test('two chips combine as AND (access=mcp,cli)', async ({ page }) => {
    await page.goto('/browse?access=mcp');
    await human(page).getByRole('button', { name: 'CLI', exact: true }).click();
    await expect(page).toHaveURL(/access=mcp%2Ccli|access=mcp,cli/);
    const both = await apiTotal(page, { access: 'mcp,cli' });
    expect(both).toBeLessThanOrEqual(await apiTotal(page, { access: 'mcp' }));
    await expect(countBar(page)).toHaveText(new RegExp(`^${both} agents? listed$`));
  });

  test('clicking a pressed chip clears it', async ({ page }) => {
    await page.goto('/browse?access=mcp');
    const chip = human(page).getByRole('button', { name: 'MCP', exact: true });
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await chip.click();
    await expect(page).not.toHaveURL(/access=/);
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(countBar(page)).toHaveText(`${await apiTotal(page, {})} agents listed`);
  });
});

test.describe('official and category filters', () => {
  test('official=1 shows only official listings, count matches the API', async ({ page }) => {
    await page.goto('/browse?official=1');
    await expect(human(page).getByRole('button', { name: 'Official' })).toHaveAttribute('aria-pressed', 'true');
    const total = await apiTotal(page, { official: 'true' });
    await expect(countBar(page)).toHaveText(`${total} official agents listed`);
  });

  test('the homepage "more vendors" link lands on the official filter', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href="/browse?official=1"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/browse\?official=1$/);
    await expect(countBar(page)).toHaveText(/official agents listed$/);
  });

  test('toggling Official off clears official from the URL', async ({ page }) => {
    await page.goto('/browse?official=1');
    await human(page).getByRole('button', { name: 'Official' }).click();
    await expect(page).toHaveURL(/\/browse$/);
    await expect(human(page).getByRole('button', { name: 'Official' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('choosing a category in the picker sets ?category= and narrows the list', async ({ page }) => {
    await page.goto('/browse');
    await human(page).getByLabel('Category').selectOption('security');
    await expect(page).toHaveURL(/category=security/);
    const total = await apiTotal(page, { category: 'security' });
    await expect(countBar(page)).toHaveText(`${total} agents listed`);
  });

  test('"All categories" clears the category filter', async ({ page }) => {
    await page.goto('/browse?category=security');
    await human(page).getByLabel('Category').selectOption('');
    await expect(page).toHaveURL(/\/browse$/);
    await expect(human(page).getByLabel('Category')).toHaveValue('');
  });

  test('category + official + access + query combine', async ({ page }) => {
    const params = { q: 'mcp', category: 'code-devtools', official: '1', access: 'mcp' };
    await page.goto(`/browse?${new URLSearchParams(params)}`);
    const total = await apiTotal(page, { ...params, official: 'true' });
    const expected = total === 0 ? 'No agents found' : `${total} official agent${total === 1 ? '' : 's'} matched`;
    await expect(countBar(page)).toHaveText(expected);
    const slugs = await apiSlugs(page, { ...params, official: 'true' });
    const hrefs = await cards(page).evaluateAll((els) => els.map((a) => a.getAttribute('href')));
    expect(hrefs.slice(0, slugs.length)).toEqual(slugs.map((s) => `/agents/${s}`));
  });
});

test.describe('category counts and the rail', () => {
  // A real list: every category, against /api/categories counts. Few enough pages to be polite.
  const sample = ['language', 'code-devtools', 'security', 'orchestration', 'productivity'];
  for (const slug of sample) {
    test(`/browse?category=${slug} count equals /api/categories agentCount and the rail marks it current`, async ({ page }) => {
      const res = await page.request.get('/api/categories', { headers: UA });
      const cat = (await res.json()).categories.find((c) => c.slug === slug);
      expect(cat, `category ${slug} exists`).toBeTruthy();
      await page.goto(`/browse?category=${slug}`);
      await expect(countBar(page)).toHaveText(`${cat.agentCount} agent${cat.agentCount === 1 ? '' : 's'} listed`);
      const current = page.getByRole('navigation', { name: 'Categories' }).locator('a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute('href', `/categories/${slug}`);
      await expect(current).toHaveAccessibleName(cat.name);
    });
  }

  test('the rail marks no category current when no category filter is set', async ({ page }) => {
    await page.goto('/browse');
    const nav = page.getByRole('navigation', { name: 'Categories' });
    await expect(nav).toBeVisible();
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(0);
  });
});

test.describe('listing completeness', () => {
  test('unfiltered /browse renders every agent (no pagination), matching the API total', async ({ page }) => {
    await page.goto('/browse');
    const total = await apiTotal(page, {});
    await expect(countBar(page)).toHaveText(`${total} agents listed`);
    await expect(cards(page)).toHaveCount(total);
  });

  test('rendered card count equals the count bar for a filtered view', async ({ page }) => {
    await page.goto('/browse?access=browser-extension');
    const n = await shownCount(page);
    await expect(cards(page)).toHaveCount(n);
  });

  test('back navigation restores the previous query in the box and results', async ({ page }) => {
    await page.goto('/browse?q=agentmail');
    await searchBox(page).fill('postgres');
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/q=postgres/);
    await page.goBack();
    await expect(page).toHaveURL(/q=agentmail/);
    await expect(searchBox(page)).toHaveValue('agentmail');
    await expect(countBar(page)).toHaveText('1 agent matched');
  });
});

test.describe('URL parameter handling', () => {
  test('access=extension alias equals access=browser-extension', async ({ page }) => {
    await page.goto('/browse?access=extension');
    const alias = await shownCount(page);
    await page.goto('/browse?access=browser-extension');
    expect(alias).toBe(await shownCount(page));
    expect(alias).toBeGreaterThan(0);
  });

  test('official=true and official=yes are accepted like official=1', async ({ page }) => {
    await page.goto('/browse?official=1');
    const one = await shownCount(page);
    for (const v of ['true', 'YES']) {
      await page.goto(`/browse?official=${v}`);
      expect(await shownCount(page), `official=${v}`).toBe(one);
    }
  });

  test('unknown access value is ignored, as /api/agents does', async ({ page }) => {
    await page.goto('/browse?access=bogus');
    const api = await apiTotal(page, { access: 'bogus' });
    expect(await shownCount(page)).toBe(api);
  });

  test('vendor=<slug> shows a vendor chip and only that vendor', async ({ page }) => {
    await page.goto('/browse?vendor=aiven');
    await expect(human(page).getByRole('button', { name: /Aiven/ })).toBeVisible();
    await expect(countBar(page)).toHaveText(/official agents? listed$/);
    expect(await shownCount(page)).toBeGreaterThan(0);
    await human(page).getByRole('button', { name: /Aiven/ }).click();
    await expect(page).not.toHaveURL(/vendor=/);
  });

  test('unknown category shows the empty state, not an error', async ({ page }) => {
    const res = await page.goto('/browse?category=no-such-category');
    expect(res.status()).toBe(200);
    await expect(countBar(page)).toHaveText('No agents found');
  });

  test('/browse logs no app console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/browse?q=postgres&access=mcp');
    await page.waitForLoadState('networkidle');
    const app = errors.filter((e) => !/insights|sentry|ERR_FAILED|blocked by asb-e2e|418/i.test(e));
    expect(app).toEqual([]);
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  test('filtered /browse has no horizontal overflow and hides the rail', async ({ page }) => {
    await page.goto('/browse?category=code-devtools&access=mcp&official=1');
    await expect(countBar(page)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole('navigation', { name: 'Categories' })).toBeHidden();
  });
});
