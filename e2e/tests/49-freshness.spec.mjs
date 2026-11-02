// Freshness: /new (every listing added in the last 30 days, grouped by the
// drop that took it in), the New tag on listing cards, the "N new in 30 days"
// link in category headers, and the action and category filters on the
// directory change log at /changelog. lib/freshness.ts decides what is new,
// counting from the day the deployment was built; lib/log-filter.ts filters.
// Read-only: only GETs (via fetch at collection time, page.goto and page.request).
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (live freshness tests)' };

const CATALOG = (await (await fetch(`${BASE}/agents.json`, { headers: UA })).json()).agents;
const NEW_HTML = await (await fetch(`${BASE}/new`, { headers: UA })).text();
// The window's first day, as /new states it in its intro.
const SINCE = NEW_HTML.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/i)?.[1];
const NEW = CATALOG.filter((a) => a.createdAt && a.createdAt.slice(0, 10) >= SINCE);
const NEW_SLUGS = new Set(NEW.map((a) => a.slug));

const human = (page) => page.locator('.human-only');
const stat = (page, label) =>
  human(page).locator('dl').first().locator('div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');
const countIn = async (locator) => Number((await locator.textContent()).replace(/\D/g, ''));

async function itemList(page) {
  const lists = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((e) => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter((j) => j && j['@type'] === 'ItemList'));
  expect(lists).toHaveLength(1);
  return lists[0];
}

test('the sitemap lists /new', async ({ page }) => {
  const res = await page.request.get('/sitemap.xml', { headers: UA });
  expect(await res.text()).toContain(`<loc>${ORIGIN}/new</loc>`);
});

test.describe('/new', () => {
  test('200, h1 "New listings", and it names the first of the 30 days, counted from a recent build', async ({ page }) => {
    const res = await page.goto('/new');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('New listings');
    await expect(page).toHaveTitle(/^New listings/);
    expect(SINCE, 'the intro has a <time datetime> with the first day').toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // The first day is 29 days before the build's; the weekly drop redeploys at least once a week.
    const days = (Date.now() - Date.parse(`${SINCE}T00:00:00Z`)) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(29);
    expect(days, 'no deploy for over two weeks: New tags and /new are going stale').toBeLessThan(29 + 15);
  });

  test('lists exactly the listings /agents.json says were added since that day, each once', async ({ page }) => {
    await page.goto('/new');
    const slugs = (await itemList(page)).itemListElement.map((i) => new URL(i.url).pathname.replace('/agents/', ''));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect([...slugs].sort()).toEqual([...NEW_SLUGS].sort());
    await expect(human(page).locator('section a[href^="/agents/"]')).toHaveCount(NEW.length);
    await expect(stat(page, 'Added')).toHaveText(NEW.length.toLocaleString('en-US'));
    await expect(stat(page, 'Official')).toHaveText(String(NEW.filter((a) => a.official).length));
  });

  test('groups them by drop, newest first, each count matching its cards and each heading linking its drop', async ({ page }) => {
    test.skip(NEW.length === 0, 'nothing was added in the last 30 days');
    await page.goto('/new');
    const ids = await human(page).locator('section[aria-labelledby]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-labelledby')));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.indexOf('since-last-drop'), 'changes since the last drop come first').toBeLessThanOrEqual(0);
    const dates = ids.filter((id) => id !== 'since-last-drop').map((id) => id.replace(/^drop-/, ''));
    expect(dates).toEqual([...dates].sort().reverse());
    for (const id of ids) {
      const section = human(page).locator(`section[aria-labelledby="${id}"]`);
      await expect(section.locator('a[href^="/agents/"]')).toHaveCount(await countIn(section.locator('.dir-bar-count')));
    }
    for (const date of dates) await expect(human(page).locator(`#drop-${date} a`)).toHaveAttribute('href', `/drops/${date}`);
  });

  test('a drop heading opens that drop', async ({ page }) => {
    await page.goto('/new');
    const link = human(page).locator('section h2 a[href^="/drops/"]').first();
    test.skip((await link.count()) === 0, 'nothing new came in with a drop');
    const href = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^The .+ drop$/);
  });

  test('its cards carry no New tag, since every one is new', async ({ page }) => {
    await page.goto('/new');
    await expect(human(page).locator('.new-tag')).toHaveCount(0);
  });

  test('nor do the cards a drop page lists as added', async ({ page }) => {
    const date = NEW_HTML.match(/id="drop-(\d{4}-\d{2}-\d{2})"/)?.[1];
    test.skip(!date, 'nothing new came in with a drop');
    await page.goto(`/drops/${date}`);
    const added = human(page).locator('section[aria-labelledby="added"]');
    await expect(added.locator('.cmp-card').first()).toBeVisible();
    await expect(added.locator('.new-tag')).toHaveCount(0);
  });

  test('text-only view lists the same listings and the first day', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/new');
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(human(page).first()).toBeHidden();
    await expect(agentView.locator('a[href^="/agents/"]')).toHaveCount(NEW.length);
    await expect(agentView).toContainText(`since ${SINCE}`);
  });

  test('hands out its own versioned share card, a 1200x630 PNG', async ({ page }) => {
    await page.goto('/new');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/new`);
    const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content');
    expect(tw).toMatch(/^https:\/\/agentswitchboard\.dev\/new\/card\.png\?v=[0-9a-f]{8}$/);
    expect(tw).toBe(og);
    const card = await page.request.get(new URL(tw).pathname + new URL(tw).search, { headers: UA });
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toContain('image/png');
    const buf = await card.body();
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
  });
});

test.describe('the New tag on listing cards', () => {
  test('on /browse, every listing added since the first day is tagged New and no other is', async ({ page }) => {
    await page.goto('/browse?sort=newest');
    const cards = await human(page).locator('.cmp-card').evaluateAll((els) =>
      els.map((el) => ({
        slug: el.querySelector('a[href^="/agents/"]').getAttribute('href').replace('/agents/', ''),
        tagged: !!el.querySelector('.new-tag'),
      })));
    expect(cards.length).toBe(CATALOG.length);
    const wrong = cards.filter((c) => c.tagged !== NEW_SLUGS.has(c.slug)).map((c) => `${c.slug}: ${c.tagged ? 'tagged' : 'not tagged'}`);
    expect(wrong).toEqual([]);
  });

  test('the newest listing\'s card reads New beside its other labels', async ({ page }) => {
    test.skip(NEW.length === 0, 'nothing was added in the last 30 days');
    await page.goto('/browse?sort=newest');
    const first = human(page).locator('.cmp-card').first();
    await expect(first.locator('.new-tag')).toHaveText(/^new$/i);
    await expect(first.locator('.new-tag')).toBeVisible();
  });
});

test.describe('category freshness', () => {
  // The category with the most new listings, and one with none if there is one.
  const byCategory = new Map();
  for (const a of CATALOG) for (const c of a.categories) byCategory.set(c, [...(byCategory.get(c) ?? []), a]);
  const ranked = [...byCategory].map(([slug, agents]) => [slug, agents.filter((a) => NEW_SLUGS.has(a.slug)).length]).sort((a, b) => b[1] - a[1]);
  const [BUSY, BUSY_NEW] = ranked[0] ?? [];
  const QUIET = ranked.find(([, n]) => n === 0)?.[0];

  test('the header says how many listings are new and links them newest first; the page tags the same number', async ({ page }) => {
    test.skip(!BUSY_NEW, 'nothing was added in the last 30 days');
    await page.goto(`/categories/${BUSY}`);
    const link = human(page).getByRole('link', { name: /^\d+ new in 30 days$/ });
    await expect(link).toHaveText(`${BUSY_NEW} new in 30 days`);
    await expect(link).toHaveAttribute('href', `/browse?category=${BUSY}&sort=newest`);
    await expect(human(page).locator('.new-tag')).toHaveCount(BUSY_NEW);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/browse\\?category=${BUSY}&sort=newest$`));
    const firstSlugs = await human(page).locator('.cmp-card > a').evaluateAll((els, n) =>
      els.slice(0, n).map((e) => e.getAttribute('href').replace('/agents/', '')), BUSY_NEW);
    expect(firstSlugs.every((s) => NEW_SLUGS.has(s)), 'the new listings come first').toBe(true);
  });

  test('a category with nothing new has no freshness link', async ({ page }) => {
    test.skip(!QUIET, 'every category has something new');
    await page.goto(`/categories/${QUIET}`);
    await expect(human(page).getByRole('link', { name: /new in 30 days/ })).toHaveCount(0);
  });
});

test.describe('/changelog directory filters', () => {
  const rows = (page) => page.locator('#directory-log > li');
  const visibleCount = (page) => rows(page).evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length);
  const visibleActions = (page) =>
    rows(page).evaluateAll((els) => [...new Set(els.filter((e) => e.offsetParent !== null).map((e) => e.dataset.action))]);
  const chip = (page, name) => page.getByRole('group', { name: 'Show changes' }).getByRole('button', { name: new RegExp(`^${name}\\b`) });

  test('Added shows only additions, says how many, and keeps the choice in the URL', async ({ page }) => {
    await page.goto('/changelog');
    const total = await rows(page).count();
    await expect(chip(page, 'All')).toHaveAttribute('aria-pressed', 'true');
    await chip(page, 'Added').click();
    await expect(page).toHaveURL(/\/changelog\?action=added$/);
    await expect(chip(page, 'Added')).toHaveAttribute('aria-pressed', 'true');
    const added = await page.locator('#directory-log > li[data-action="added"]').count();
    expect(await visibleCount(page)).toBe(added);
    expect(await visibleActions(page)).toEqual(['added']);
    await expect(page.getByText(`Showing ${added.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} changes.`)).toBeVisible();
    await chip(page, 'All').click();
    await expect(page).toHaveURL(/\/changelog$/);
    expect(await visibleCount(page)).toBe(total);
  });

  test('a category narrows the log to its listings, alone or with an action', async ({ page }) => {
    await page.goto('/changelog');
    const select = page.locator('#changelog-category');
    const slug = await select.locator('option').nth(1).getAttribute('value');
    await select.selectOption(slug);
    await expect(page).toHaveURL(new RegExp(`/changelog\\?category=${slug}$`));
    const inCategory = await page.locator(`#directory-log > li[data-cats~="${slug}"]`).count();
    expect(inCategory).toBeGreaterThan(0);
    expect(await visibleCount(page)).toBe(inCategory);
    await chip(page, 'Updated').click();
    await expect(page).toHaveURL(new RegExp(`/changelog\\?category=${slug}&action=updated$`));
    expect(await visibleCount(page)).toBe(await page.locator(`#directory-log > li[data-action="updated"][data-cats~="${slug}"]`).count());
  });

  test('a filtered link opens filtered, and its chips count within the category', async ({ page }) => {
    const res = await page.request.get('/api/categories', { headers: UA });
    const { slug } = (await res.json()).categories[0];
    await page.goto(`/changelog?action=added&category=${slug}`);
    await expect(chip(page, 'Added')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#changelog-category')).toHaveValue(slug);
    const expected = await page.locator(`#directory-log > li[data-action="added"][data-cats~="${slug}"]`).count();
    expect(await visibleCount(page)).toBe(expected);
    await expect(chip(page, 'Added')).toContainText(expected.toLocaleString('en-US'));
  });

  test('an unknown action or category in the link shows the whole log', async ({ page }) => {
    await page.goto('/changelog?action=deleted&category=not-a-category');
    await expect(chip(page, 'All')).toHaveAttribute('aria-pressed', 'true');
    expect(await visibleCount(page)).toBe(await rows(page).count());
  });

  test('the filters are keyboard operable', async ({ page }) => {
    await page.goto('/changelog');
    await chip(page, 'Removed').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/action=removed/);
    expect(await visibleActions(page)).toEqual(['removed']);
  });
});

test.describe('/changelog with JavaScript off', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the whole log and no filter buttons that would do nothing', async ({ page }) => {
    await page.goto('/changelog?action=added');
    await expect(page.getByRole('group', { name: 'Show changes' })).toHaveCount(0);
    const rows = page.locator('#directory-log > li');
    expect(await rows.evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length)).toBe(await rows.count());
  });
});

test.describe('freshness elsewhere on the site', () => {
  test('the homepage links /new with how many listings are new', async ({ page }) => {
    test.skip(NEW.length === 0, 'the row only shows when something is new');
    await page.goto('/');
    const row = human(page).getByRole('link', { name: /^New listings/ });
    await expect(row).toHaveAttribute('href', '/new');
    await expect(row).toContainText(`+${NEW.length.toLocaleString('en-US')} in 30 days`);
  });

  test('/drops and /changelog link /new', async ({ page }) => {
    for (const path of ['/drops', '/changelog']) {
      await page.goto(path);
      await expect(human(page).locator('a[href="/new"]').first(), path).toBeVisible();
    }
  });

  test('llms.txt, index.md and /for-agents point agents at /new', async ({ page }) => {
    for (const path of ['/llms.txt', '/index.md']) {
      const res = await page.request.get(path, { headers: UA });
      expect(res.status(), path).toBe(200);
      const body = await res.text();
      expect(body, path).toContain(`${ORIGIN}/new`);
      expect(body, path).toContain(`${NEW.length} since ${SINCE}`);
    }
    await page.goto('/for-agents');
    await expect(page.getByRole('link', { name: 'https://agentswitchboard.dev/new' })).toHaveAttribute('href', '/new');
  });

  test('no app console errors on /new and /changelog while filtering', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await page.goto('/new', { waitUntil: 'networkidle' });
    await page.goto('/changelog', { waitUntil: 'networkidle' });
    await page.getByRole('group', { name: 'Show changes' }).getByRole('button', { name: /^Removed\b/ }).click();
    await page.locator('#changelog-category').selectOption({ index: 1 });
    // Aborted analytics beacons are the harness's doing, not the app's.
    expect(errors.filter((t) => !/_vercel|insights|ERR_FAILED|sentry/i.test(t))).toEqual([]);
  });
});

test.describe('freshness on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('/new and /changelog do not scroll sideways', async ({ page }) => {
    const overflow = [];
    for (const path of ['/new', '/changelog']) {
      await page.goto(path);
      if (path === '/changelog') await expect(page.getByRole('group', { name: 'Show changes' })).toBeVisible();
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (sw > cw + 1) overflow.push(`${path}: scrollWidth ${sw} > ${cw}`);
    }
    expect(overflow).toEqual([]);
  });

  test('the filter chips are at least 44px tall', async ({ page }) => {
    await page.goto('/changelog');
    const chips = page.getByRole('group', { name: 'Show changes' }).getByRole('button');
    await expect(chips).toHaveCount(4);
    const heights = await chips.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    expect(heights.every((h) => h >= 44)).toBe(true);
  });
});
