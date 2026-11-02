// The Switchboard: /switchboard (app/switchboard/page.tsx, lib/board.ts), every
// listing as a jack in a panel for its primary category, Official ones filled
// in and the latest drop's lit; the readout (components/BoardEvents.tsx), the
// toggles (components/BoardControls.tsx), the text-only view, the share card
// and the links to the board from the latest drop and the agent docs.
// Read-only: GETs only.
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (switchboard)' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACCESS = { api: 'API', mcp: 'MCP', cli: 'CLI', 'browser-extension': 'Extension' };

const get = (path) => fetch(`${BASE}${path}`, { headers: UA });
const { total, agents: catalog } = await (await get('/agents.json')).json();
const { categories } = await (await get('/api/categories')).json();
const sitemap = await (await get('/sitemap.xml')).text();
const LATEST = [...sitemap.matchAll(/\/drops\/(\d{4}-\d{2}-\d{2})<\/loc>/g)].map((m) => m[1]).sort().reverse()[0];

// The latest drop's additions that are still listed: its page's ItemList.
const dropHtml = await (await get(`/drops/${LATEST}`)).text();
const LIT = new Set(
  [...dropHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .find((j) => j['@type'] === 'ItemList')
    .itemListElement.map((e) => e.url.split('/agents/')[1])
);

/** lib/board.ts boardOf: a panel per category in the categories' order, each listing in its primary one, oldest first. */
const PANELS = categories
  .map((c) => ({
    slug: c.slug,
    name: c.name,
    jacks: catalog
      .filter((a) => a.categories[0] === c.slug)
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.name.localeCompare(b.name)),
  }))
  .filter((p) => p.jacks.length > 0);
const JACKS = PANELS.flatMap((p) => p.jacks);
const LIT_IN_ORDER = JACKS.filter((a) => LIT.has(a.slug));
const OFFICIAL = JACKS.filter((a) => a.official).length;
const UNIQUE = JACKS.filter((a) => JACKS.filter((b) => b.name === a.name).length === 1);
/** A jack to point at: lit and Official if there is one, so the readout shows everything. */
const PICK = UNIQUE.find((a) => a.official && LIT.has(a.slug)) ?? UNIQUE.find((a) => LIT.has(a.slug)) ?? UNIQUE[0];

/** lib/utils.ts formatDay: "2026-10-31" → "Oct 31, 2026". */
const day = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const DROP = `the ${day(LATEST)} drop`;
const n = (count, word) => `${count.toLocaleString('en-US')} ${count === 1 ? word : `${word}s`}`;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const human = (page) => page.locator('.human-only');
const board = (page) => page.locator('#board');
const jack = (page, slug) => board(page).locator(`svg a[href="/agents/${slug}"]`);
const readout = (page) => page.locator('.board-readout');
const status = (page) => human(page).locator('p[aria-live="polite"]');
const weekButton = (page) => human(page).getByRole('button', { name: new RegExp(`^Only ${escapeRe(DROP)}`) });
const events = (page, eventName) =>
  page.evaluate((e) => (window.vaq ?? []).filter(([kind, d]) => kind === 'event' && d.name === e).map(([, d]) => d.data), eventName);

/** What the readout says about `a` (components/BoardEvents.tsx). */
const readoutLine = (a) =>
  [
    `${a.name} by ${a.provider}`,
    ...a.accessMethods.map((m) => ACCESS[m] ?? m),
    ...(a.official ? ['Official'] : []),
    ...(LIT.has(a.slug) ? [`in ${DROP}`] : []),
  ].join(' · ');

/** Opens the board once it has hydrated: the readout's prompt only shows then. */
async function openBoard(page, path = '/switchboard') {
  await page.goto(path);
  await expect(readout(page)).toHaveText('Point at a jack, or tap one, to see what it is.');
}

/** Clicks stop short of leaving the page until `window.__leave` is set, after the board has counted them. */
async function stayOnPage(page) {
  await page.evaluate(() =>
    window.addEventListener('click', (e) => {
      if (!window.__leave) e.preventDefault();
    })
  );
}

test('the sitemap lists /switchboard', () => {
  expect(sitemap).toContain(`<loc>${ORIGIN}/switchboard</loc>`);
});

test.describe('the board', () => {
  test('every listing is a jack, in the panel for its primary category, oldest first', async ({ page }) => {
    const res = await page.goto('/switchboard');
    expect(res.status()).toBe(200);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText('The Switchboard');
    const shown = await board(page)
      .locator(':scope > section[data-cat]')
      .evaluateAll((sections) =>
        sections.map((s) => ({
          slug: s.dataset.cat,
          title: s.querySelector('h2').textContent,
          jacks: [...s.querySelectorAll('svg a')].map((a) => a.getAttribute('href')),
        }))
      );
    expect(shown.map((p) => p.slug)).toEqual(PANELS.map((p) => p.slug));
    expect(shown.map((p) => p.title)).toEqual(PANELS.map((p) => `${p.name} · ${p.jacks.length}`));
    expect(shown.map((p) => p.jacks)).toEqual(PANELS.map((p) => p.jacks.map((a) => `/agents/${a.slug}`)));
    expect(JACKS).toHaveLength(total);
  });

  test(`Official listings are filled in, ${DROP} is lit, and the counts add up`, async ({ page }) => {
    await page.goto('/switchboard');
    const kinds = await board(page)
      .locator('svg a')
      .evaluateAll((els) => Object.fromEntries(els.map((a) => [a.getAttribute('href').split('/')[2], a.getAttribute('class') ?? ''])));
    expect(kinds).toEqual(
      Object.fromEntries(JACKS.map((a) => [a.slug, [a.official && 'o', LIT.has(a.slug) && 'l'].filter(Boolean).join(' ')]))
    );

    const stat = (label) =>
      human(page).locator('dl').first().locator('div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');
    await expect(stat('Listings')).toHaveText(total.toLocaleString('en-US'));
    await expect(stat('Official')).toHaveText(OFFICIAL.toLocaleString('en-US'));
    await expect(stat('Lit')).toHaveText(String(LIT.size));
    await expect(stat('Categories')).toHaveText(String(PANELS.length));
    await expect(human(page).locator(`p a[href="/drops/${LATEST}"]`).first()).toHaveText(DROP);
    await expect(human(page).locator('ul.jacks > li')).toHaveText(
      LIT.size > 0 ? ['A listing', 'Official', `Added in ${DROP}`, 'Both'] : ['A listing', 'Official']
    );
  });

  test('each jack is a link named for its listing', async ({ page }) => {
    await page.goto('/switchboard');
    for (const a of [UNIQUE[0], UNIQUE[UNIQUE.length - 1], PICK]) {
      await expect(board(page).getByRole('link', { name: a.name, exact: true })).toHaveAttribute('href', `/agents/${a.slug}`);
    }
  });

  test('the lit jacks light up in turn, unless the visitor asks for reduced motion', async ({ page }) => {
    test.skip(LIT.size === 0, 'the latest drop added nothing still listed');
    await page.goto('/switchboard');
    const circle = (a) => jack(page, a.slug).locator('circle');
    const [first, last] = [LIT_IN_ORDER[0], LIT_IN_ORDER[LIT_IN_ORDER.length - 1]];
    await expect(circle(first)).toHaveCSS('animation-name', 'board-light-up');
    await expect(circle(first)).toHaveCSS('animation-delay', '0s');
    const delay = parseFloat(await circle(last).evaluate((c) => getComputedStyle(c).animationDelay));
    if (LIT.size > 1) expect(delay).toBeGreaterThan(0);
    expect(delay).toBeLessThanOrEqual(1.8);
    await expect(circle(JACKS.find((a) => !LIT.has(a.slug)))).toHaveCSS('animation-name', 'none');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(circle(first)).toHaveCSS('animation-name', 'none');
  });

  test('counts board_view once it has loaded', async ({ page }) => {
    await openBoard(page);
    expect(await events(page, 'board_view')).toEqual([{ listings: total, lit: LIT.size }]);
  });
});

test.describe('the readout', () => {
  test('pointing at a jack shows its name, provider, access methods and a link to it', async ({ page }) => {
    await openBoard(page);
    await jack(page, PICK.slug).hover();
    await expect(readout(page).locator('p')).toHaveText(readoutLine(PICK));
    await expect(readout(page).getByRole('link', { name: `Open ${PICK.name}`, exact: true })).toHaveAttribute('href', `/agents/${PICK.slug}`);
    await expect(jack(page, PICK.slug)).toHaveAttribute('data-on', '');
    expect(page.url()).toMatch(/\/switchboard$/);

    const other = UNIQUE.find((a) => a.slug !== PICK.slug);
    await jack(page, other.slug).hover();
    await expect(readout(page).locator('p')).toHaveText(readoutLine(other));
    await expect(jack(page, PICK.slug)).not.toHaveAttribute('data-on', '');
  });

  test('clicking a jack, or Open in the readout, opens the listing and counts board_jack_click', async ({ page }) => {
    await openBoard(page);
    await stayOnPage(page);
    const data = { slug: PICK.slug, official: PICK.official, lit: LIT.has(PICK.slug) };
    await jack(page, PICK.slug).click();
    await readout(page).getByRole('link', { name: `Open ${PICK.name}`, exact: true }).click();
    expect(await events(page, 'board_jack_click')).toEqual([
      { ...data, from: 'board' },
      { ...data, from: 'readout' },
    ]);
    await page.evaluate(() => {
      window.__leave = true;
    });
    await jack(page, PICK.slug).click();
    await expect(page).toHaveURL(new RegExp(`/agents/${PICK.slug}$`));
  });

  test('the keyboard reaches the jacks and shows each; Skip the board jumps past them', async ({ page }) => {
    await openBoard(page);
    const skip = human(page).getByRole('link', { name: 'Skip the board', exact: true });
    await skip.focus();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('href', `/categories/${PANELS[0].slug}`);
    await page.keyboard.press('Tab');
    const first = PANELS[0].jacks[0];
    await expect(page.locator(':focus')).toHaveAttribute('href', `/agents/${first.slug}`);
    await expect(readout(page).locator('p')).toHaveText(readoutLine(first));
    await expect(page.locator(':focus')).toHaveCSS('outline-style', 'solid');

    await skip.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText(/^Download the board as an image/);
  });
});

test.describe('the toggles', () => {
  test(`"Only ${DROP}" dims every jack it did not add and counts board_week_toggle`, async ({ page }) => {
    test.skip(LIT.size === 0, 'the latest drop added nothing still listed');
    await openBoard(page);
    const button = weekButton(page);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(status(page)).toHaveText(`All ${n(total, 'listing')}.`);
    const unlit = JACKS.find((a) => !LIT.has(a.slug));

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/\/switchboard\?week=1$/);
    await expect(status(page)).toHaveText(`${n(LIT.size, 'listing')} added in ${DROP}.`);
    await expect(jack(page, unlit.slug)).toHaveCSS('opacity', '0.15');
    await expect(jack(page, LIT_IN_ORDER[0].slug)).toHaveCSS('opacity', '1');
    await expect(board(page).locator('.board-panel-title a').first()).toHaveCSS('opacity', '1');

    await button.click();
    await expect(page).toHaveURL(/\/switchboard$/);
    await expect(jack(page, unlit.slug)).toHaveCSS('opacity', '1');
    expect(await events(page, 'board_week_toggle')).toEqual([{ on: true }, { on: false }]);
  });

  test('a category dims the other panels and brings its own into view', async ({ page }) => {
    await openBoard(page);
    const target = PANELS[PANELS.length - 1];
    const lit = target.jacks.filter((a) => LIT.has(a.slug)).length;
    await human(page).locator('#board-category').selectOption(target.slug);
    await expect(page).toHaveURL(new RegExp(`/switchboard\\?category=${target.slug}$`));
    await expect(status(page)).toHaveText(
      `${target.name}: ${n(target.jacks.length, 'listing')}${lit > 0 ? `, ${lit} of them added in ${DROP}` : ''}.`
    );
    const panel = (slug) => board(page).locator(`:scope > [data-cat="${slug}"]`);
    await expect(panel(target.slug)).toHaveCSS('opacity', '1');
    await expect(panel(PANELS[0].slug)).toHaveCSS('opacity', '0.25');
    await expect(panel(target.slug)).toBeInViewport();

    await human(page).locator('#board-category').selectOption('');
    await expect(page).toHaveURL(/\/switchboard$/);
    await expect(panel(PANELS[0].slug)).toHaveCSS('opacity', '1');
  });

  test('a link with both toggles opens them set; an unknown category shows the whole board', async ({ page }) => {
    test.skip(LIT.size === 0, 'the latest drop added nothing still listed');
    const target = PANELS.find((p) => p.jacks.some((a) => LIT.has(a.slug)));
    const lit = target.jacks.filter((a) => LIT.has(a.slug)).length;
    await openBoard(page, `/switchboard?category=${target.slug}&week=1`);
    await expect(human(page).locator('#board-category')).toHaveValue(target.slug);
    await expect(weekButton(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(status(page)).toHaveText(`${target.name}: ${n(lit, 'listing')} added in ${DROP}.`);

    await openBoard(page, '/switchboard?category=no-such-category');
    await expect(human(page).locator('#board-category')).toHaveValue('');
    await expect(status(page)).toHaveText(`All ${n(total, 'listing')}.`);
  });

  test(`the ${LATEST} drop page opens the board with its listings lit`, async ({ page }) => {
    test.skip(LIT.size === 0, 'the latest drop added nothing still listed');
    await page.goto(`/drops/${LATEST}`);
    await human(page).getByRole('link', { name: 'See them lit on the Switchboard', exact: true }).click();
    await expect(page).toHaveURL(/\/switchboard\?week=1$/);
    await expect(weekButton(page)).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the whole board shows as links, without the toggles', async ({ page }) => {
    await page.goto('/switchboard?week=1');
    await expect(board(page).locator('svg a')).toHaveCount(total);
    await expect(human(page).locator('#board-category')).toHaveCount(0);
    await expect(weekButton(page)).toHaveCount(0);
    await expect(readout(page)).toHaveText('Each jack opens its listing.');
    await expect(jack(page, JACKS.find((a) => !LIT.has(a.slug)).slug)).toHaveCSS('opacity', '1');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('the first tap on a jack shows it, the second opens it', async ({ page }) => {
    await openBoard(page);
    await jack(page, PICK.slug).tap();
    await expect(readout(page).locator('p')).toHaveText(readoutLine(PICK));
    expect(page.url()).toMatch(/\/switchboard$/);
    await expect(readout(page)).toBeInViewport();
    await jack(page, PICK.slug).tap();
    await expect(page).toHaveURL(new RegExp(`/agents/${PICK.slug}$`));
  });

  test('the board fits the screen, its jacks at least 24px apart, the readout in view under the header', async ({ page }) => {
    await openBoard(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const [a, b] = await Promise.all([0, 1].map((i) => board(page).locator('svg a').nth(i).boundingBox()));
    expect(b.x - a.x).toBeGreaterThanOrEqual(24);

    const big = PANELS.reduce((x, y) => (y.jacks.length > x.jacks.length ? y : x));
    await jack(page, big.jacks[big.jacks.length - 1].slug).tap();
    await expect(readout(page).locator('p')).toHaveText(readoutLine(big.jacks[big.jacks.length - 1]));
    const [r, h] = await Promise.all([readout(page).boundingBox(), page.locator('header').first().boundingBox()]);
    expect(Math.abs(r.y - (h.y + h.height))).toBeLessThanOrEqual(1);
  });
});

test('text-only view lists every jack as a link, panel by panel', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('viewMode', 'agent');
    } catch {}
  });
  await page.goto('/switchboard');
  const agentView = page.locator('.agent-only');
  await expect(agentView).toBeVisible();
  await expect(human(page).first()).toBeHidden();
  await expect(agentView.locator('.agent-section-title')).toHaveText([...PANELS.map((p) => `${p.slug} · ${p.jacks.length}`), 'more']);
  const hrefs = await agentView.locator('a.agent-row').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs.slice(0, total)).toEqual(JACKS.map((a) => `/agents/${a.slug}`));
  expect(hrefs.slice(total)).toEqual([expect.stringMatching(/^\/switchboard\/card\.png\?v=[0-9a-f]{8}$/), '/categories', `/drops/${LATEST}`]);
  await expect(agentView.locator(`a.agent-row[href="/agents/${PICK.slug}"]`)).toContainText(
    [PICK.provider, ...(PICK.official ? ['official'] : []), ...(LIT.has(PICK.slug) ? ['lit'] : [])].join(' · ')
  );
});

test('the share card is the board as a 1200×630 PNG, and the page offers it as a download', async ({ page }) => {
  await page.goto('/switchboard');
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
  expect(og).toMatch(new RegExp(`^${escapeRe(`${ORIGIN}/switchboard/card.png`)}\\?v=[0-9a-f]{8}$`));
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    `All ${total} listings on Agent Switchboard as jacks on one board${LIT.size > 0 ? `, the ${LIT.size} from the ${day(LATEST)} drop lit` : ''}`
  );
  const download = human(page).getByRole('link', { name: /^Download the board as an image/ });
  await expect(download).toHaveAttribute('href', og.replace(ORIGIN, ''));
  await expect(download).toHaveAttribute('download', 'agent-switchboard.png');

  const card = await page.request.get(og.replace(ORIGIN, ''), { headers: UA });
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toContain('image/png');
  const buf = await card.body();
  expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
});

test('llms.txt, index.md and /for-agents point to the Switchboard and its image', async ({ page, request }) => {
  const llms = await (await request.get('/llms.txt', { headers: UA })).text();
  expect(llms).toContain('every listing on one board: https://agentswitchboard.dev/switchboard (');
  expect(llms).toContain('https://agentswitchboard.dev/switchboard/card.png');
  const md = await (await request.get('/index.md', { headers: UA })).text();
  expect(md).toContain(`[/switchboard](${ORIGIN}/switchboard) — every listing on one board`);
  expect(md).toContain(`[/switchboard/card.png](${ORIGIN}/switchboard/card.png)`);
  await page.goto('/for-agents');
  await expect(page.getByRole('link', { name: `${ORIGIN}/switchboard`, exact: true })).toHaveAttribute('href', '/switchboard');
  await expect(page.getByRole('link', { name: '/switchboard/card.png', exact: true })).toHaveAttribute('href', '/switchboard/card.png');
});
