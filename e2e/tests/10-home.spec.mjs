// Homepage (/) live e2e tests. Read-only: GET/HEAD only (fixture guard).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures.mjs';

// Repo root, for comparing the live site against the content it was built from.
const REPO = fileURLToPath(new URL('../..', import.meta.url));
const UA = { 'user-agent': 'Mozilla/5.0 asb-e2e (live smoke tests)' };
// Category list from the git-as-CMS source, sorted the way getAllCategories sorts it.
const CATEGORIES = JSON.parse(readFileSync(`${REPO}/content/categories.json`, 'utf8'))
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .map(({ name, slug }) => ({ name, slug }));
const VENDORS_SHOWN = 12; // components/OfficialPlatforms.tsx

const meta = (page, sel) => page.locator(sel).first().getAttribute('content');
const human = (page) => page.locator('main .human-only');

async function getJson(page, path) {
  const res = await page.request.get(path, { headers: UA });
  expect(res.status(), `${path} status`).toBe(200);
  return res.json();
}

test.describe('homepage — head metadata', () => {
  test('has the site title and a meta description', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Agent Switchboard — AI Agent Directory');
    const desc = await meta(page, 'meta[name="description"]');
    expect(desc).toBeTruthy();
    expect(desc.length).toBeGreaterThan(50);
    expect(desc).toContain('AI agents');
  });

  test('og:image resolves to a 1200x630 PNG', async ({ page }) => {
    await page.goto('/');
    const og = await meta(page, 'meta[property="og:image"]');
    expect(og).toMatch(/^https:\/\/agentswitchboard\.dev\/opengraph-image/);
    const res = await page.request.get(og, { headers: UA });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    const buf = await res.body();
    // PNG IHDR: width at byte 16, height at byte 20 (big-endian).
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  // Twitter/X caches card images by URL. og:image carries Next's content hash
  // (?<hash>) so a new image gets a new URL; twitter:image must too, or X keeps
  // showing the cached old card.
  test('twitter:image is the same versioned image URL as og:image', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const og = await meta(page, 'meta[property="og:image"]');
    const tw = await meta(page, 'meta[name="twitter:image"]');
    expect(tw, 'twitter:image present').toBeTruthy();
    expect(tw, 'twitter:image should be cache-busted like og:image').toBe(og);
  });
});

test.describe('homepage — hero', () => {
  test('keeps the headline, tagline and subhead', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Every AI Agent Worth Knowing, in One Place');
    const hero = human(page).locator('section').first();
    await expect(hero.getByText('The directory for the agentic web', { exact: true })).toBeVisible();
    await expect(hero.getByText(/Browse, compare, and integrate verified AI agents with real API, MCP, and CLI access/)).toBeVisible();
  });

  test('hero stats match /agents.json and the category list', async ({ page }) => {
    const data = await getJson(page, '/agents.json');
    await page.goto('/');
    const stat = (label) => human(page).locator('dl div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');
    await expect(stat('Agents')).toHaveText(String(data.total));
    await expect(stat('Categories')).toHaveText(String(CATEGORIES.length));
    const providers = new Set(data.agents.map((a) => a.provider).filter(Boolean));
    const shown = Number(await stat('Providers').textContent());
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThanOrEqual(providers.size);
  });

  test('"Look it up" search submits to /browse with the query', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('searchbox', { name: 'Look it up' });
    await expect(box).toBeVisible();
    await box.fill('email agent');
    await box.press('Enter');
    await page.waitForURL(/\/browse\?q=email(\+|%20)agent/);
    expect(new URL(page.url()).searchParams.get('q')).toBe('email agent');
    await expect(page.getByRole('searchbox').first()).toHaveValue('email agent');
  });

  test('"Find" button also submits the search', async ({ page, blocked }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Look it up' }).fill('mcp');
    await page.getByRole('button', { name: 'Find' }).click();
    await page.waitForURL(/\/browse\?q=mcp$/);
    expect(blocked, 'search is a client navigation, not a write').toEqual([]);
  });

  test('MCP callout links to the connect docs and the #mcp section exists', async ({ page }) => {
    await page.goto('/');
    const link = human(page).getByRole('link', { name: /this directory is an MCP server/ });
    await expect(link).toHaveAttribute('href', '/for-agents#mcp');
    await link.click();
    await page.waitForURL(/\/for-agents#mcp$/);
    await expect(page.locator('#mcp')).toBeVisible();
  });

  test('Grok Bot / X strip links to the Grok Bot section on /connect', async ({ page }) => {
    await page.goto('/');
    const link = human(page).getByRole('link', { name: /Use it from Grok Bot \/ X/ });
    await expect(link).toHaveAttribute('href', '/connect#grok-bot');
    await link.click();
    await page.waitForURL(/\/connect#grok-bot$/);
    await expect(page.locator('#grok-bot')).toBeVisible();
  });
});

test.describe('homepage — agent bar', () => {
  test('shows the AGENTS tag, sentence, switch button and fetch links', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByRole('complementary', { name: 'For AI agents' });
    await expect(bar.getByText('AGENTS', { exact: true })).toBeVisible();
    await expect(bar.getByText('Skip the HTML. This whole directory has a text-only view.')).toBeVisible();
    await expect(bar.getByRole('button', { name: /Switch to text-only view/ })).toBeVisible();
    for (const [name, href] of [['/llms.txt', '/llms.txt'], ['/index.md', '/index.md'], ['/api/mcp', '/for-agents#mcp']]) {
      await expect(bar.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
  });

  for (const href of ['/llms.txt', '/index.md', '/for-agents']) {
    test(`agent bar link ${href} resolves with 200`, async ({ page }) => {
      const res = await page.request.get(href, { headers: UA });
      expect(res.status()).toBe(200);
      expect((await res.text()).length).toBeGreaterThan(200);
    });
  }

  test('"Switch to text-only view" shows the agent view and remembers it', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByRole('complementary', { name: 'For AI agents' });
    await bar.getByRole('button', { name: /Switch to text-only view/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
    expect(await page.evaluate(() => localStorage.getItem('viewMode'))).toBe('agent');
    await expect(page.locator('main .agent-only').getByText('agentswitchboard.dev', { exact: true })).toBeVisible();
    await expect(human(page)).toBeHidden();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
    await bar.getByRole('button', { name: /Back to the human view/ }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-view', 'agent');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('homepage — theme', () => {
  test('is light by default and the toggle switches to dark', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).not.toHaveClass(/\blight\b/);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  });
});

test.describe('homepage — thumb-index rail (1440)', () => {
  test('shows the AGENTS tab first, then one tab per category', async ({ page }) => {
    await page.goto('/');
    const rail = human(page).locator('div.lg\\:flex').filter({ has: page.getByRole('navigation', { name: 'Categories' }) }).first();
    await expect(rail).toBeVisible();
    const first = rail.locator(':scope > *').first();
    await expect(first).toContainText('AGENTS');
    await expect(first).toContainText('text only');
    const tabs = rail.getByRole('navigation', { name: 'Categories' }).getByRole('link');
    await expect(tabs).toHaveCount(CATEGORIES.length);
    expect(await tabs.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(CATEGORIES.map((c) => c.name));
    // Rail sits inside the viewport, not over content off-screen.
    const box = await rail.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(1440);
  });

  for (const { name, slug } of CATEGORIES) {
    test(`rail tab "${name}" links to a live /categories/${slug}`, async ({ page }) => {
      await page.goto('/');
      const tab = page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name, exact: true });
      await expect(tab).toBeVisible();
      await expect(tab).toHaveAttribute('href', `/categories/${slug}`);
      const res = await page.request.get(`/categories/${slug}`, { headers: UA });
      expect(res.status()).toBe(200);
    });
  }
});

test.describe('homepage — listings', () => {
  test('Top Agents rows link to real listing pages and match the count', async ({ page }) => {
    const data = await getJson(page, '/agents.json');
    const slugs = new Set(data.agents.map((a) => a.slug));
    await page.goto('/');
    const section = human(page).locator('section[aria-labelledby="top-agents"]');
    const count = Number((await section.locator('.dir-bar span').first().textContent()).replace(/\D/g, ''));
    const rows = section.locator('a[href^="/agents/"]');
    await expect(rows).toHaveCount(count);
    expect(count).toBe(6); // HOMEPAGE_SLOTS
    const hrefs = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    for (const h of hrefs) expect(slugs, `${h} is a published listing`).toContain(h.replace('/agents/', ''));
    await expect(rows.first()).toContainText("Editor's Pick");
    const res = await page.request.get(hrefs[0], { headers: UA });
    expect(res.status()).toBe(200);
  });

  test('Top Agents follows the curated placements in site.json', async ({ page }) => {
    const placements = JSON.parse(readFileSync(`${REPO}/content/site.json`, 'utf8')).homepageFeatured;
    await page.goto('/');
    const hrefs = await human(page).locator('section[aria-labelledby="top-agents"] a[href^="/agents/"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href').replace('/agents/', '')));
    expect(hrefs).toEqual(placements.slice(0, 6));
  });

  // content/agents/barnir-hired.json: featured: true, sponsorLabel "Sponsored"
  // (commit eae35d6: "Featured as a paid placement, disclosed with a Sponsored label").
  test('Barnir Hired appears as a featured listing with its Sponsored label', async ({ page }) => {
    await page.goto('/');
    const row = human(page).locator('section[aria-labelledby="top-agents"] a[href="/agents/barnir-hired"]');
    await expect(row, 'Barnir Hired row in Top Agents').toBeVisible();
    await expect(row.getByText('Sponsored', { exact: true })).toBeVisible();
  });

  test('Browse by Category lists every category with live links', async ({ page }) => {
    await page.goto('/');
    const section = human(page).locator('section[aria-labelledby="browse-categories"]');
    await expect(section.locator('.dir-bar')).toContainText(`· ${CATEGORIES.length}`);
    const hrefs = await section.locator('a[href^="/categories/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(CATEGORIES.map((c) => `/categories/${c.slug}`));
    await expect(section.getByRole('link', { name: /All categories/ })).toHaveAttribute('href', '/categories');
  });
});

test.describe('homepage — official platforms', () => {
  async function officialFromApi(page) {
    const data = await getJson(page, '/agents.json');
    const official = data.agents.filter((a) => a.official && a.officialVendor);
    return { vendors: new Set(official.map((a) => a.officialVendor)), total: new Set(official.map((a) => a.slug)).size };
  }

  test('"Plus N more vendors" N = vendor groups minus those shown', async ({ page }) => {
    const { vendors, total } = await officialFromApi(page);
    await page.goto('/');
    const section = human(page).locator('section[aria-labelledby="official-platforms"]');
    const shownGroups = section.locator('h3');
    const shown = await shownGroups.count();
    expect(shown).toBe(Math.min(VENDORS_SHOWN, vendors.size));
    const expectedMore = vendors.size - shown;
    const more = section.getByRole('link', { name: /Plus \d+ more vendors\./ });
    await expect(more).toContainText(`Plus ${expectedMore} more vendors.`);
    await expect(more).toContainText(`(${total} from ${vendors.size} vendors)`);
    await expect(more).toHaveAttribute('href', '/browse?official=1');
  });

  test('section header counts match the API and vendor links resolve', async ({ page }) => {
    const { vendors, total } = await officialFromApi(page);
    await page.goto('/');
    const section = human(page).locator('section[aria-labelledby="official-platforms"]');
    await expect(section.getByText(`from ${vendors.size} major vendors`)).toBeVisible();
    await expect(section.getByRole('link', { name: new RegExp(`^All ${total} official`) })).toHaveAttribute('href', '/browse?official=1');
    const names = await section.locator('h3').allTextContents();
    for (const n of names) expect(vendors, `${n} is an official vendor`).toContain(n.trim());
    const res = await page.request.get('/browse?official=1', { headers: UA });
    expect(res.status()).toBe(200);
  });
});

test.describe('homepage — health', () => {
  test('every unique internal link on the page answers GET without 4xx/5xx', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/');
    const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((e) => e.href));
    const internal = [...new Set(hrefs
      .map((h) => new URL(h))
      .filter((u) => u.host === 'agentswitchboard.dev')
      .map((u) => u.pathname + u.search))];
    expect(internal.length).toBeGreaterThan(20);
    const bad = [];
    const queue = [...internal];
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const path = queue.shift();
        const res = await page.request.get(path, { headers: UA, maxRedirects: 5 });
        if (res.status() >= 400) bad.push(`${path} -> ${res.status()}`);
      }
    }));
    expect(bad, `checked ${internal.length} links`).toEqual([]);
  });

  test('loads with no app console errors or page errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // Analytics beacons are aborted by the harness guard; that is not the app.
      if (/_vercel\/(speed-)?insights|sentry|ERR_FAILED|net::ERR_/i.test(t) || /insights/.test(m.location()?.url ?? '')) return;
      errors.push(t);
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    const res = await page.goto('/', { waitUntil: 'networkidle' });
    expect(res.status()).toBe(200);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});

test.describe('homepage — mobile (375)', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('rail is hidden and the page does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Categories' })).toBeHidden();
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw).toBeLessThanOrEqual(cw);
  });
});
