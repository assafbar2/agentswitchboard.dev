// Compare: the tray (components/CompareTray.tsx), /compare?a=&b=&c= and the
// curated /compare/<a>-vs-<b> pages (lib/compare.ts, content/comparisons.json),
// their share cards, and the Compare links on listing and alternatives pages.
// Read-only: GETs only; the tray keeps its picks in the browser's localStorage.
import * as fs from 'fs';
import { test, expect } from './fixtures.mjs';
import { BASE } from '../target.mjs';

const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (compare)' };
const MAX = 3;

const catalog = (await (await fetch(`${BASE}/agents.json`, { headers: UA })).json()).agents;
const bySlug = new Map(catalog.map((a) => [a.slug, a]));
const name = (slug) => bySlug.get(slug).name;
const content = (file) => JSON.parse(fs.readFileSync(new URL(`../../content/${file}`, import.meta.url), 'utf8'));

const CURATED = content('comparisons.json');
const pair = (c) => c.items.join('-vs-');
const SAMPLE = [...new Set([CURATED[0], CURATED[Math.floor(CURATED.length / 2)], CURATED[CURATED.length - 1]])];
const curatedSet = new Set(CURATED.map((c) => [...c.items].sort().join(',')));
const notCurated = (...slugs) => !curatedSet.has([...slugs].sort().join(','));

const pick = (found, what) => {
  if (!found) throw new Error(`no published listing ${what}`);
  return found.slug;
};
const INSTALLED = pick(catalog.find((a) => a.install && !a.accessMethods.includes('mcp')), 'with an install command and no MCP');
const API_ONLY = pick(catalog.find((a) => a.accessMethods.join() === 'api' && notCurated(INSTALLED, a.slug)), 'that is only an API');
const HOSTED = pick(catalog.find((a) => a.mcpEndpoint && notCurated(a.slug, API_ONLY)), 'with an mcpEndpoint');
const sameProvider = Object.values(Object.groupBy(catalog, (a) => a.provider)).find((group) => group.length >= 2);
const RETIRED = content('changelog.json').find((e) => e.action === 'removed' && !bySlug.has(e.slug));

const sitemap = await (await fetch(`${BASE}/sitemap.xml`, { headers: UA })).text();
const WITH_ALTERNATIVES = [...sitemap.matchAll(/\/agents\/([a-z0-9-]+)\/alternatives<\/loc>/g)].map((m) => m[1]);

const human = (page) => page.locator('.human-only');
const table = (page) => human(page).locator('table.cmp-table');
const row = (page, label) => table(page).locator('tbody tr').filter({ has: page.locator('th', { hasText: new RegExp(`^${label}$`) }) });
const notes = (page) => human(page).locator('header ul li');
const events = (page, eventName) =>
  page.evaluate((n) => (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === n).map(([, e]) => e.data), eventName);
const robots = (page) => page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute('content')).join(','));
const ogImage = (page) => page.locator('meta[property="og:image"]').first().getAttribute('content');
const pathOf = (url) => url.replace(/^https?:\/\/[^/]+/, '');

async function openHydrated(page, path) {
  await page.goto(path);
  await expect(page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'For Humans' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-cmp-ready', '');
}

async function apiRecord(request, slug) {
  const res = await request.get(`/api/agents/${slug}`, { headers: UA });
  expect(res.status(), `/api/agents/${slug}`).toBe(200);
  return res.json();
}

test('bare /compare explains itself and lists every curated comparison', async ({ page }) => {
  expect((await page.goto('/compare')).status()).toBe(200);
  await expect(human(page).getByRole('heading', { level: 1 })).toHaveText('Compare');
  await expect(human(page).getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(table(page)).toHaveCount(0);
  const links = human(page).locator('section[aria-labelledby="compare-curated"] li > a');
  expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(CURATED.map((c) => `/compare/${pair(c)}`));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/compare`);
  expect(await robots(page)).not.toContain('noindex');
  expect(await ogImage(page)).toMatch(/\/compare\/card\.png\?v=[0-9a-f]{8}$/);
});

test('the sitemap lists /compare and every curated comparison, and no other mix', () => {
  expect(sitemap).toMatch(/\/compare<\/loc>/);
  const listed = [...sitemap.matchAll(/\/compare\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
  expect(listed.sort()).toEqual(CURATED.map(pair).sort());
});

for (const c of SAMPLE) {
  test(`/compare/${pair(c)}: the curated page, with its intro and one column per listing`, async ({ page }) => {
    expect((await page.goto(`/compare/${pair(c)}`)).status()).toBe(200);
    const names = c.items.map(name);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText(names.join(' vs '));
    await expect(human(page).getByText(c.intro, { exact: true })).toBeVisible();
    const heads = table(page).locator('thead th');
    await expect(heads).toHaveCount(c.items.length);
    for (const [i, slug] of c.items.entries()) await expect(heads.nth(i).locator(`a[href="/agents/${slug}"]`)).toHaveText(names[i]);
    await expect(row(page, 'What it is')).toHaveCount(1);
    await expect(row(page, 'Use it now').getByRole('link', { name: /^Set it up/ })).toHaveCount(c.items.length);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/compare/${pair(c)}`);
    expect(await robots(page)).not.toContain('noindex');
    expect(await ogImage(page)).toMatch(new RegExp(`/compare/${pair(c)}/card\\.png\\?v=[0-9a-f]{8}$`));
    // The other curated comparisons are listed below; this one is not.
    const others = human(page).locator('section[aria-labelledby="compare-curated"] li > a');
    await expect(others).toHaveCount(CURATED.length - 1);
    await expect(others.and(page.locator(`[href="/compare/${pair(c)}"]`))).toHaveCount(0);
  });
}

test(`any other mix (${INSTALLED} and ${API_ONLY}): side by side, kept out of search, with its own share card`, async ({ page }) => {
  const path = `/compare?a=${INSTALLED}&b=${API_ONLY}`;
  expect((await page.goto(path)).status()).toBe(200);
  await expect(human(page).getByRole('heading', { level: 1 })).toHaveText(`${name(INSTALLED)} vs ${name(API_ONLY)}`);
  await expect(table(page).locator('thead th')).toHaveCount(2);
  expect(await robots(page)).toContain('noindex');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}${path}`);
  await expect(human(page).locator('section[aria-labelledby="compare-share"] code')).toHaveText(`${ORIGIN}${path}`);
  const og = await ogImage(page);
  expect(og).toMatch(new RegExp(`/compare/card\\.png\\?a=${INSTALLED}&b=${API_ONLY}&v=[0-9a-f]{8}$`));
  const card = await page.request.get(pathOf(og), { headers: UA });
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toBe('image/png');
});

test('a curated set asked for in another order points search engines at its curated page', async ({ page }) => {
  const c = CURATED[0];
  const [first, second, ...rest] = c.items;
  const query = [second, first, ...rest].map((slug, i) => `${'abc'[i]}=${slug}`).join('&');
  await page.goto(`/compare?${query}`);
  await expect(human(page).getByText(c.intro, { exact: true })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/compare/${pair(c)}`);
  expect(await robots(page)).not.toContain('noindex');
});

test('a hand-edited link still opens: a repeat, an unknown slug and a fourth listing are left out, each with a note', async ({ page }) => {
  // The first listing of four curated comparisons: three of them make no curated set, so the page stays out of search.
  const [p, q, r, s] = CURATED.slice(0, 4).map((c) => c.items[0]);
  expect(notCurated(p, q, r)).toBe(true);
  await page.goto(`/compare?a=${p}&b=${p}&c=no-such-listing-xyz&d=${q}&e=${r}&f=${s}`);
  await expect(table(page).locator('thead th a[href^="/agents/"]')).toHaveText([name(p), name(q), name(r)]);
  await expect(notes(page)).toHaveText([
    `${name(p)} was named twice; it is shown once.`,
    '“no-such-listing-xyz” isn’t a listing in the directory, so it is left out.',
    `${name(s)} is left out: a comparison shows up to ${MAX}.`,
  ]);
  expect(await robots(page)).toContain('noindex');
});

test('a listing that is no longer listed is named and left out', async ({ page }) => {
  test.skip(!RETIRED, 'no removed listing in content/changelog.json');
  const kept = CURATED[0].items[0];
  await page.goto(`/compare?a=${RETIRED.slug}&b=${kept}`);
  await expect(notes(page)).toHaveText([`${RETIRED.name} is no longer listed, so it is left out.`]);
  await expect(human(page).getByRole('heading', { level: 1 })).toHaveText(`Compare ${name(kept)}`);
});

test('one listing: its closest alternatives, each a link that adds it', async ({ page }) => {
  const slug = CURATED[0].items[0];
  await page.goto(`/compare?a=${slug}`);
  await expect(human(page).getByRole('heading', { level: 1 })).toHaveText(`Compare ${name(slug)}`);
  await expect(table(page)).toHaveCount(0);
  const add = human(page).locator('section[aria-labelledby="compare-add"]');
  await expect(add.getByRole('heading')).toHaveText(`Compare ${name(slug)} with`);
  const hrefs = await add.locator('li > a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThanOrEqual(1);
  expect(hrefs.length).toBeLessThanOrEqual(4);
  for (const href of hrefs) expect(href).toMatch(new RegExp(`^/compare\\?a=${slug}&b=[a-z0-9-]+$`));
  expect(hrefs).toContain(`/compare?a=${slug}&b=${CURATED[0].items[1]}`);
});

test(`setup rows show each column's own command or address, or that it has none (${INSTALLED}, ${HOSTED})`, async ({ page }) => {
  const installed = bySlug.get(INSTALLED);
  const hosted = await apiRecord(page.request, HOSTED);
  await page.goto(`/compare?a=${INSTALLED}&b=${HOSTED}`);
  await expect(row(page, 'CLI install').locator('td').first().locator('code')).toHaveText(installed.install.command);
  await expect(row(page, 'MCP server').locator('td').first()).toHaveText('No MCP server');
  await expect(row(page, 'MCP server').locator('td').nth(1).locator('code')).toHaveText(hosted.mcpEndpoint);
  const use = row(page, 'Use it now').locator('td');
  await expect(use.nth(1).getByRole('link', { name: `Add ${hosted.name} to Cursor` })).toHaveAttribute('href', hosted.useItNow.mcp.cursorInstallUrl);
  await expect(use.nth(0).getByRole('link', { name: /Add .* to Cursor/ })).toHaveCount(0);
  await expect(use.nth(0).getByRole('link', { name: /^Set it up/ })).toHaveAttribute('href', `/agents/${INSTALLED}#use-it-now`);
});

test('a row where every column says the same is shown once, dimmed', async ({ page }) => {
  const [a, b] = sameProvider;
  await page.goto(`/compare?a=${a.slug}&b=${b.slug}`);
  const provider = row(page, 'Provider');
  await expect(provider).toHaveClass(/cmp-same/);
  await expect(provider.locator('td')).toHaveCount(1);
  await expect(provider.locator('td')).toHaveAttribute('colspan', '2');
  await expect(provider.locator('td')).toContainText(`${a.provider}Same for all`);
});

test('share cards: bare, curated and any other mix are PNGs; one naming fewer than two listings is a 404', async ({ request }) => {
  for (const path of ['/compare/card.png', `/compare/${pair(CURATED[0])}/card.png`, `/compare/card.png?a=${HOSTED}&b=${API_ONLY}`]) {
    const res = await request.get(path, { headers: UA });
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toBe('image/png');
  }
  // Only a curated comparison's card lives under its page.
  for (const path of [`/compare/${HOSTED}-vs-${API_ONLY}/card.png`, '/compare/card.png?a=no-such-a&b=no-such-b', `/compare/card.png?a=${HOSTED}`]) {
    expect((await request.get(path, { headers: UA })).status(), path).toBe(404);
  }
});

test('/compare/<a>-vs-<b> for a mix that is not curated opens its /compare link, even one naming no listing', async ({ page, request }) => {
  const res = await request.get(`/compare/${INSTALLED}-vs-${API_ONLY}`, { headers: UA, maxRedirects: 0 });
  expect(res.status()).toBe(307);
  await page.goto(`/compare/${INSTALLED}-vs-${API_ONLY}`);
  expect(pathOf(page.url())).toBe(`/compare?a=${INSTALLED}&b=${API_ONLY}`);
  await expect(table(page).locator('thead th')).toHaveCount(2);

  await page.goto('/compare/no-such-a-vs-no-such-b');
  expect(pathOf(page.url())).toBe('/compare?a=no-such-a&b=no-such-b');
  await expect(notes(page)).toHaveCount(2);
  expect((await page.goto('/compare/no-such-listing')).status()).toBe(404);
});

test('a listing page compares it with its top two alternatives and links its curated comparisons', async ({ page }) => {
  const c = CURATED[0];
  const slug = c.items[0];
  await page.goto(`/agents/${slug}`);
  const block = human(page).getByRole('region', { name: 'Compare', exact: true });
  const related = await human(page).locator('.cmp-card > a').evaluateAll((els) => els.slice(0, 2).map((e) => e.getAttribute('href').slice(8)));
  await expect(block.locator('a[href^="/compare?"]')).toHaveAttribute('href', `/compare?a=${slug}&b=${related[0]}&c=${related[1]}`);
  await expect(block.locator(`a[href="/compare/${pair(c)}"]`)).toContainText(c.items.map(name).join(' vs '));
});

test('an alternatives page offers the same comparison with its top two', async ({ page }) => {
  const slug = WITH_ALTERNATIVES[0];
  await page.goto(`/agents/${slug}/alternatives`);
  const top = await human(page)
    .locator('section[aria-labelledby="alternatives"] ol > li .cmp-card > a')
    .evaluateAll((els) => els.slice(0, 2).map((e) => e.getAttribute('href').slice(8)));
  const link = human(page).getByRole('link', { name: new RegExp(`^Compare ${name(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} with .+, side by side`) });
  await expect(link).toHaveAttribute('href', `/compare?a=${slug}&b=${top[0]}&c=${top[1]}`);
});

test.describe('the tray', () => {
  test('holds three picks from the cards, asks to remove one for a fourth, and keeps them across a reload', async ({ page }) => {
    await openHydrated(page, '/browse');
    const cards = human(page).locator('.cmp-card');
    const first = await cards.evaluateAll((els) =>
      els.slice(0, 4).map((e) => ({ slug: e.querySelector('button').dataset.cmp, name: e.querySelector('h3').textContent.trim() }))
    );
    const toggle = (i) => cards.nth(i).getByRole('button', { name: `Compare ${first[i].name}` });
    for (const i of [0, 1, 2]) await toggle(i).click();
    const tray = page.getByRole('complementary', { name: 'Compare', exact: true });
    await expect(tray).toContainText(`3 of ${MAX}`);
    await expect(toggle(0)).toHaveAttribute('aria-pressed', 'true');

    await toggle(3).click();
    await expect(tray).toContainText(`You can compare ${MAX} at a time. Remove one to add ${first[3].name}.`);
    await expect(toggle(3)).toHaveAttribute('aria-pressed', 'false');
    await tray.getByRole('button', { name: `Remove ${first[0].name} from compare` }).click();
    // The waiting pick takes the free place.
    const go = tray.getByRole('link', { name: /^Compare 3/ });
    const href = `/compare?a=${first[1].slug}&b=${first[2].slug}&c=${first[3].slug}`;
    await expect(go).toHaveAttribute('href', href);
    await expect(toggle(3)).toHaveAttribute('aria-pressed', 'true');
    expect(await events(page, 'compare_add')).toEqual([0, 1, 2, 3].map((i) => ({ slug: first[i].slug, from: 'browse' })));

    await page.reload();
    await expect(page.getByRole('complementary', { name: 'Compare', exact: true }).getByRole('link', { name: /^Compare 3/ })).toHaveAttribute('href', href);
  });

  test('opens the comparison, stays out of the way on compare pages, and Clear empties it', async ({ page }) => {
    await openHydrated(page, '/browse');
    const cards = human(page).locator('.cmp-card');
    const picked = await cards.evaluateAll((els) => els.slice(0, 2).map((e) => e.querySelector('button').dataset.cmp));
    for (const i of [0, 1]) await cards.nth(i).locator('button.cmp-toggle').click();
    const tray = page.getByRole('complementary', { name: 'Compare', exact: true });
    await tray.getByRole('link', { name: /^Compare 2/ }).click();
    await expect(page).toHaveURL(new RegExp(`/compare\\?a=${picked[0]}&b=${picked[1]}$`));
    await expect(table(page).locator('thead th')).toHaveCount(2);
    await expect(tray).toHaveCount(0);
    expect(await events(page, 'compare_view')).toEqual([{ n: 2, curated: !notCurated(...picked) }]);

    await page.goto('/browse');
    await page.getByRole('complementary', { name: 'Compare', exact: true }).getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('complementary', { name: 'Compare', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('compare'))).toBeNull();
  });

  test('a listing page adds itself from its Compare block', async ({ page }) => {
    const slug = CURATED[0].items[0];
    await openHydrated(page, `/agents/${slug}`);
    await human(page).getByRole('region', { name: 'Compare', exact: true }).getByRole('button', { name: `Compare ${name(slug)}` }).click();
    const tray = page.getByRole('complementary', { name: 'Compare', exact: true });
    await expect(tray.getByRole('link', { name: name(slug), exact: true })).toHaveAttribute('href', `/agents/${slug}`);
    await expect(tray.getByRole('link', { name: /^Compare with/ })).toHaveAttribute('href', `/compare?a=${slug}`);
    expect(await events(page, 'compare_add')).toEqual([{ slug, from: 'listing' }]);
  });
});

test.describe('copying', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the link to the comparison and counts compare_share', async ({ page }) => {
    const path = `/compare?a=${INSTALLED}&b=${API_ONLY}`;
    await openHydrated(page, path);
    await human(page).getByRole('button', { name: 'Copy the link to this comparison' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ORIGIN}${path}`);
    expect(await events(page, 'compare_share')).toEqual([{ n: 2 }]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the toggles stay hidden and a comparison still renders in full', async ({ page }) => {
    await page.goto('/browse');
    await expect(human(page).locator('.cmp-card').first()).toBeVisible();
    await expect(human(page).locator('button.cmp-toggle').first()).toBeHidden();
    await page.goto(`/compare/${pair(CURATED[0])}`);
    await expect(table(page).locator('thead th')).toHaveCount(CURATED[0].items.length);
    await expect(row(page, 'Use it now').getByRole('link', { name: /^Set it up/ })).toHaveCount(CURATED[0].items.length);
  });
});

test('the text-only view lists the listings and every row', async ({ page }) => {
  await openHydrated(page, `/compare?a=${INSTALLED}&b=${HOSTED}`);
  await page.getByRole('complementary', { name: 'For AI agents' }).getByRole('button', { name: /Switch to text-only view/ }).click();
  const view = page.locator('div.agent-only', { has: page.locator('.agent-section-title', { hasText: 'rows' }) });
  await expect(view).toBeVisible();
  await expect(view.locator('.agent-row .agent-accent').first()).toHaveText(INSTALLED);
  for (const key of ['description', 'access', 'auth', 'mcp', 'cli', 'skills']) {
    await expect(view.locator('.agent-row').filter({ has: page.getByText(new RegExp(`^${key}( \\(same\\))?$`)) })).toHaveCount(1);
  }
});
