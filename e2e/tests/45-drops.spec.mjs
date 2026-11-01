// Weekly drops: the /drops index, every /drops/<date> page (lib/drops.ts groups
// content/changelog.json into batches), their share cards, the homepage
// "Latest drop" box and the 404 for unknown dates.
// Read-only: only GETs (via fetch at collection time, page.goto and page.request).
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (live drops tests)' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The drop dates drive the parametrized tests; app/sitemap.ts lists every one.
const sitemap = await (await fetch(`${BASE}/sitemap.xml`, { headers: UA })).text();
const DROPS = [...sitemap.matchAll(/\/drops\/(\d{4}-\d{2}-\d{2})<\/loc>/g)].map((m) => m[1]).sort().reverse();
const LATEST = DROPS[0];
const OLDEST = DROPS[DROPS.length - 1];

/** lib/utils.ts formatDay: "2026-10-31" → "Oct 31, 2026". */
const day = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const human = (page) => page.locator('.human-only');
const section = (page, id) => human(page).locator(`section[aria-labelledby="${id}"]`);
const stat = (page, label) =>
  human(page).locator('dl').first().locator('div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');

async function itemList(page) {
  const lists = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((e) => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter((j) => j && j['@type'] === 'ItemList'));
  expect(lists).toHaveLength(1);
  return lists[0];
}

test('the sitemap lists /drops and every drop page', () => {
  expect(sitemap).toContain(`<loc>${ORIGIN}/drops</loc>`);
  expect(DROPS.length).toBeGreaterThan(0);
  expect(new Set(DROPS).size).toBe(DROPS.length);
});

test.describe('/drops index', () => {
  test('lists every drop newest first, each row linking its page', async ({ page }) => {
    const res = await page.goto('/drops');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weekly drops');
    await expect(page).toHaveTitle(/^Weekly drops/);
    const all = section(page, 'all-drops');
    await expect(all.locator('.dir-bar')).toContainText(`· ${DROPS.length}`);
    const hrefs = await all.locator('a[href^="/drops/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(DROPS.map((d) => `/drops/${d}`));
    await expect(all.locator(`a[href="/drops/${LATEST}"]`)).toContainText(day(LATEST));
  });

  test('"Since the last drop" lists the pending changes, or says there are none since the latest drop', async ({ page }) => {
    await page.goto('/drops');
    const since = section(page, 'since-last-drop');
    const n = Number((await since.locator('.dir-bar-count').textContent()).replace(/\D/g, ''));
    if (n === 0) await expect(since).toContainText(`no listing has changed since the ${day(LATEST)} drop`);
    else await expect(since.locator('li')).toHaveCount(n);
  });

  test('the intro links the directory change log on /changelog', async ({ page }) => {
    await page.goto('/drops');
    const link = human(page).getByRole('link', { name: 'directory change log' });
    await expect(link).toHaveAttribute('href', '/changelog#directory-changes');
    await link.click();
    await expect(page).toHaveURL(/\/changelog#directory-changes$/);
    await expect(page.locator('#directory-changes')).toBeVisible();
  });

  test('clicking a drop row opens that drop', async ({ page }) => {
    await page.goto('/drops');
    await section(page, 'all-drops').locator(`a[href="/drops/${LATEST}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/drops/${LATEST}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`The ${day(LATEST)} drop`);
  });

  test('text-only view lists every drop', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/drops');
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(human(page).first()).toBeHidden();
    await expect(agentView.locator('a[href^="/drops/"]')).toHaveCount(DROPS.length);
  });

  test('canonical and share card: /drops carries the site card', async ({ page }) => {
    await page.goto('/drops');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/drops`);
    await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute('content', /^https:\/\/agentswitchboard\.dev\/card\.png\?v=[0-9a-f]{8}$/);
  });
});

test.describe('every drop page', () => {
  for (const date of DROPS) {
    test(`${date}: 200, h1 "The ${day(date)} drop", and the counts agree with the lists`, async ({ page }) => {
      const res = await page.goto(`/drops/${date}`);
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`The ${day(date)} drop`);
      await expect(page).toHaveTitle(new RegExp(`^${escapeRe(day(date))} drop: `));
      const added = Number(await stat(page, 'Added').textContent());
      const updated = Number(await stat(page, 'Updated').textContent());
      const removed = Number(await stat(page, 'Removed').textContent());
      expect(added + updated + removed, 'a drop always changes something').toBeGreaterThan(0);
      // Additions since removed from the directory are counted but have no card.
      const cards = section(page, 'added').locator('a[href^="/agents/"]');
      const list = await itemList(page);
      await expect(cards).toHaveCount(list.numberOfItems);
      expect(list.numberOfItems).toBeLessThanOrEqual(added);
      await expect(section(page, 'updated').locator('li')).toHaveCount(updated);
      await expect(section(page, 'removed').locator('li')).toHaveCount(removed);
    });
  }
});

test.describe('drop page details', () => {
  test('the latest drop hands out its own versioned share card, a 1200x630 PNG', async ({ page }) => {
    await page.goto(`/drops/${LATEST}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/drops/${LATEST}`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content');
    expect(tw).toMatch(new RegExp(`^https://agentswitchboard\\.dev/drops/${LATEST}/card\\.png\\?v=[0-9a-f]{8}$`));
    expect(tw).toBe(og);
    const card = await page.request.get(new URL(tw).pathname + new URL(tw).search, { headers: UA });
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toContain('image/png');
    const buf = await card.body();
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  test('older/newer links walk the drops in order', async ({ page }) => {
    await page.goto(`/drops/${LATEST}`);
    const nav = page.getByRole('navigation', { name: 'Other drops' });
    await expect(nav.locator('a[rel="next"]')).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'All drops' })).toHaveAttribute('href', '/drops');
    test.skip(DROPS.length < 2, 'only one drop so far');
    const older = nav.locator('a[rel="prev"]');
    await expect(older).toHaveAttribute('href', `/drops/${DROPS[1]}`);
    await expect(older).toContainText(`Older: ${day(DROPS[1])}`);
    await older.click();
    await expect(page).toHaveURL(new RegExp(`/drops/${DROPS[1]}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`The ${day(DROPS[1])} drop`);
    await expect(page.getByRole('navigation', { name: 'Other drops' }).locator('a[rel="next"]')).toHaveAttribute('href', `/drops/${LATEST}`);
  });

  test('the oldest drop has no older link', async ({ page }) => {
    await page.goto(`/drops/${OLDEST}`);
    const nav = page.getByRole('navigation', { name: 'Other drops' });
    await expect(nav.locator('a[rel="prev"]')).toHaveCount(0);
    if (DROPS.length > 1) await expect(nav.locator('a[rel="next"]')).toHaveAttribute('href', `/drops/${DROPS[DROPS.length - 2]}`);
  });

  test('listing cards on the latest drop open real listing pages', async ({ page }) => {
    await page.goto(`/drops/${LATEST}`);
    const cards = section(page, 'added').locator('a[href^="/agents/"]');
    const n = Math.min(4, await cards.count());
    test.skip(n === 0, 'the latest drop added no listings that are still listed');
    for (let i = 0; i < n; i++) {
      const href = await cards.nth(i).getAttribute('href');
      const name = (await cards.nth(i).locator('h3').textContent()).trim();
      const res = await page.request.get(href, { headers: UA });
      expect(res.status(), href).toBe(200);
      expect(await res.text(), href).toContain(name.replace(/&/g, '&amp;'));
    }
  });

  test('text-only view of the latest drop lists the same additions', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto(`/drops/${LATEST}`);
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(agentView).toContainText(`/drops/${LATEST}`);
    const list = await itemList(page);
    await expect(agentView.locator('a[href^="/agents/"]')).toHaveCount(list.numberOfItems);
  });

  test('no app console errors on /drops and the latest drop', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    for (const path of ['/drops', `/drops/${LATEST}`]) await page.goto(path, { waitUntil: 'networkidle' });
    // Aborted analytics beacons are the harness's doing, not the app's.
    expect(errors.filter((t) => !/_vercel|insights|ERR_FAILED|sentry/i.test(t))).toEqual([]);
  });
});

test.describe('unknown drops', () => {
  for (const path of ['/drops/2020-01-01', '/drops/not-a-date']) {
    test(`${path} returns the 404 page`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    });
  }

  test('a card for an unknown drop is a 404, not an image', async ({ page }) => {
    const res = await page.request.get('/drops/2020-01-01/card.png', { headers: UA });
    expect(res.status()).toBe(404);
  });
});

test.describe('drops elsewhere on the site', () => {
  test('homepage "Latest drop" box links the latest drop with its count', async ({ page }) => {
    await page.goto(`/drops/${LATEST}`);
    const added = Number(await stat(page, 'Added').textContent());
    const listed = (await itemList(page)).numberOfItems;
    await page.goto('/');
    const box = page.locator('main .human-only').getByRole('link', { name: /^Latest drop:/ });
    test.skip(listed === 0, 'the box only shows when the latest drop added listings that are still listed');
    await expect(box).toHaveAttribute('href', `/drops/${LATEST}`);
    await expect(box).toContainText(`Latest drop: +${added.toLocaleString('en-US')} agent${added === 1 ? '' : 's'}`);
    await expect(box).toContainText(day(LATEST));
    await box.click();
    await expect(page).toHaveURL(new RegExp(`/drops/${LATEST}$`));
  });

  test('llms.txt and index.md point agents at /drops and the latest drop', async ({ page }) => {
    for (const path of ['/llms.txt', '/index.md']) {
      const res = await page.request.get(path, { headers: UA });
      expect(res.status(), path).toBe(200);
      const body = await res.text();
      expect(body, path).toContain(`${ORIGIN}/drops`);
      expect(body, path).toContain(`${ORIGIN}/drops/${LATEST}`);
    }
  });
});

test.describe('drops on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('/drops and the latest drop do not scroll sideways', async ({ page }) => {
    const overflow = [];
    for (const path of ['/drops', `/drops/${LATEST}`]) {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (sw > cw + 1) overflow.push(`${path}: scrollWidth ${sw} > ${cw}`);
    }
    expect(overflow).toEqual([]);
  });
});
