// Categories area: /categories index, every /categories/<slug> page, the
// thumb-index rail, the 404 for unknown slugs, and listing links.
// Read-only: only GETs (via fetch at collection time, page.goto and page.request).
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (live categories tests)' };

// The real category list drives the parametrized tests (GET only).
const apiRes = await fetch(`${BASE}/api/categories`, { headers: UA });
const { categories: CATEGORIES } = await apiRes.json();

/** Listing cards in the human view of a category page (rail links only go to /categories). */
const humanListings = (page) => page.locator('.human-only a[href^="/agents/"]');
const rail = (page) => page.getByRole('navigation', { name: 'Categories' });

test.describe('/api/categories', () => {
  test('returns a non-empty list with slug, name and numeric agentCount', async ({ page }) => {
    const res = await page.request.get('/api/categories', { headers: UA });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const body = await res.json();
    expect(body.categories.length).toBeGreaterThan(0);
    for (const c of body.categories) {
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      expect(typeof c.name).toBe('string');
      expect(Number.isInteger(c.agentCount)).toBe(true);
    }
    const slugs = body.categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('agentCount agrees with /api/agents?category= totals', async ({ page }) => {
    // A few categories, not all, to stay polite.
    const sample = [CATEGORIES[0], CATEGORIES[CATEGORIES.length - 1], CATEGORIES.find((c) => c.slug === 'legal') ?? CATEGORIES[1]];
    for (const c of sample) {
      const res = await page.request.get(`/api/agents?category=${c.slug}&limit=1`, { headers: UA });
      expect(res.status()).toBe(200);
      expect((await res.json()).total, `total for ${c.slug}`).toBe(c.agentCount);
    }
  });
});

test.describe('/categories index', () => {
  test('lists every API category with its listing count', async ({ page }) => {
    const res = await page.goto('/categories');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible();
    const main = page.locator('.human-only ul').first();
    const rows = main.locator('a[href^="/categories/"]');
    await expect(rows).toHaveCount(CATEGORIES.length);
    for (const c of CATEGORIES) {
      const row = main.locator(`a[href="/categories/${c.slug}"]`);
      await expect(row, c.slug).toContainText(c.name);
      await expect(row, c.slug).toContainText(`${c.agentCount} listing${c.agentCount !== 1 ? 's' : ''}`);
    }
  });

  test('rail on the index lists categories in API order with no current tab', async ({ page }) => {
    await page.goto('/categories');
    const tabs = rail(page).getByRole('link');
    await expect(tabs).toHaveCount(CATEGORIES.length);
    const hrefs = await tabs.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(CATEGORIES.map((c) => `/categories/${c.slug}`));
    await expect(rail(page).locator('[aria-current="page"]')).toHaveCount(0);
  });

  test('clicking a rail tab navigates to that category', async ({ page }) => {
    await page.goto('/categories');
    const target = CATEGORIES[Math.min(3, CATEGORIES.length - 1)];
    await rail(page).getByRole('link', { name: target.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/categories/${target.slug}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target.name);
    await expect(rail(page).getByRole('link', { name: target.name, exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('clicking a rail tab from one category page moves to another', async ({ page }) => {
    const [from, to] = [CATEGORIES[0], CATEGORIES[CATEGORIES.length - 1]];
    await page.goto(`/categories/${from.slug}`);
    await rail(page).getByRole('link', { name: to.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/categories/${to.slug}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(to.name);
    await expect(rail(page).locator('[aria-current="page"]')).toHaveCount(1);
  });

  test('text-only view of the index lists every category slug', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/categories');
    await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(page.locator('.human-only').first()).toBeHidden();
    await expect(agentView.getByText(`${CATEGORIES.length} categories indexed`)).toBeVisible();
    await expect(agentView.locator('a[href^="/categories/"]')).toHaveCount(CATEGORIES.length);
  });
});

test.describe('every category page', () => {
  for (const c of CATEGORIES) {
    test(`${c.slug}: 200, h1 "${c.name}", ${c.agentCount} listings`, async ({ page }) => {
      const res = await page.goto(`/categories/${c.slug}`);
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.name);
      // The page renders every listing (no pagination in app/categories/[slug]/page.tsx).
      await expect(humanListings(page)).toHaveCount(c.agentCount);
    });

    test(`${c.slug}: rail tab is aria-current="page" at 1440`, async ({ page }) => {
      await page.goto(`/categories/${c.slug}`);
      const tab = rail(page).getByRole('link', { name: c.name, exact: true });
      await expect(tab).toBeVisible();
      await expect(tab).toHaveAttribute('aria-current', 'page');
      await expect(rail(page).locator('[aria-current="page"]')).toHaveCount(1);
    });
  }
});

test.describe('category page details', () => {
  // A small category keeps these checks light.
  const small = [...CATEGORIES].filter((c) => c.agentCount > 0).sort((a, b) => a.agentCount - b.agentCount)[0];

  test('header count, document title and canonical match the category', async ({ page }) => {
    await page.goto(`/categories/${small.slug}`);
    await expect(page.locator('h1').locator('xpath=following-sibling::span[1]')).toHaveText(`· ${small.agentCount}`);
    await expect(page).toHaveTitle(new RegExp(`^${small.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} AI Agents`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}/categories/${small.slug}`);
  });

  test('ItemList JSON-LD numberOfItems equals the API count', async ({ page }) => {
    await page.goto(`/categories/${small.slug}`);
    const lists = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
      els.map((e) => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter((j) => j && j['@type'] === 'ItemList'));
    expect(lists).toHaveLength(1);
    expect(lists[0].numberOfItems).toBe(small.agentCount);
    expect(lists[0].itemListElement).toHaveLength(small.agentCount);
  });

  test('text-only view of a category lists the same number of agents', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto(`/categories/${small.slug}`);
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(agentView.locator('a[href^="/agents/"]')).toHaveCount(small.agentCount);
    await expect(agentView).toContainText(`${small.name} · ${small.agentCount} agent${small.agentCount !== 1 ? 's' : ''}`);
  });

  test('listing links on a category page open real listing pages', async ({ page }) => {
    await page.goto(`/categories/${small.slug}`);
    const cards = humanListings(page);
    const n = Math.min(4, await cards.count());
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const href = await cards.nth(i).getAttribute('href');
      const name = (await cards.nth(i).locator('h3').textContent()).trim();
      const res = await page.request.get(href, { headers: UA });
      expect(res.status(), href).toBe(200);
      expect(await res.text(), href).toContain(name.replace(/&/g, '&amp;'));
    }
  });

  test('clicking a listing card lands on that agent page', async ({ page }) => {
    await page.goto(`/categories/${small.slug}`);
    const card = humanListings(page).first();
    const href = await card.getAttribute('href');
    const name = (await card.locator('h3').textContent()).trim();
    await card.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  });

  test('share card: summary_large_image comes with og:image and twitter:image that serve a PNG', async ({ page }) => {
    await page.goto(`/categories/${small.slug}`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const og = await page.locator('meta[property="og:image"]').first().getAttribute('content', { timeout: 2000 }).catch(() => null);
    const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content', { timeout: 2000 }).catch(() => null);
    expect({ og: !!og, tw: !!tw }, 'category page share-card image tags').toEqual({ og: true, tw: true });
    const res = await page.request.get(tw, { headers: UA });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('no app console errors on a category page', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await page.goto(`/categories/${small.slug}`, { waitUntil: 'networkidle' });
    // Aborted analytics beacons are the harness's doing, not the app's.
    const appErrors = errors.filter((t) => !/_vercel|insights|ERR_FAILED|sentry/i.test(t));
    expect(appErrors).toEqual([]);
  });

  test('official link (when present) points at /browse filtered by this category', async ({ page }) => {
    await page.goto('/categories/legal');
    const link = page.getByRole('link', { name: /\d+ official/i });
    await expect(link).toHaveAttribute('href', '/browse?official=1&category=legal');
    const res = await page.request.get('/api/agents?category=legal&official=true&limit=1', { headers: UA });
    const total = (await res.json()).total;
    await expect(link).toHaveText(`${total} official`);
  });
});

test.describe('unknown category', () => {
  test('/categories/does-not-exist returns the 404 page', async ({ page }) => {
    const res = await page.goto('/categories/does-not-exist');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    await expect(page.getByRole('link', { name: 'Browse all agents' })).toHaveAttribute('href', '/browse');
  });
});

test.describe('categories on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('rail is hidden and the page does not scroll sideways', async ({ page }) => {
    const big = [...CATEGORIES].sort((a, b) => b.agentCount - a.agentCount)[0];
    await page.goto(`/categories/${big.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(big.name);
    await expect(rail(page)).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('index rows are at least 44px tall tap targets', async ({ page }) => {
    await page.goto('/categories');
    const rows = page.locator('.human-only ul').first().locator('a[href^="/categories/"]');
    const heights = await rows.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(heights.length).toBe(CATEGORIES.length);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
  });
});
