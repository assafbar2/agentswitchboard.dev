// My stack and shared stacks: the toggles on cards and listing pages
// (components/MyStackClient.tsx), /my-stack (components/MyStackEditor.tsx),
// /stack?items=…&title=… (app/stack/page.tsx, lib/shared-stack.ts) and its
// share card, Edit a copy and a curated stack's Add all (components/SaveStack.tsx).
// Read-only: GETs only; My stack lives in the browser's localStorage.
import * as fs from 'fs';
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (collections)' };
const MAX = 10;

const catalog = (await (await fetch(`${BASE}/agents.json`, { headers: UA })).json()).agents;
const bySlug = new Map(catalog.map((a) => [a.slug, a]));
const name = (slug) => bySlug.get(slug).name;
const content = (file) => JSON.parse(fs.readFileSync(new URL(`../../content/${file}`, import.meta.url), 'utf8'));

const [A, B, C] = catalog.slice(0, 3).map((a) => a.slug);
const RETIRED = content('changelog.json').find((e) => e.action === 'removed' && !bySlug.has(e.slug));
const CURATED = content('stacks.json')[0];
const WITH_PANEL = catalog.find((a) => a.mcpEndpoint && a.iconUrl);
const HOSTED = catalog.find((a) => a.mcpEndpoint && a.accessMethods.includes('mcp'));
const CONNECTED = [HOSTED.slug, ...[A, B].filter((slug) => slug !== HOSTED.slug)].slice(0, 2);
const PANEL_LESS = catalog.find((a) => !a.accessMethods.some((m) => ['mcp', 'cli', 'api', 'browser-extension'].includes(m)));

const human = (page) => page.locator('.human-only');
const events = (page, eventName) =>
  page.evaluate((n) => (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === n).map(([, e]) => e.data), eventName);
const robots = (page) => page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute('content')).join(','));
const ogImage = (page) => page.locator('meta[property="og:image"]').first().getAttribute('content');
const pathOf = (url) => url.replace(/^https?:\/\/[^/]+/, '');
const stored = async (page) => JSON.parse((await page.evaluate(() => localStorage.getItem('my-stack'))) ?? 'null');
const item = (slug) => ({ slug, name: name(slug), icon: null });
const headerLink = (page, n) => page.getByRole('link', { name: `My stack: ${n} ${n === 1 ? 'listing' : 'listings'}`, exact: true });
const note = (page) => page.locator('.stk-note');
const rows = (page) => human(page).locator('section[aria-labelledby="stk-listings"] ol > li a');
const button = (page, label) => human(page).getByRole('button', { name: label, exact: true });

/** Opens `path` once the layout's scripts run: both set their attribute on <html> after hydration. */
async function openReady(page, path) {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-cmp-ready', '');
  await expect(page.locator('html')).toHaveAttribute('data-stk-ready', '');
}

/** My stack holding `stack` before the test opens a page. */
async function seed(page, stack) {
  await page.goto('/robots.txt');
  await page.evaluate((value) => localStorage.setItem('my-stack', value), JSON.stringify(stack));
}

async function textOnly(page) {
  await page.getByRole('complementary', { name: 'For AI agents' }).getByRole('button', { name: /Switch to text-only view/ }).click();
}

test.describe('the toggles', () => {
  test('a card keeps its listing in My stack, says so, and the header counts it', async ({ page }) => {
    await openReady(page, '/browse');
    const card = human(page).locator('.cmp-card').first();
    const slug = await card.locator('button[data-stk]').getAttribute('data-stk');
    const toggle = card.getByRole('button', { name: `Add ${name(slug)} to My stack`, exact: true });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(note(page)).toHaveText(`${name(slug)} added to My stack (1 of ${MAX}).`);
    await expect(headerLink(page, 1)).toHaveAttribute('href', '/my-stack');
    await expect(headerLink(page, 1)).toHaveText(/^My stack ·\s*1$/);
    expect((await stored(page)).items.map((i) => [i.slug, i.name])).toEqual([[slug, name(slug)]]);
    expect(await events(page, 'stack_add')).toEqual([{ slug, from: 'browse' }]);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(note(page)).toHaveText(`${name(slug)} removed from My stack.`);
    await expect(page.getByRole('link', { name: /^My stack: / })).toHaveCount(0);
    expect(await stored(page)).toBeNull();
  });

  test('a card toggle sits beside Compare and names itself on hover', async ({ page }) => {
    await openReady(page, '/browse');
    const card = human(page).locator('.cmp-card').first();
    const toggle = card.locator('button.stk-toggle');
    const [compare, stack] = [await card.locator('button.cmp-toggle').boundingBox(), await toggle.boundingBox()];
    expect(compare.x + compare.width).toBeLessThanOrEqual(stack.x);
    await toggle.hover();
    const tip = () => toggle.evaluate((el) => getComputedStyle(el, '::after').content);
    expect(await tip()).toBe(`"${await toggle.getAttribute('aria-label')}"`);
    await toggle.click();
    expect(await tip()).toBe('"In My stack · press to take it out"');
  });

  test('the note shows above the compare tray', async ({ page }) => {
    await openReady(page, '/browse');
    const card = human(page).locator('.cmp-card').first();
    await card.locator('button.cmp-toggle').click();
    const tray = page.getByRole('complementary', { name: 'Compare', exact: true });
    await expect(tray).toBeVisible();
    await card.locator('button.stk-toggle').click();
    await expect(note(page)).toBeVisible();
    await expect
      .poll(async () => {
        const [n, t] = [await note(page).boundingBox(), await tray.boundingBox()];
        return n.y + n.height <= t.y;
      })
      .toBe(true);
  });

  test(`a full My stack (${MAX}) asks to remove one first`, async ({ page }) => {
    const full = catalog.slice(0, MAX).map((a) => item(a.slug));
    await seed(page, { title: '', items: full });
    await openReady(page, '/browse');
    const kept = new Set(full.map((i) => i.slug));
    const shown = await human(page).locator('.cmp-card button[data-stk]').evaluateAll((els) => els.map((e) => e.dataset.stk));
    const other = shown.find((slug) => !kept.has(slug));
    const toggle = human(page).locator(`.cmp-card button[data-stk="${other}"]`).first();
    await expect(human(page).locator(`.cmp-card button[data-stk="${full[0].slug}"]`).first()).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();
    await expect(note(page)).toHaveText(`My stack holds ${MAX}. Remove one on the My stack page to add ${name(other)}.`);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(headerLink(page, MAX)).toBeVisible();
    expect(await events(page, 'stack_add')).toEqual([]);
  });

  test(`a listing page keeps itself from Use it now, with its icon (${WITH_PANEL.slug})`, async ({ page }) => {
    const slug = WITH_PANEL.slug;
    await openReady(page, `/agents/${slug}`);
    const toggle = human(page).getByRole('region', { name: 'Use it now' }).getByRole('button', { name: `Add ${name(slug)} to My stack`, exact: true });
    await expect(toggle).toHaveText('My stack');
    await expect(human(page).getByText(`Keep it with up to ${MAX - 1} other tools you're setting up, then share them all as one link.`)).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await events(page, 'stack_add')).toEqual([{ slug, from: 'listing' }]);
    expect((await stored(page)).items).toEqual([{ slug, name: name(slug), icon: expect.stringMatching(/^\/icons\//) }]);
  });

  test('a listing page without Use it now has the toggle too', async ({ page }) => {
    test.skip(!PANEL_LESS, 'every listing has a Use it now panel');
    await openReady(page, `/agents/${PANEL_LESS.slug}`);
    await expect(human(page).locator('#use-it-now')).toHaveCount(0);
    await expect(button(page, `Add ${PANEL_LESS.name} to My stack`)).toBeVisible();
  });
});

test.describe('/my-stack', () => {
  test('empty, it says how to fill it, and stays out of search', async ({ page }) => {
    expect((await page.goto('/my-stack')).status()).toBe(200);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText('My stack');
    await expect(human(page).getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
    const ways = human(page).locator('section[aria-labelledby="stk-empty"] li > a');
    expect(await ways.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(['/tasks', '/stacks', '/browse']);
    expect(await robots(page)).toContain('noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/my-stack`);
  });

  test('titles, reorders and prunes the stack, keeping the keyboard in place, and its link follows', async ({ page }) => {
    await seed(page, { title: '', items: [A, B, C].map(item) });
    await openReady(page, '/my-stack');
    await expect(rows(page)).toHaveText([A, B, C].map(name));
    await expect(human(page).getByRole('heading', { name: `In my stack · 3 of ${MAX}` })).toBeVisible();
    const share = human(page).locator('section[aria-labelledby="stk-share"] code');
    await expect(share).toHaveText(`${ORIGIN}/stack?items=${A},${B},${C}`);

    await human(page).getByLabel('Title').fill('Agent tools');
    await expect(share).toHaveText(`${ORIGIN}/stack?items=${A},${B},${C}&title=Agent%20tools`);

    await button(page, `Move ${name(A)} down`).click();
    await expect(rows(page)).toHaveText([B, A, C].map(name));
    await expect(button(page, `Move ${name(A)} down`)).toBeFocused();
    await button(page, `Move ${name(A)} up`).click();
    await expect(rows(page)).toHaveText([A, B, C].map(name));
    // Its Move up is disabled at the top, so the keyboard moves to Move down.
    await expect(button(page, `Move ${name(A)} up`)).toBeDisabled();
    await expect(button(page, `Move ${name(A)} down`)).toBeFocused();

    await button(page, `Remove ${name(B)} from My stack`).click();
    await expect(rows(page)).toHaveText([A, C].map(name));
    await expect(button(page, `Remove ${name(C)} from My stack`)).toBeFocused();
    await expect(share).toHaveText(`${ORIGIN}/stack?items=${A},${C}&title=Agent%20tools`);
    await expect(human(page).getByRole('link', { name: 'Compare both' })).toHaveAttribute('href', `/compare?a=${A}&b=${C}`);
    await expect(human(page).getByRole('link', { name: 'Connect them all' })).toHaveAttribute('href', `/stack?items=${A},${C}&title=Agent%20tools#connect`);
    await expect(human(page).getByRole('link', { name: 'Open the shared page' })).toHaveAttribute('href', `/stack?items=${A},${C}&title=Agent%20tools`);
    await expect(headerLink(page, 2)).toBeVisible();
    expect(await stored(page)).toEqual({ title: 'Agent tools', items: [A, C].map(item) });
  });

  test('clearing asks first, and Keep them changes nothing', async ({ page }) => {
    await seed(page, { title: 'T', items: [A, B].map(item) });
    await openReady(page, '/my-stack');
    await button(page, 'Clear My stack').click();
    await expect(human(page).getByText(`Take all 2 listings out of My stack (${name(A)} and ${name(B)})? The links you shared keep working.`)).toBeVisible();
    await expect(button(page, 'Keep them')).toBeFocused();
    await button(page, 'Keep them').click();
    await expect(button(page, 'Clear My stack')).toBeFocused();
    await expect(rows(page)).toHaveCount(2);

    await button(page, 'Clear My stack').click();
    await button(page, 'Yes, clear it').click();
    await expect(human(page).getByRole('heading', { name: 'Nothing here yet' })).toBeFocused();
    expect(await stored(page)).toBeNull();
    await expect(page.getByRole('link', { name: /^My stack: / })).toHaveCount(0);
  });

  test('the text-only view lists it, with its link', async ({ page }) => {
    await seed(page, { title: 'T', items: [A, B].map(item) });
    await openReady(page, '/my-stack');
    await textOnly(page);
    const view = page.locator('div.agent-only', { has: page.locator('.agent-section-title', { hasText: 'share' }) });
    await expect(view.getByText(`up to ${MAX} listings kept in this browser's localStorage`)).toBeVisible();
    await expect(view.locator('.agent-row .agent-accent')).toHaveText([
      A,
      B,
      `/stack?items=${A},${B}&title=T`,
      `/compare?a=${A}&b=${B}`,
      `/api/bundle?items=${A},${B}`,
    ]);
  });

  test('Connect them all opens the shared page at its config', async ({ page }) => {
    await seed(page, { title: '', items: CONNECTED.map(item) });
    await openReady(page, '/my-stack');
    await human(page).getByRole('link', { name: 'Connect them all' }).click();
    await expect(page).toHaveURL(new RegExp(`/stack\\?items=${CONNECTED.join(',')}#connect$`));
    await expect(human(page).getByRole('region', { name: 'Connect them all' })).toBeInViewport();
  });
});

test.describe('/stack', () => {
  test("a shared stack: the link's order, a retired listing struck through, a note for the rest", async ({ page }) => {
    test.skip(!RETIRED, 'no removed listing in content/changelog.json');
    const path = `/stack?items=${A},${B},${RETIRED.slug},no-such-listing-xyz,${A}&title=Design%20to%20production`;
    expect((await page.goto(path)).status()).toBe(200);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText('Design to production');
    const list = human(page).locator('section[aria-labelledby="in-this-stack"] ol > li');
    await expect(list).toHaveCount(3);
    await expect(list.locator('h3')).toHaveText([name(A), name(B)]);
    await expect(list.nth(2).locator('s')).toHaveText(RETIRED.name);
    await expect(human(page).locator('header ul li')).toHaveText([
      '“no-such-listing-xyz” isn’t a listing in the directory, so it is left out.',
      `${name(A)} was named twice; it is shown once.`,
    ]);

    const tidy = `/stack?items=${A},${B},${RETIRED.slug}&title=Design%20to%20production`;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}${tidy}`);
    expect(await robots(page)).toContain('noindex');
    const use = human(page).getByRole('region', { name: 'Use this stack' });
    await expect(use.locator('code')).toHaveText(`${ORIGIN}${tidy}`);
    await expect(use.getByRole('link', { name: 'Compare both' })).toHaveAttribute('href', `/compare?a=${A}&b=${B}`);

    const og = await ogImage(page);
    expect(og).toMatch(new RegExp(`/stack/card\\.png\\?items=${A},${B},${RETIRED.slug}&title=Design%20to%20production&v=[0-9a-f]{8}$`));
    const card = await page.request.get(pathOf(og), { headers: UA });
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toBe('image/png');
  });

  test('share cards: a PNG for a stack naming a listing, a 404 for one naming none', async ({ request }) => {
    const ok = await request.get(`/stack/card.png?items=${A},${B}&title=Two`, { headers: UA });
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toBe('image/png');
    const none = ['/stack/card.png', '/stack/card.png?items=no-such-a,no-such-b', ...(RETIRED ? [`/stack/card.png?items=${RETIRED.slug}`] : [])];
    for (const path of none) expect((await request.get(path, { headers: UA })).status(), path).toBe(404);
  });

  test('bare /stack explains the link, and one naming no listing says so', async ({ page }) => {
    expect((await page.goto('/stack')).status()).toBe(200);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText('A shared stack');
    await expect(human(page).getByText('/stack?items=<slug>,<slug>&title=<title>', { exact: true })).toBeVisible();
    expect(await robots(page)).toContain('noindex');

    await page.goto('/stack?items=no-such-a');
    await expect(human(page).getByText('This link names no listing in the directory.')).toBeVisible();
    await expect(human(page).locator('header ul li')).toHaveText(['“no-such-a” isn’t a listing in the directory, so it is left out.']);
  });

  test('a shared stack connects them all, as GET /api/bundle does for its items', async ({ page }) => {
    const items = CONNECTED.join(',');
    const bundle = await (await page.request.get(`/api/bundle?items=${items}`, { headers: UA })).json();
    await page.goto(`/stack?items=${items}`);
    const connect = human(page).getByRole('region', { name: 'Connect them all' });
    await expect(connect.locator(':scope > p').first()).toHaveText(`${bundle.summary}.`);
    expect(JSON.parse(await connect.getByRole('region', { name: 'In the config' }).locator('pre').first().textContent())).toEqual(bundle.config);
    expect(bundle.config.mcpServers[HOSTED.slug]).toEqual({ url: HOSTED.mcpEndpoint });

    await page.goto(`/stack?items=${HOSTED.slug}`);
    await expect(human(page).getByRole('region', { name: 'Connect it' })).toBeVisible();
  });

  test('a title holding a web address is dropped', async ({ page }) => {
    await page.goto(`/stack?items=${A}&title=${encodeURIComponent('Free credits at https://phish.example')}`);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText('A shared stack');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/stack?items=${A}`);
  });

  test('the text-only view lists the stack in order, a retired listing struck through', async ({ page }) => {
    test.skip(!RETIRED, 'no removed listing in content/changelog.json');
    await openReady(page, `/stack?items=${A},${RETIRED.slug},${B}`);
    await textOnly(page);
    const view = page.locator('div.agent-only', { has: page.locator('.agent-section-title', { hasText: 'in this stack' }) });
    await expect(view).toBeVisible();
    await expect(view.locator('.agent-row .agent-accent').first()).toHaveText(A);
    await expect(view.locator('.agent-row .agent-accent.line-through')).toHaveText(RETIRED.slug);
    await expect(view.getByRole('link', { name: new RegExp(`^/compare\\?a=${A}&b=${B}`) })).toBeVisible();
  });
});

test.describe('Edit a copy', () => {
  const path = `/stack?items=${A},${B}&title=Two%20tools`;

  test('with My stack empty, it opens the copy there', async ({ page }) => {
    await openReady(page, path);
    await button(page, 'Edit a copy').click();
    await expect(page).toHaveURL(/\/my-stack$/);
    await expect(human(page).getByLabel('Title')).toHaveValue('Two tools');
    await expect(rows(page)).toHaveText([A, B].map(name));
    expect(await events(page, 'stack_add')).toEqual([{ from: 'stack', items: 2 }]);
  });

  test('with other listings in My stack, it asks first: Cancel, then Add to it', async ({ page }) => {
    await seed(page, { title: 'Mine', items: [item(C)] });
    await openReady(page, path);
    const copy = button(page, 'Edit a copy');
    await copy.click();
    const ask = human(page).getByRole('group', { name: /^My stack already holds 1 listing\. Replace it with this stack, or add/ });
    await expect(ask.getByRole('button', { name: 'Replace' })).toBeFocused();
    await ask.getByRole('button', { name: 'Cancel' }).click();
    await expect(copy).toBeFocused();

    await copy.click();
    await button(page, 'Add to it').click();
    await expect(page).toHaveURL(/\/my-stack$/);
    await expect(human(page).getByLabel('Title')).toHaveValue('Mine');
    await expect(rows(page)).toHaveText([C, A, B].map(name));
    expect(await events(page, 'stack_add')).toEqual([{ from: 'stack', items: 2 }]);
  });

  test('Replace puts the shared stack in place of My stack', async ({ page }) => {
    await seed(page, { title: 'Mine', items: [item(C)] });
    await openReady(page, path);
    await button(page, 'Edit a copy').click();
    await button(page, 'Replace').click();
    await expect(page).toHaveURL(/\/my-stack$/);
    await expect(human(page).getByLabel('Title')).toHaveValue('Two tools');
    await expect(rows(page)).toHaveText([A, B].map(name));
  });
});

test(`a curated stack compares its first three and adds them all to My stack (${CURATED.slug})`, async ({ page }) => {
  await openReady(page, `/stacks/${CURATED.slug}`);
  const slugs = await human(page)
    .locator('section[aria-labelledby="in-this-stack"] .cmp-card button[data-stk]')
    .evaluateAll((els) => els.map((e) => e.dataset.stk));
  const use = human(page).getByRole('region', { name: 'Use this stack' });
  await expect(use.getByRole('link', { name: slugs.length === 3 ? 'Compare all 3' : 'Compare the first 3' })).toHaveAttribute(
    'href',
    `/compare?a=${slugs[0]}&b=${slugs[1]}&c=${slugs[2]}`
  );

  await use.getByRole('button', { name: 'Add all to My stack' }).click();
  await expect(use.getByRole('status')).toContainText(`Added ${slugs.length} to My stack.`);
  await expect(use.getByRole('link', { name: 'Open My stack' })).toHaveAttribute('href', '/my-stack');
  await expect(headerLink(page, slugs.length)).toBeVisible();
  await expect(human(page).locator('section[aria-labelledby="in-this-stack"] .cmp-card button[data-stk][aria-pressed="true"]')).toHaveCount(slugs.length);
  expect(await stored(page)).toMatchObject({ title: CURATED.title, items: slugs.map((slug) => ({ slug })) });
  expect(await events(page, 'stack_add')).toEqual([{ from: 'stacks', items: slugs.length }]);

  await use.getByRole('button', { name: 'Add all to My stack' }).click();
  await expect(use.getByRole('status')).toContainText(`All ${slugs.length} are already in My stack.`);
});

test.describe('copying', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('My stack copies its link and counts stack_share', async ({ page }) => {
    await seed(page, { title: 'Ship it', items: [A, B].map(item) });
    await openReady(page, '/my-stack');
    await button(page, 'Copy the link to My stack').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ORIGIN}/stack?items=${A},${B}&title=Ship%20it`);
    expect(await events(page, 'stack_share')).toEqual([{ items: 2, from: 'my-stack' }]);
  });

  test('a shared stack copies its own link', async ({ page }) => {
    const path = `/stack?items=${A},${B}`;
    await openReady(page, path);
    await button(page, 'Copy the link to this stack').click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ORIGIN}${path}`);
    expect(await events(page, 'stack_share')).toEqual([{ items: 2, from: 'stack' }]);
  });

  test('a shared stack copies its MCP config and counts stack_bundle_export', async ({ page }) => {
    const items = CONNECTED.join(',');
    const bundle = await (await page.request.get(`/api/bundle?items=${items}`, { headers: UA })).json();
    await openReady(page, `/stack?items=${items}`);
    await button(page, 'Copy the MCP client config for this stack').click();
    expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(bundle.config);
    expect(await events(page, 'stack_bundle_export')).toEqual([
      { from: 'stack', items: 2, servers: Object.keys(bundle.config.mcpServers).length, what: 'mcp-config' },
    ]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the toggles and Edit a copy stay hidden; a shared stack still renders in full', async ({ page }) => {
    await page.goto('/browse');
    await expect(human(page).locator('.cmp-card').first()).toBeVisible();
    await expect(human(page).locator('button.stk-toggle').first()).toBeHidden();
    await page.goto(`/stack?items=${A},${B}`);
    await expect(human(page).locator('section[aria-labelledby="in-this-stack"] ol > li')).toHaveCount(2);
    await expect(human(page).getByRole('button', { name: 'Edit a copy' })).toHaveCount(0);
  });

  test('/my-stack says it needs JavaScript', async ({ page, request }) => {
    await page.goto('/my-stack');
    await expect(human(page).getByText('Your stack is kept in this browser.')).toBeVisible();
    // Playwright turns scripts off but still parses <noscript> as raw text, so check the served page.
    expect(await (await request.get('/my-stack', { headers: UA })).text()).toContain('<noscript> Turn on JavaScript to see and edit it.</noscript>');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  test('a shared stack and My stack fit without sideways scrolling', async ({ page }) => {
    const ten = catalog.slice(0, MAX).map((a) => a.slug);
    await openReady(page, `/stack?items=${ten.join(',')}&title=${encodeURIComponent('A long title for a stack of ten tools')}`);
    expect(await fits(page)).toBe(true);
    await seed(page, { title: 'A long title for a stack of ten tools', items: ten.map(item) });
    await openReady(page, '/my-stack');
    await expect(rows(page)).toHaveCount(MAX);
    expect(await fits(page)).toBe(true);
  });

  test('the menu links My stack once it holds something', async ({ page }) => {
    await seed(page, { title: '', items: [item(A)] });
    await openReady(page, '/');
    await expect(headerLink(page, 1)).toBeHidden();
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await expect(page.getByRole('link', { name: 'My stack · 1', exact: true })).toHaveAttribute('href', '/my-stack');
  });
});

test('llms.txt, index.md and /for-agents explain the shared stack link', async ({ page, request }) => {
  const llms = await (await request.get('/llms.txt', { headers: UA })).text();
  expect(llms).toContain(`https://agentswitchboard.dev/stack?items=<slug>,<slug>&title=<title> (up to ${MAX} listings`);
  const md = await (await request.get('/index.md', { headers: UA })).text();
  expect(md).toContain('`/stack?items={slug},{slug}&title={title}`');
  await page.goto('/for-agents');
  await expect(page.getByText('https://agentswitchboard.dev/stack?items=<slug>,<slug>&title=<title>', { exact: true }).first()).toBeVisible();
});
