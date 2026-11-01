// Stacks: the /stacks index, every /stacks/<slug> page (content/stacks.json via
// lib/stacks.ts), their share cards, GET /api/stacks, the stack of the week on
// the homepage and on its drop page, and the 404s for unknown stacks. Each
// listing in a stack is checked against its own API record.
// Read-only: only GETs (via fetch at collection time, page.goto and page.request).
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (stacks)' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// GET /api/stacks drives the parametrized tests: every stack, in the order /stacks shows them.
const API = await (await fetch(`${BASE}/api/stacks`, { headers: UA })).json();
const STACKS = API.stacks;
const WEEK = STACKS.find((s) => s.slug === API.stackOfTheWeek);

/** lib/utils.ts formatDay: "2026-10-31" → "Oct 31, 2026". */
const day = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const human = (page) => page.locator('.human-only');
const rows = (page) => human(page).locator('section[aria-labelledby="in-this-stack"] ol > li');
const weekBox = (page) => page.locator('main .human-only').getByRole('link', { name: /^Stack of the week:/ });

async function itemList(page) {
  const lists = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((e) => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter((j) => j && j['@type'] === 'ItemList'));
  expect(lists).toHaveLength(1);
  return lists[0];
}

/** The analytics script is blocked (fixtures.mjs), so events wait in its queue. */
function events(page, name) {
  return page.evaluate((n) => (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === n).map(([, e]) => e.data), name);
}

async function expectCard(page, url) {
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
  const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content');
  expect(og).toBe(tw);
  expect(og).toMatch(new RegExp(`^${escapeRe(`${ORIGIN}${url}`)}\\?v=[0-9a-f]{8}$`));
  const card = await page.request.get(og.replace(ORIGIN, ''), { headers: UA });
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toContain('image/png');
  const buf = await card.body();
  expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
}

test('the sitemap lists /stacks and every stack page', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml', { headers: UA })).text();
  expect(xml).toContain(`<loc>${ORIGIN}/stacks</loc>`);
  const slugs = [...xml.matchAll(/\/stacks\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
  expect(slugs.sort()).toEqual(STACKS.map((s) => s.slug).sort());
});

test.describe('GET /api/stacks', () => {
  test('lists every stack, the stack of the week first, each with 2 to 8 listings and why each is there', () => {
    expect(API.total).toBe(STACKS.length);
    expect(new Set(STACKS.map((s) => s.slug)).size).toBe(STACKS.length);
    expect(WEEK, 'there is a stack of the week').toBeTruthy();
    expect(STACKS[0]).toBe(WEEK);
    expect(WEEK.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const s of STACKS) {
      expect(s.url).toBe(`${ORIGIN}/stacks/${s.slug}`);
      expect(s.title, s.slug).not.toBe('');
      expect(s.promise, s.slug).not.toBe('');
      expect(s.items.length, s.slug).toBeGreaterThanOrEqual(2);
      expect(s.items.length, s.slug).toBeLessThanOrEqual(8);
      expect(new Set(s.items.map((i) => i.slug)).size, s.slug).toBe(s.items.length);
      for (const item of s.items) expect(item.why, `${s.slug}: ${item.slug}`).not.toBe('');
    }
  });

  test('every listing in a stack matches its own /api/agents record', async ({ request }) => {
    const items = new Map(STACKS.flatMap((s) => s.items).map((i) => [i.slug, i]));
    for (const [slug, item] of items) {
      const res = await request.get(`/api/agents/${slug}`, { headers: UA });
      expect(res.status(), slug).toBe(200);
      const { name, url, iconUrl, accessMethods, official, verified, authType } = await res.json();
      expect(item, slug).toMatchObject({ name, url, iconUrl, accessMethods, official, verified, authType });
    }
  });

  test('GET /api/stacks/<slug> returns the same stack; an unknown slug is a JSON 404', async ({ request }) => {
    for (const s of STACKS) {
      const res = await request.get(`/api/stacks/${s.slug}`, { headers: UA });
      expect(res.status(), s.slug).toBe(200);
      expect(await res.json()).toEqual(s);
    }
    const res = await request.get('/api/stacks/not-a-real-stack', { headers: UA });
    expect(res.status()).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'not_found' });
  });

  test('allows any origin', async ({ request }) => {
    for (const path of ['/api/stacks', `/api/stacks/${WEEK.slug}`]) {
      const res = await request.get(path, { headers: { ...UA, origin: 'https://example.com' } });
      expect(res.headers()['access-control-allow-origin'], path).toBe('*');
    }
  });
});

test.describe('/stacks index', () => {
  test('lists every stack, the stack of the week first, each row linking its page', async ({ page }) => {
    const res = await page.goto('/stacks');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Stacks');
    await expect(page).toHaveTitle(/^Stacks \|/);
    const hrefs = await human(page).locator('section a[href^="/stacks/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(STACKS.map((s) => `/stacks/${s.slug}`));
    const week = human(page).locator('section[aria-labelledby="stack-of-the-week"]');
    await expect(week.getByRole('link')).toHaveAttribute('href', `/stacks/${WEEK.slug}`);
    await expect(week).toContainText(WEEK.title);
    await expect(week).toContainText(`For the ${day(WEEK.week)} drop`);
  });

  test('each row shows the tool count, an icon per listing and the promise', async ({ page }) => {
    await page.goto('/stacks');
    for (const s of STACKS) {
      const row = human(page).locator(`a[href="/stacks/${s.slug}"]`);
      await expect(row, s.slug).toContainText(`${s.items.length} tools`);
      await expect(row.locator('.agent-icon'), s.slug).toHaveCount(s.items.length);
      await expect(row, s.slug).toContainText(s.promise);
    }
  });

  test('clicking a stack opens it', async ({ page }) => {
    const target = STACKS[STACKS.length - 1];
    await page.goto('/stacks');
    await human(page).locator(`a[href="/stacks/${target.slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/stacks/${target.slug}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target.title);
  });

  test('canonical and share card: /stacks has its own versioned PNG', async ({ page }) => {
    await page.goto('/stacks');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/stacks`);
    await expectCard(page, '/stacks/card.png');
  });

  test('text-only view lists every stack in the same order', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/stacks');
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(human(page).first()).toBeHidden();
    const hrefs = await agentView.locator('a.agent-row[href^="/stacks/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(STACKS.map((s) => `/stacks/${s.slug}`));
  });
});

test.describe('every stack page', () => {
  for (const stack of STACKS) {
    test(`/stacks/${stack.slug}: its title, promise and listings in order, each with why it is there`, async ({ page }) => {
      const res = await page.goto(`/stacks/${stack.slug}`);
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(stack.title);
      await expect(page).toHaveTitle(new RegExp(`^${escapeRe(stack.title)} \\|`));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', stack.url);
      await expect(human(page)).toContainText(stack.promise);
      await expect(human(page)).toContainText(`${stack.items.length} tools`);
      await expect(human(page).locator('section[aria-labelledby="in-this-stack"] .dir-bar')).toContainText(`· ${stack.items.length}`);

      await expect(rows(page)).toHaveCount(stack.items.length);
      const hrefs = await rows(page).locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs).toEqual(stack.items.map((i) => `/agents/${i.slug}`));
      for (const [i, item] of stack.items.entries()) {
        await expect(rows(page).nth(i).locator('h3')).toHaveText(item.name);
        await expect(rows(page).nth(i).locator('p').filter({ hasText: /^Why/ })).toHaveText(`Why ${item.why}`);
      }

      const list = await itemList(page);
      expect(list.name).toBe(stack.title);
      expect(list.numberOfItems).toBe(stack.items.length);
      expect(list.itemListElement.map((e) => e.url)).toEqual(stack.items.map((i) => i.url));

      const drop = human(page).getByRole('link', { name: /drop$/ });
      if (stack.week) await expect(drop).toHaveAttribute('href', `/drops/${stack.week}`);
      else await expect(drop).toHaveCount(0);
    });
  }
});

test.describe('stack page details', () => {
  test('the stack of the week hands out its own versioned share card, a 1200x630 PNG', async ({ page }) => {
    await page.goto(`/stacks/${WEEK.slug}`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expectCard(page, `/stacks/${WEEK.slug}/card.png`);
  });

  test('the Next link walks every stack in order and comes back around', async ({ page }) => {
    test.skip(STACKS.length < 2, 'only one stack');
    await page.goto(`/stacks/${STACKS[0].slug}`);
    for (let i = 1; i <= STACKS.length; i++) {
      const expected = STACKS[i % STACKS.length];
      const next = page.getByRole('navigation', { name: 'More stacks' }).getByRole('link', { name: /^Next:/ });
      await expect(next).toHaveAttribute('href', `/stacks/${expected.slug}`);
      await expect(next).toContainText(expected.title);
      await next.click();
      await expect(page).toHaveURL(new RegExp(`/stacks/${expected.slug}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(expected.title);
    }
    await expect(page.getByRole('navigation', { name: 'More stacks' }).getByRole('link', { name: 'All stacks' })).toHaveAttribute('href', '/stacks');
  });

  test('counts stack_view on load and stack_item_click when a listing is opened', async ({ page }) => {
    const stack = STACKS[1] ?? STACKS[0];
    const item = stack.items[1];
    await page.goto(`/stacks/${stack.slug}`);
    await expect.poll(() => events(page, 'stack_view')).toEqual([{ stack: stack.slug }]);
    await rows(page).nth(1).locator('a').click();
    await expect(page).toHaveURL(new RegExp(`/agents/${item.slug}$`));
    expect(await events(page, 'stack_item_click')).toEqual([{ stack: stack.slug, slug: item.slug }]);
  });

  test('text-only view lists the listings in order with why each is there', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto(`/stacks/${WEEK.slug}`);
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(agentView).toContainText(`/stacks/${WEEK.slug}`);
    const listed = agentView.locator('a.agent-row[href^="/agents/"]');
    expect(await listed.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(WEEK.items.map((i) => `/agents/${i.slug}`));
    for (const [i, item] of WEEK.items.entries()) await expect(listed.nth(i)).toContainText(item.why);
    await expect(agentView.locator(`a[href="/api/stacks/${WEEK.slug}"]`)).toHaveCount(1);
    await expect(agentView.locator(`a[href="/drops/${WEEK.week}"]`)).toHaveCount(1);
  });

  test('no app console errors on /stacks and a stack page', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    for (const path of ['/stacks', `/stacks/${WEEK.slug}`]) await page.goto(path, { waitUntil: 'networkidle' });
    // Aborted analytics beacons are the harness's doing, not the app's.
    expect(errors.filter((t) => !/_vercel|insights|ERR_FAILED|sentry/i.test(t))).toEqual([]);
  });
});

test.describe('unknown stacks', () => {
  test('an unknown stack is the 404 page, and so is its card', async ({ page }) => {
    const res = await page.goto('/stacks/not-a-real-stack');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    const card = await page.request.get('/stacks/not-a-real-stack/card.png', { headers: UA });
    expect(card.status()).toBe(404);
  });
});

test.describe('the stack of the week elsewhere on the site', () => {
  test('the homepage box links the stack of the week with its listings', async ({ page }) => {
    await page.goto('/');
    const box = weekBox(page);
    await expect(box).toHaveAttribute('href', `/stacks/${WEEK.slug}`);
    await expect(box).toContainText(`Stack of the week: ${WEEK.title}`);
    await expect(box).toContainText(`${WEEK.items.length} tools: `);
    for (const item of WEEK.items) await expect(box).toContainText(item.name);
    await box.click();
    await expect(page).toHaveURL(new RegExp(`/stacks/${WEEK.slug}$`));
  });

  test('its drop page links it, and that drop added at least one of its listings', async ({ page }) => {
    await page.goto(`/drops/${WEEK.week}`);
    await expect(weekBox(page)).toHaveAttribute('href', `/stacks/${WEEK.slug}`);
    const added = await human(page).locator('section[aria-labelledby="added"] a[href^="/agents/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(WEEK.items.some((i) => added.includes(`/agents/${i.slug}`))).toBe(true);
  });

  test('a drop without a stack of the week has no box', async ({ page, request }) => {
    const xml = await (await request.get('/sitemap.xml', { headers: UA })).text();
    const weeks = new Set(STACKS.map((s) => s.week).filter(Boolean));
    const other = [...xml.matchAll(/\/drops\/(\d{4}-\d{2}-\d{2})<\/loc>/g)].map((m) => m[1]).find((d) => !weeks.has(d));
    test.skip(!other, 'every drop has a stack of the week');
    await page.goto(`/drops/${other}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`The ${day(other)} drop`);
    await expect(weekBox(page)).toHaveCount(0);
  });

  test('the footer links /stacks', async ({ page }) => {
    await page.goto('/drops');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Stacks', exact: true })).toHaveAttribute('href', '/stacks');
  });

  test('llms.txt, index.md and /for-agents point agents at /stacks and /api/stacks', async ({ page }) => {
    for (const path of ['/llms.txt', '/index.md']) {
      const body = await (await page.request.get(path, { headers: UA })).text();
      expect(body, path).toContain(`${ORIGIN}/stacks`);
      expect(body, path).toContain(`${ORIGIN}/stacks/${WEEK.slug}`);
      expect(body, path).toContain('/api/stacks');
    }
    await page.goto('/for-agents');
    await expect(page.getByRole('link', { name: `${ORIGIN}/stacks` })).toHaveAttribute('href', '/stacks');
    await expect(page.getByRole('main')).toContainText('GET /api/stacks');
  });
});

test.describe('stacks on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('/stacks, a stack page, the homepage and the drop page do not scroll sideways', async ({ page }) => {
    const overflow = [];
    for (const path of ['/stacks', `/stacks/${WEEK.slug}`, '/', `/drops/${WEEK.week}`]) {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (sw > cw + 1) overflow.push(`${path}: scrollWidth ${sw} > ${cw}`);
    }
    expect(overflow).toEqual([]);
  });

  test('the homepage drop and stack boxes put their icons above the text, so it gets the full width', async ({ page }) => {
    await page.goto('/');
    for (const name of [/^Latest drop:/, /^Stack of the week:/]) {
      const box = page.locator('main .human-only').getByRole('link', { name });
      const icons = await box.locator(':scope > span').first().boundingBox();
      const title = await box.locator('.font-extrabold').boundingBox();
      expect(title.y, `${name}: title below the icons`).toBeGreaterThanOrEqual(icons.y + icons.height);
    }
  });
});
