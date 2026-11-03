// What's new: /whats-new (each release's highlights from CHANGELOG.md, each
// with a Try it link), the homepage block that shows the newest release's
// highlights for 30 days after it, and the feeds of every release and weekly
// drop at /feed.xml (RSS) and /atom.xml (Atom).
// Read-only: only GETs (via fetch at collection time, page.goto and page.request).
import { test, expect } from './fixtures.mjs';
import { BASE } from '../target.mjs';

const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (live whats-new tests)' };
const FIRST_VERSION = '2.2.0';
const MAX_HIGHLIGHTS = 5;
const MAX_ENTRIES = 30;

// The first of the 30 days that count as new, as /new states it: the homepage
// shows a release's highlights while the release is no older than that.
const NEW_HTML = await (await fetch(`${BASE}/new`, { headers: UA })).text();
const SINCE = NEW_HTML.match(/<time datetime="(\d{4}-\d{2}-\d{2})"/i)?.[1];

const human = (page) => page.locator('.human-only');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const versionOf = (anchor) => anchor.slice(1).replaceAll('-', '.');
const events = (page, name) =>
  page.evaluate((n) => (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === n).map(([, e]) => e.data), name);

async function openHydrated(page, path) {
  await page.goto(path);
  await expect(page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'For Humans' })).toBeVisible();
}

/** Each highlight row in `list`: its text, Try it link and release. */
function highlightsIn(list) {
  return list.locator('li').evaluateAll((rows) =>
    rows.map((li) => {
      const link = li.querySelector('a[data-try]');
      return {
        text: document.getElementById(link.getAttribute('aria-describedby')).textContent.trim(),
        href: link.getAttribute('href'),
        release: link.dataset.try,
        label: link.textContent.replace(/\s+/g, ' ').trim(),
      };
    })
  );
}

/** The releases /whats-new shows, newest first. */
async function releasesOn(page) {
  const sections = human(page).locator('section[aria-labelledby^="v"]');
  const releases = [];
  for (const section of await sections.all()) {
    const anchor = await section.getAttribute('aria-labelledby');
    releases.push({
      anchor,
      version: versionOf(anchor),
      heading: (await section.getByRole('heading', { level: 2 }).textContent()).replace(/\s+/g, ' ').trim(),
      date: await section.locator('h2 time').getAttribute('datetime'),
      highlights: await highlightsIn(section.locator('ul')),
      notes: await section.locator('a[href^="/changelog#"]').getAttribute('href'),
    });
  }
  return releases;
}

function compareVersions(a, b) {
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number));
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

/** A feed, parsed by the browser's XML parser: RSS items or Atom entries, in order. */
async function readFeed(page, path) {
  const res = await page.request.get(path, { headers: UA });
  expect(res.status(), path).toBe(200);
  const type = res.headers()['content-type'];
  const feed = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const error = doc.getElementsByTagName('parsererror')[0];
    if (error) return { error: error.textContent };
    const kids = (el, name) => [...el.children].filter((c) => c.localName === name);
    const text1 = (el, name) => kids(el, name)[0]?.textContent ?? null;
    const root = doc.documentElement;
    if (root.localName === 'rss') {
      const channel = kids(root, 'channel')[0];
      return {
        root: `rss ${root.getAttribute('version')}`,
        title: text1(channel, 'title'),
        self: kids(channel, 'link').find((l) => l.namespaceURI === 'http://www.w3.org/2005/Atom')?.getAttribute('href'),
        entries: kids(channel, 'item').map((i) => ({
          url: text1(i, 'link'),
          id: text1(i, 'guid'),
          title: text1(i, 'title'),
          date: new Date(text1(i, 'pubDate')).toISOString(),
          html: text1(i, 'description'),
        })),
      };
    }
    return {
      root: `${root.localName} ${root.namespaceURI}`,
      title: text1(root, 'title'),
      id: text1(root, 'id'),
      updated: text1(root, 'updated'),
      self: kids(root, 'link').find((l) => l.getAttribute('rel') === 'self')?.getAttribute('href'),
      entries: kids(root, 'entry').map((e) => ({
        url: kids(e, 'link')[0]?.getAttribute('href'),
        id: text1(e, 'id'),
        title: text1(e, 'title'),
        date: new Date(text1(e, 'updated')).toISOString(),
        contentType: kids(e, 'content')[0]?.getAttribute('type'),
        html: text1(e, 'content'),
      })),
    };
  }, await res.text());
  expect(feed.error, `${path} is well-formed XML`).toBeUndefined();
  return { type, ...feed };
}

const linksIn = (html) => [...html.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map(([, href, label]) => ({ href: href.replaceAll('&amp;', '&'), label }));

test('the sitemap lists /whats-new', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml', { headers: UA })).text();
  expect(xml).toContain(`<loc>${ORIGIN}/whats-new</loc>`);
});

test.describe('/whats-new', () => {
  test(`200, h1 "What's new", and one section per release from ${FIRST_VERSION} on, newest first`, async ({ page }) => {
    const res = await page.goto('/whats-new');
    expect(res.status()).toBe(200);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText("What's new");
    await expect(page).toHaveTitle(/^What's new/);
    const releases = await releasesOn(page);
    const versions = releases.map((r) => r.version);
    expect(versions.at(-1)).toBe(FIRST_VERSION);
    expect([...versions].sort(compareVersions).reverse()).toEqual(versions);
    expect(releases.map((r) => r.date)).toEqual(releases.map((r) => r.date).sort().reverse());
    const jumps = await human(page).locator('h1 ~ p a[href^="#"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(jumps).toEqual([...releases.map((r) => `#${r.anchor}`), '#follow']);
  });

  test(`each release has 1 to ${MAX_HIGHLIGHTS} highlights, each with a Try it link that names it, and links its notes`, async ({ page }) => {
    await page.goto('/whats-new');
    for (const r of await releasesOn(page)) {
      expect(r.heading, r.anchor).toMatch(new RegExp(`^${escapeRe(r.version)} · \\S.* · [A-Z][a-z]{2} \\d{1,2}, \\d{4}$`));
      expect(r.highlights.length, r.version).toBeGreaterThan(0);
      expect(r.highlights.length, r.version).toBeLessThanOrEqual(MAX_HIGHLIGHTS);
      for (const h of r.highlights) {
        expect(h.text.length, `${r.version} highlight text`).toBeGreaterThan(20);
        expect(h.label).toBe('Try it →');
        expect(h.release).toBe(r.version);
        expect(h.href, `${r.version}: ${h.text}`).toMatch(/^\/(?!\/)/);
      }
      expect(r.notes).toBe(`/changelog#${r.anchor}`);
    }
  });

  test('every Try it link opens a page, and any part of the page it points to is on it', async ({ page }) => {
    await page.goto('/whats-new');
    const hrefs = [...new Set((await releasesOn(page)).flatMap((r) => r.highlights.map((h) => h.href)))];
    const bad = [];
    for (const href of hrefs) {
      const url = new URL(href, ORIGIN);
      const res = await page.request.get(url.pathname + url.search, { headers: UA });
      if (res.status() !== 200) bad.push(`${href} -> ${res.status()}`);
      else if (!(res.headers()['content-type'] ?? '').startsWith('text/html')) bad.push(`${href} is not a page`);
      else if (url.hash && !(await res.text()).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) bad.push(`${href}: no ${url.hash}`);
    }
    expect(bad).toEqual([]);
  });

  test("each release's notes are on /changelog where /whats-new links them", async ({ page }) => {
    await page.goto('/whats-new');
    const releases = await releasesOn(page);
    await page.goto('/changelog');
    for (const r of releases) await expect(page.locator(`article#${r.anchor} h3`), r.version).toContainText(r.version);
    await expect(human(page).locator('a[href="/whats-new"]').first()).toHaveText("What's new");
  });

  test('ends with the feeds to follow, each address with a copy button, then the full changelog', async ({ page }) => {
    await openHydrated(page, '/whats-new');
    const follow = human(page).locator('section[aria-labelledby="follow"]');
    await expect(follow.getByRole('heading', { level: 2 })).toHaveText('Follow along');
    for (const [format, path] of [['RSS', '/feed.xml'], ['Atom', '/atom.xml']]) {
      const row = follow.locator('li').filter({ hasText: format });
      await expect(row.getByRole('link')).toHaveAttribute('href', path);
      await expect(row.getByRole('link')).toHaveText(`${ORIGIN}${path}`);
      await expect(row.getByRole('button', { name: `Copy the ${format} feed address` })).toBeVisible();
    }
    await expect(human(page).locator('a[href="/changelog#releases"]').last()).toHaveText(
      new RegExp(`^Every release, including those before ${escapeRe(FIRST_VERSION)}`)
    );
  });

  test('has its own share card, naming the newest release', async ({ page }) => {
    await page.goto('/whats-new');
    const [newest] = await releasesOn(page);
    const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    expect(og).toBe(await page.locator('meta[name="twitter:image"]').first().getAttribute('content'));
    expect(og).toMatch(new RegExp(`^${escapeRe(`${ORIGIN}/whats-new/card.png`)}\\?v=[0-9a-f]{8}$`));
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      'content',
      new RegExp(`^What's new on Agent Switchboard: ${escapeRe(newest.version)}, `)
    );
    const card = await page.request.get(og.replace(ORIGIN, ''), { headers: UA });
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toContain('image/png');
    const buf = await card.body();
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  test('counts whats_new_try_click with the release, the page it opens and where it was clicked', async ({ page }) => {
    await openHydrated(page, '/whats-new');
    const releases = await releasesOn(page);
    const target = releases.flatMap((r) => r.highlights).find((h) => !h.href.startsWith('/whats-new'));
    await human(page).locator(`a[data-try][href="${target.href}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${escapeRe(target.href.split('#')[0])}(#.*)?$`));
    expect(await events(page, 'whats_new_try_click')).toEqual([{ release: target.release, path: target.href, from: 'whats-new' }]);
  });

  test('text-only view lists every highlight with the page to try it, then the feeds', async ({ page }) => {
    await page.goto('/whats-new');
    const releases = await releasesOn(page);
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/whats-new');
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(human(page).first()).toBeHidden();
    const hrefs = await agentView.locator('a.agent-row').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual([
      ...releases.flatMap((r) => r.highlights.map((h) => h.href)),
      '/feed.xml',
      '/atom.xml',
      '/changelog#releases',
      '/new',
    ]);
  });
});

test.describe('homepage', () => {
  test(`shows the newest release's highlights while it is new (since ${SINCE}), then one line`, async ({ page }) => {
    expect(SINCE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await page.goto('/whats-new');
    const [newest] = await releasesOn(page);
    await page.goto('/');
    const block = human(page).locator('section[aria-labelledby="whats-new"]');
    const drop = human(page).locator('a[href^="/drops/20"]').first();
    if (newest.date >= SINCE) {
      await expect(block.getByRole('heading', { level: 2 })).toHaveText(
        new RegExp(`^What's new · ${escapeRe(newest.version)} \\S.* · [A-Z][a-z]{2} \\d{1,2}, \\d{4}$`)
      );
      expect(await highlightsIn(block.locator('ul'))).toEqual(newest.highlights);
      await expect(block.locator('a[href="/whats-new"]')).toContainText('Everything new on the site');
      expect((await block.boundingBox()).y, 'above the latest drop').toBeLessThan((await drop.boundingBox()).y);
    } else {
      await expect(block).toHaveCount(0);
      const row = human(page).locator('a.dir-row[href="/whats-new"]');
      await expect(row).toContainText("What's new on the site");
      await expect(row).toContainText(`${newest.version} · `);
      expect((await row.boundingBox()).y, 'above the latest drop').toBeLessThan((await drop.boundingBox()).y);
    }
  });

  test('a Try it link there counts whats_new_try_click from the homepage', async ({ page }) => {
    await openHydrated(page, '/');
    const links = human(page).locator('section[aria-labelledby="whats-new"] a[data-try]');
    test.skip((await links.count()) === 0, 'the newest release is more than 30 days old');
    const [target] = await highlightsIn(human(page).locator('section[aria-labelledby="whats-new"] ul'));
    await links.first().click();
    await expect(page).toHaveURL(new RegExp(`${escapeRe(target.href.split('#')[0])}(#.*)?$`));
    expect(await events(page, 'whats_new_try_click')).toEqual([{ release: target.release, path: target.href, from: 'home' }]);
  });

  test('text-only view links /whats-new and the feed', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/');
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(agentView.locator('a[href="/whats-new"]')).toContainText('/whats-new');
    await expect(agentView.locator('a[href="/feed.xml"]')).toHaveText('/feed.xml');
  });
});

test.describe('feeds', () => {
  test(`/feed.xml is RSS 2.0: releases and drops, newest first, at most ${MAX_ENTRIES}`, async ({ page }) => {
    const rss = await readFeed(page, '/feed.xml');
    expect(rss.type).toBe('application/rss+xml; charset=utf-8');
    expect(rss.root).toBe('rss 2.0');
    expect(rss.title).toBe('Agent Switchboard');
    expect(rss.self).toBe(`${ORIGIN}/feed.xml`);
    expect(rss.entries.length).toBeGreaterThan(1);
    expect(rss.entries.length).toBeLessThanOrEqual(MAX_ENTRIES);
    expect(rss.entries.map((e) => e.date)).toEqual(rss.entries.map((e) => e.date).sort().reverse());
    for (const e of rss.entries) {
      expect(e.id, e.title).toBe(e.url);
      expect(e.url, e.title).toMatch(new RegExp(`^${escapeRe(ORIGIN)}/(whats-new|changelog)#v\\d+-\\d+-\\d+$|^${escapeRe(ORIGIN)}/drops/\\d{4}-\\d{2}-\\d{2}$`));
      expect(e.title).toMatch(/^Agent Switchboard \d+\.\d+\.\d+: \S|^The [A-Z][a-z]{2} \d{1,2}, \d{4} drop: \S/);
    }
  });

  test("a release's entry has its highlights with their Try it links, as /whats-new shows them", async ({ page }) => {
    await page.goto('/whats-new');
    const [newest] = await releasesOn(page);
    const rss = await readFeed(page, '/feed.xml');
    const entry = rss.entries.find((e) => e.url === `${ORIGIN}/whats-new#${newest.anchor}`);
    expect(entry, `${newest.version} is in the feed`).toBeTruthy();
    expect(entry.title).toBe(`Agent Switchboard ${newest.version}: ${newest.heading.split(' · ')[1]}`);
    expect(entry.date.slice(0, 10)).toBe(newest.date);
    expect(linksIn(entry.html)).toEqual([
      ...newest.highlights.map((h) => ({ href: `${ORIGIN}${h.href}`, label: 'Try it' })),
      { href: `${ORIGIN}/changelog#${newest.anchor}`, label: `All the notes for ${newest.version}` },
    ]);
  });

  test("the newest drop's entry names what it added and links the drop", async ({ page }) => {
    const drops = await (await page.request.get('/drops', { headers: UA })).text();
    const date = drops.match(/href="\/drops\/(\d{4}-\d{2}-\d{2})"/)?.[1];
    expect(date).toBeTruthy();
    const rss = await readFeed(page, '/feed.xml');
    const entry = rss.entries.find((e) => e.url === `${ORIGIN}/drops/${date}`);
    expect(entry, `the ${date} drop is in the feed`).toBeTruthy();
    expect(entry.html).toMatch(/<p><strong>Added \([\d,]+\)<\/strong>: <a href="https:\/\/agentswitchboard\.dev\/agents\//);
    expect(linksIn(entry.html).at(-1)).toEqual({ href: `${ORIGIN}/drops/${date}`, label: 'See the drop' });
    const listing = linksIn(entry.html)[0].href.replace(ORIGIN, '');
    expect((await page.request.get(listing, { headers: UA })).status(), listing).toBe(200);
  });

  test('/atom.xml is Atom 1.0 with the same entries, in the same order', async ({ page }) => {
    const atom = await readFeed(page, '/atom.xml');
    const rss = await readFeed(page, '/feed.xml');
    expect(atom.type).toBe('application/atom+xml; charset=utf-8');
    expect(atom.root).toBe('feed http://www.w3.org/2005/Atom');
    expect(atom.id).toBe(`${ORIGIN}/atom.xml`);
    expect(atom.self).toBe(`${ORIGIN}/atom.xml`);
    expect(atom.updated).toBe(atom.entries[0].date.replace('.000Z', 'Z'));
    expect(atom.entries.map((e) => [e.id, e.url, e.title, e.date, e.html])).toEqual(
      rss.entries.map((e) => [e.url, e.url, e.title, e.date, e.html])
    );
    for (const e of atom.entries) expect(e.contentType).toBe('html');
  });

  test('every page points feed readers to both feeds', async ({ page }) => {
    for (const path of ['/', '/whats-new', '/agents/box-mcp']) {
      await page.goto(path);
      const feeds = await page.locator('head link[rel="alternate"][type$="+xml"]').evaluateAll((els) =>
        els.map((e) => [e.getAttribute('type'), e.getAttribute('href')])
      );
      expect(feeds, path).toEqual([
        ['application/rss+xml', '/feed.xml'],
        ['application/atom+xml', '/atom.xml'],
      ]);
    }
  });

  test('/for-agents, llms.txt and index.md point to /whats-new and the feeds', async ({ page }) => {
    await page.goto('/for-agents');
    for (const href of ['/whats-new', '/feed.xml', '/atom.xml']) await expect(page.getByRole('main').locator(`a[href="${href}"]`)).toHaveCount(1);
    for (const path of ['/llms.txt', '/index.md']) {
      const body = await (await page.request.get(path, { headers: UA })).text();
      for (const url of ['/whats-new', '/feed.xml', '/atom.xml']) expect(body, `${path} mentions ${url}`).toContain(`${ORIGIN}${url}`);
    }
  });
});

test.describe('copying a feed address', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the RSS address and counts feed_copy', async ({ page }) => {
    await openHydrated(page, '/whats-new');
    // Found by its row: the button's name changes to "Copied…" on click.
    const button = human(page).locator('section[aria-labelledby="follow"] li').filter({ hasText: 'RSS' }).getByRole('button');
    await expect(button).toHaveAccessibleName('Copy the RSS feed address');
    await button.click();
    await expect(button).toHaveText(/Copied/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ORIGIN}/feed.xml`);
    expect(await events(page, 'feed_copy')).toEqual([{ format: 'RSS' }]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('/whats-new lists every highlight with its Try it link and both feed addresses', async ({ page }) => {
    await page.goto('/whats-new');
    const releases = await releasesOn(page);
    expect(releases.length).toBeGreaterThan(0);
    for (const r of releases) expect(r.highlights.length, r.version).toBeGreaterThan(0);
    await expect(human(page).locator('section[aria-labelledby="follow"]')).toContainText(`${ORIGIN}/feed.xml`);
    await expect(human(page).locator('section[aria-labelledby="follow"]')).toContainText(`${ORIGIN}/atom.xml`);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  for (const path of ['/whats-new', '/']) {
    test(`${path}: no sideways scroll, and every Try it link is a 44px tap target`, async ({ page }) => {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw).toBeLessThanOrEqual(cw + 1);
      const heights = await human(page).locator('a[data-try]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      test.skip(path === '/' && heights.length === 0, 'the newest release is more than 30 days old');
      expect(heights.length).toBeGreaterThan(0);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
    });
  }

  test('text-only /whats-new: no sideways scroll', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/whats-new');
    await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
    await page.waitForLoadState('load');
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw + 1);
  });
});
