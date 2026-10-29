// Mobile and responsive checks for the directory look, against the live site.
// Source of truth: components/Header.tsx (mobile menu, lg breakpoint),
// components/AgentBar.tsx (text-only switch), components/CategoryRail.tsx
// (hidden below lg), components/SearchBar.tsx, app/page.tsx (lg:pr-[88px]).
import { test, expect } from './fixtures.mjs';

const KEY_PAGES = [
  '/',
  '/browse',
  '/categories',
  '/categories/code-devtools',
  '/categories/finance',
  '/agents/claude-code',
  '/agents/cursor',
  '/agents/hronaut',
  '/for-agents',
  '/submit',
];

// Pages that render the thumb-index rail (CategoryRail usages in app/).
const RAIL_PAGES = ['/', '/browse', '/categories', '/categories/code-devtools'];

const MOBILE = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true };
const TABLET = { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true };

async function open(page, path) {
  const res = await page.goto(path, { waitUntil: 'load' });
  expect(res.status(), `${path} status`).toBe(200);
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

/** Overflow info: scroll width plus the elements that stick out past the viewport. */
async function overflowInfo(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1) {
        // Skip descendants of elements whose own overflow clips them.
        let p = el.parentElement, clipped = false;
        while (p && p !== document.body) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') { clipped = true; break; }
          p = p.parentElement;
        }
        if (!clipped) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`);
      }
    }
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: vw, offenders: offenders.slice(0, 5) };
  });
}

function intersects(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

for (const [label, opts] of [['375x812', MOBILE], ['768x1024', TABLET]]) {
  test.describe(`no horizontal scroll at ${label}`, () => {
    test.use(opts);
    for (const path of KEY_PAGES) {
      test(`${path} fits ${label}`, async ({ page }) => {
        await open(page, path);
        const info = await overflowInfo(page);
        expect(info.scrollWidth, `offenders: ${info.offenders.join(' | ')}`).toBeLessThanOrEqual(info.innerWidth);
      });
    }
  });
}

test.describe('mobile 375x812', () => {
  test.use(MOBILE);

  for (const path of RAIL_PAGES) {
    test(`thumb-index rail is hidden on ${path}`, async ({ page }) => {
      await open(page, path);
      // The rail's nav is display:none below lg, so it has no box and no a11y node.
      await expect(page.locator('nav[aria-label="Categories"]')).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Categories' })).toHaveCount(0);
    });
  }

  test('agent bar still exposes the text-only switch and it works', async ({ page }) => {
    await open(page, '/');
    const bar = page.getByRole('complementary', { name: 'For AI agents' });
    await expect(bar).toBeVisible();
    const sw = bar.getByRole('button', { name: /Switch to text-only view/ });
    await expect(sw).toBeVisible();
    const box = await sw.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    await sw.tap();
    await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
    await expect(page.locator('.agent-only').first()).toBeVisible();
    await expect(page.locator('.human-only').first()).toBeHidden();
  });

  test('desktop nav is hidden and the menu toggle is shown', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    const toggle = page.getByRole('button', { name: 'Toggle menu' });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile menu opens with the four main links', async ({ page }) => {
    await open(page, '/');
    await page.getByRole('button', { name: 'Toggle menu' }).tap();
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle menu' })).toHaveAttribute('aria-expanded', 'true');
    const links = nav.getByRole('link');
    await expect(links).toHaveText(['Browse', 'Categories', 'For agents', 'List Your Agent']);
    for (const l of await links.all()) {
      const b = await l.boundingBox();
      expect(b.height, `menu link ${await l.textContent()} height`).toBeGreaterThanOrEqual(40);
    }
  });

  test('every mobile menu link navigates and closes the menu', async ({ page }) => {
    await open(page, '/');
    const targets = [
      ['Browse', '/browse'],
      ['Categories', '/categories'],
      ['For agents', '/for-agents'],
      ['List Your Agent', '/submit'],
    ];
    for (const [name, path] of targets) {
      await page.getByRole('button', { name: 'Toggle menu' }).tap();
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).tap();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    }
  });

  test('mobile menu view toggle switches to the agent view', async ({ page }) => {
    await open(page, '/');
    await page.getByRole('button', { name: 'Toggle menu' }).tap();
    const nav = page.getByRole('navigation', { name: 'Main' });
    const forAgents = nav.getByRole('button', { name: 'For Agents' });
    await expect(forAgents).toHaveAttribute('aria-pressed', 'false');
    await forAgents.tap();
    await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
    await expect(nav.getByRole('button', { name: 'For Agents' })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('viewMode'))).toBe('agent');
  });

  test('primary controls on the homepage are at least 40px tall', async ({ page }) => {
    await open(page, '/');
    const controls = {
      'text-only switch': page.getByRole('complementary', { name: 'For AI agents' }).getByRole('button', { name: /Switch to text-only view/ }),
      'menu toggle': page.getByRole('button', { name: 'Toggle menu' }),
      'theme toggle': page.getByRole('button', { name: /Switch to (dark|light) mode/ }),
      'search box': page.getByRole('searchbox', { name: 'Look it up' }),
      'Find button': page.getByRole('button', { name: 'Find' }),
      'fetch /llms.txt': page.getByRole('complementary', { name: 'For AI agents' }).getByRole('link', { name: '/llms.txt' }),
    };
    const short = [];
    for (const [name, loc] of Object.entries(controls)) {
      await expect(loc, name).toBeVisible();
      const b = await loc.boundingBox();
      if (b.height < 40 || b.width < 24) short.push(`${name} ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    expect(short).toEqual([]);
  });

  test('submit page submit button is a full touch target', async ({ page, blocked }) => {
    await open(page, '/submit');
    const btn = page.locator('form button[type="submit"]').first();
    await expect(btn).toBeVisible();
    const b = await btn.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(40);
    expect(b.x + b.width).toBeLessThanOrEqual(375);
    expect(blocked).toEqual([]);
  });

  test('homepage search is usable on mobile and lands on browse results', async ({ page }) => {
    await open(page, '/');
    const box = page.getByRole('searchbox', { name: 'Look it up' });
    const b = await box.boundingBox();
    expect(b.width, 'search box width').toBeGreaterThanOrEqual(200);
    await box.tap();
    await box.fill('code');
    await page.getByRole('button', { name: 'Find' }).tap();
    await expect(page).toHaveURL(/\/browse\?q=code$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Results for');
    await expect(page.locator('.human-only p.dir-bar')).toContainText(/\d+ agents? matched/);
    const info = await overflowInfo(page);
    expect(info.scrollWidth, info.offenders.join(' | ')).toBeLessThanOrEqual(info.innerWidth);
  });

  for (const path of ['/', '/agents/claude-code', '/agents/cursor', '/agents/hronaut']) {
    test(`images stay inside the viewport on ${path}`, async ({ page }) => {
      await open(page, path);
      const bad = await page.evaluate(() => {
        const vw = window.innerWidth;
        return [...document.images]
          .filter((img) => {
            const r = img.getBoundingClientRect();
            return r.width > 0 && (r.left < -1 || r.right > vw + 1 || r.width > vw);
          })
          .map((img) => `${img.currentSrc || img.src} ${Math.round(img.getBoundingClientRect().width)}px`);
      });
      expect(bad).toEqual([]);
    });
  }

  for (const path of ['/', '/browse', '/agents/claude-code', '/for-agents', '/submit']) {
    test(`body prose (not muted captions) is at least 14px on ${path}`, async ({ page }) => {
      await open(page, path);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('main p, main li, main dd, main label')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            // Muted captions and notes (subtitles, "last updated") are small on purpose.
            if (el.closest('[class*="dir-muted"]')) return false;
            // Only elements that carry their own prose, not wrappers.
            const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
            return ownText.length >= 20 && parseFloat(getComputedStyle(el).fontSize) < 14;
          })
          .map((el) => `${el.tagName.toLowerCase()} ${getComputedStyle(el).fontSize} "${el.textContent.trim().slice(0, 50)}"`)
          .slice(0, 8)
      );
      expect(small).toEqual([]);
    });
  }
});

test.describe('tablet 768x1024', () => {
  test.use(TABLET);

  test('rail stays hidden and the menu toggle is used below lg', async ({ page }) => {
    await open(page, '/categories/code-devtools');
    await expect(page.locator('nav[aria-label="Categories"]')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Toggle menu' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'For AI agents' }).getByRole('button', { name: /Switch to text-only view/ })).toBeVisible();
  });
});

for (const width of [1024, 1440]) {
  test.describe(`rail vs content at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const path of RAIL_PAGES) {
      test(`rail does not overlap content on ${path} at ${width}`, async ({ page }) => {
        await open(page, path);
        const nav = page.locator('nav[aria-label="Categories"]');
        await expect(nav).toBeVisible();
        const result = await page.evaluate(() => {
          const rail = document.querySelector('nav[aria-label="Categories"]').parentElement;
          const rr = rail.getBoundingClientRect();
          const railBox = { x: rr.x, y: rr.y + window.scrollY, width: rr.width, height: rr.height };
          const hits = [];
          const content = document.querySelectorAll('main .human-only h1, main .human-only h2, main .human-only p, main .human-only a, main .human-only input, main .human-only button, main .human-only .container-wide');
          for (const el of content) {
            if (rail.contains(el)) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            const b = { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
            if (b.x < railBox.x + railBox.width && railBox.x < b.x + b.width && b.y < railBox.y + railBox.height && railBox.y < b.y + b.height) {
              hits.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 40)}" x=${Math.round(b.x)}..${Math.round(b.x + b.width)} vs rail x=${Math.round(railBox.x)}`);
            }
          }
          return { railBox, hits: hits.slice(0, 6) };
        });
        expect(result.railBox.x + result.railBox.width).toBeLessThanOrEqual(width + 1);
        expect(result.hits).toEqual([]);
        // The h1 specifically must sit left of the rail.
        const h1 = await page.getByRole('heading', { level: 1 }).first().boundingBox();
        expect(intersects(h1, { ...result.railBox, y: result.railBox.y })).toBe(false);
      });
    }
  });
}
