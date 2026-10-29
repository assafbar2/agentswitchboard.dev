// Accessibility and keyboard checks for the live site, without axe.
// Everything here reads the page; the only "submit" is a client-side
// validation check that must never reach the network (asserted via `blocked`).
import { test, expect } from './fixtures.mjs';

const KEY_PAGES = [
  '/',
  '/browse',
  '/categories',
  '/categories/code-devtools',
  '/agents/11x-ai',
  '/submit',
  '/for-agents',
  '/about',
];

const UA = { 'user-agent': 'asb-e2e a11y-keyboard' };

async function open(page, path) {
  const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(res?.status(), `${path} status`).toBe(200);
  // Client components (theme toggle, view toggle) mount after hydration.
  await page.waitForLoadState('load');
  await expect(page.getByRole('button', { name: /switch to (dark|light) mode/i })).toBeVisible();
}

/** Visible headings in document order, as {level, text}. */
function visibleHeadings(page) {
  return page.evaluate(() => {
    const vis = (e) =>
      !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) &&
      getComputedStyle(e).visibility !== 'hidden' &&
      !e.closest('[aria-hidden="true"]');
    return [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')]
      .filter(vis)
      .map((h) => ({
        level: h.getAttribute('aria-level') ? Number(h.getAttribute('aria-level')) : Number(h.tagName[1]),
        text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
      }));
  });
}

// ── WCAG contrast helpers (run in the page) ────────────────────────────
const CONTRAST_FN = `
(() => {
  function parse(c) {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function bgOf(el) {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  window.__contrast = (el) => {
    const fg = parse(getComputedStyle(el).color);
    const bg = bgOf(el);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    return { ratio: Math.round(ratio * 100) / 100, fg: getComputedStyle(el).color, bg: 'rgb(' + bg.r + ', ' + bg.g + ', ' + bg.b + ')' };
  };
})();`;

async function contrastOf(locator) {
  await locator.evaluate((_, src) => { if (!window.__contrast) (0, eval)(src); }, CONTRAST_FN);
  return locator.evaluate((el) => window.__contrast(el));
}

/** True when the focused element (or the wrapper it draws its ring on) shows an outline or ring. */
function focusIndicator(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { ok: false, desc: 'body' };
    const has = (e) => {
      const s = getComputedStyle(e);
      const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      const ring = s.boxShadow && s.boxShadow !== 'none';
      return outline || ring;
    };
    // Inputs draw their ring on a focus-within wrapper (search box).
    const ok = has(el) || (el.matches('input,textarea') && el.parentElement && has(el.parentElement));
    const name = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return { ok, desc: `${el.tagName.toLowerCase()} "${name}" outline=${getComputedStyle(el).outlineStyle}/${getComputedStyle(el).outlineWidth}` };
  });
}

// ── Structure on key pages ─────────────────────────────────────────────

test.describe('page structure', () => {
  for (const path of KEY_PAGES) {
    test(`exactly one visible h1 on ${path}`, async ({ page }) => {
      await open(page, path);
      const h1s = (await visibleHeadings(page)).filter((h) => h.level === 1);
      expect(h1s, JSON.stringify(h1s)).toHaveLength(1);
    });
  }

  for (const path of KEY_PAGES) {
    test(`heading levels never skip on ${path}`, async ({ page }) => {
      await open(page, path);
      const hs = await visibleHeadings(page);
      const skips = [];
      for (let i = 1; i < hs.length; i++) {
        if (hs[i].level > hs[i - 1].level + 1) {
          skips.push(`h${hs[i - 1].level} "${hs[i - 1].text}" -> h${hs[i].level} "${hs[i].text}"`);
        }
      }
      expect(skips, `heading skips on ${path}`).toEqual([]);
    });
  }

  for (const path of KEY_PAGES) {
    test(`every link and button has an accessible name on ${path}`, async ({ page }) => {
      await open(page, path);
      // Playwright's role engine computes the accessible name; /\S/ matches any non-empty name.
      const unnamed = [];
      for (const role of ['link', 'button']) {
        const all = await page.getByRole(role).count();
        const named = await page.getByRole(role, { name: /\S/ }).count();
        if (all !== named) unnamed.push(`${all - named} of ${all} ${role}s have no accessible name`);
      }
      expect(unnamed).toEqual([]);
    });
  }

  for (const path of KEY_PAGES) {
    test(`banner, main navigation, main and contentinfo landmarks on ${path}`, async ({ page }) => {
      await open(page, path);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    });
  }

  test('every img on the key pages has an alt attribute', async ({ page }) => {
    const missing = [];
    for (const path of KEY_PAGES) {
      await open(page, path);
      const srcs = await page.$$eval('img:not([alt])', (imgs) => imgs.map((i) => i.currentSrc || i.src));
      for (const s of srcs) missing.push(`${path}: ${s}`);
    }
    expect(missing).toEqual([]);
  });

  test('server HTML declares <html lang="en"> on every key page', async ({ page }) => {
    const bad = [];
    for (const path of KEY_PAGES) {
      const res = await page.request.get(path, { headers: UA });
      const html = await res.text();
      const m = html.match(/<html[^>]*\slang="([^"]+)"/i);
      if (res.status() !== 200 || !m || m[1] !== 'en') bad.push(`${path}: status ${res.status()} lang=${m?.[1]}`);
    }
    expect(bad).toEqual([]);
  });

  test('the agent bar is a labelled complementary landmark before the header', async ({ page }) => {
    await open(page, '/');
    const bar = page.getByRole('complementary', { name: 'For AI agents' });
    await expect(bar).toBeVisible();
    const barFirst = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="For AI agents"]');
      const header = document.querySelector('header');
      return !!(aside && header && aside.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(barFirst).toBe(true);
  });
});

// ── Keyboard ───────────────────────────────────────────────────────────

test.describe('keyboard', () => {
  test('first Tab stop is the agent bar "Switch to text-only view" control', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/Switch to text-only view/);
    expect(await focused.evaluate((el) => !!el.closest('aside[aria-label="For AI agents"]'))).toBe(true);
  });

  test('every one of the first 30 Tab stops on the homepage shows a visible focus indicator', async ({ page }) => {
    await open(page, '/');
    const missing = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const r = await focusIndicator(page);
      if (!r.ok) missing.push(`stop ${i + 1}: ${r.desc}`);
    }
    expect(missing).toEqual([]);
  });

  test('the theme toggle shows a focus ring when reached by keyboard', async ({ page }) => {
    await open(page, '/');
    const toggle = page.getByRole('button', { name: 'Switch to dark mode' });
    // Reach it by Tab, not .focus(), so :focus-visible applies.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      if (await toggle.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(toggle).toBeFocused();
    const r = await focusIndicator(page);
    expect(r.ok, r.desc).toBe(true);
  });

  test('Enter on the agent bar button switches to the text-only view', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-view', 'agent');
    await expect(page.locator('.agent-only').first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('viewMode'))).toBe('agent');
  });

  test('header view toggle exposes aria-pressed and flips it from the keyboard', async ({ page }) => {
    await open(page, '/');
    const group = page.getByRole('group', { name: 'Page view' });
    const human = group.getByRole('button', { name: 'For Humans' });
    const agent = group.getByRole('button', { name: 'For Agents' });
    await expect(human).toHaveAttribute('aria-pressed', 'true');
    await expect(agent).toHaveAttribute('aria-pressed', 'false');
    await agent.focus();
    await page.keyboard.press('Space');
    await expect(agent).toHaveAttribute('aria-pressed', 'true');
    await expect(human).toHaveAttribute('aria-pressed', 'false');
  });

  test('Space on the theme toggle switches to dark and updates its accessible name', async ({ page }) => {
    await open(page, '/');
    await page.getByRole('button', { name: 'Switch to dark mode' }).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)light(\s|$)/);
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeFocused();
  });

  test('homepage search is operable by keyboard: type and Enter opens /browse?q=', async ({ page }) => {
    await open(page, '/');
    const box = page.getByRole('searchbox', { name: 'Look it up' });
    await box.focus();
    await page.keyboard.type('browser');
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/browse\?.*q=browser/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('mobile menu keyboard', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('menu button toggles aria-expanded and reveals the Main nav with Enter', async ({ page }) => {
    await open(page, '/');
    const btn = page.getByRole('button', { name: 'Toggle menu' });
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Browse' })).toBeVisible();
  });
});

// ── Forms ──────────────────────────────────────────────────────────────

test.describe('form labels', () => {
  test('homepage search box is labelled "Look it up" inside a search landmark', async ({ page }) => {
    await open(page, '/');
    const search = page.getByRole('search');
    await expect(search).toHaveCount(1);
    await expect(search.getByLabel('Look it up')).toHaveAttribute('type', 'search');
  });

  test('/browse search box has an accessible name', async ({ page }) => {
    await open(page, '/browse');
    await expect(page.getByRole('searchbox', { name: /\S/ }).first()).toBeVisible();
  });

  test('/submit fields are tied to their visible labels', async ({ page }) => {
    await open(page, '/submit');
    await expect(page.getByLabel('What should we list?')).toHaveJSProperty('tagName', 'TEXTAREA');
    await expect(page.getByLabel('Your email')).toHaveAttribute('type', 'email');
  });

  test('/submit: every visible form control has an accessible name', async ({ page }) => {
    await open(page, '/submit');
    const all = await page.getByRole('textbox').count();
    const named = await page.getByRole('textbox', { name: /\S/ }).count();
    expect(all).toBeGreaterThanOrEqual(2);
    expect(named).toBe(all);
    // The honeypot is out of the accessibility tree and the tab order.
    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(honeypot).toBeHidden();
  });

  test('/submit: Enter on an empty form is stopped by client-side validation (nothing sent)', async ({ page, blocked }) => {
    await open(page, '/submit');
    const ask = page.getByLabel('What should we list?');
    await page.getByRole('button', { name: 'Submit for review' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    expect(await ask.evaluate((el) => el.validity.valueMissing)).toBe(true);
    await expect(ask).toBeFocused();
    expect(blocked).toEqual([]);
  });
});

// ── Thumb-index rail ───────────────────────────────────────────────────

test.describe('rail aria-current', () => {
  test('category page marks only its own rail tab aria-current="page"', async ({ page }) => {
    await open(page, '/categories/code-devtools');
    const rail = page.getByRole('navigation', { name: 'Categories' });
    await expect(rail.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(rail.getByRole('link', { name: 'Code & DevTools' })).toHaveAttribute('aria-current', 'page');
  });

  test('/browse?category=finance marks the Finance rail tab current', async ({ page }) => {
    await open(page, '/browse?category=finance');
    const rail = page.getByRole('navigation', { name: 'Categories' });
    await expect(rail.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(rail.getByRole('link', { name: 'Finance & Accounting', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('homepage rail has no aria-current tab', async ({ page }) => {
    await open(page, '/');
    const rail = page.getByRole('navigation', { name: 'Categories' });
    await expect(rail.getByRole('link').first()).toBeVisible();
    await expect(rail.locator('[aria-current]')).toHaveCount(0);
  });
});

// ── Colour contrast (WCAG AA, 4.5:1) ───────────────────────────────────

function contrastSuite(theme) {
  test.describe(`contrast in ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      if (theme === 'dark') await page.addInitScript(() => { try { localStorage.setItem('theme', 'dark'); } catch {} });
    });

    test(`${theme}: body text on page background`, async ({ page }) => {
      await open(page, '/');
      if (theme === 'dark') await expect(page.locator('html')).not.toHaveClass(/(^|\s)light(\s|$)/);
      else await expect(page.locator('html')).toHaveClass(/(^|\s)light(\s|$)/);
      const c = await contrastOf(page.locator('body'));
      expect(c.ratio, JSON.stringify(c)).toBeGreaterThanOrEqual(4.5);
    });

    test(`${theme}: muted hero subtitle text`, async ({ page }) => {
      await open(page, '/');
      const sub = page.locator('h1 + p');
      const c = await contrastOf(sub);
      expect(c.ratio, JSON.stringify(c)).toBeGreaterThanOrEqual(4.5);
    });

    test(`${theme}: yellow "Find" button text`, async ({ page }) => {
      await open(page, '/');
      const c = await contrastOf(page.getByRole('button', { name: 'Find' }));
      expect(c.bg, 'Find button is the yellow fill').toBe('rgb(255, 212, 0)');
      expect(c.ratio, JSON.stringify(c)).toBeGreaterThanOrEqual(4.5);
    });

    test(`${theme}: yellow agent-bar button and vendor bar links`, async ({ page }) => {
      await open(page, '/');
      const results = [];
      results.push(await contrastOf(page.getByRole('complementary', { name: 'For AI agents' }).getByRole('button', { name: /Switch to text-only view/ })));
      const vendorLinks = page.locator('.dir-bar h3 a');
      const n = Math.min(await vendorLinks.count(), 4);
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) results.push(await contrastOf(vendorLinks.nth(i)));
      const low = results.filter((r) => r.ratio < 4.5);
      expect(low, JSON.stringify(results)).toEqual([]);
    });

    test(`${theme}: agent bar fetch links on the black bar`, async ({ page }) => {
      await open(page, '/');
      const links = page.getByRole('complementary', { name: 'For AI agents' }).getByRole('link');
      await expect(links).toHaveCount(3);
      const low = [];
      for (let i = 0; i < 3; i++) {
        const c = await contrastOf(links.nth(i));
        if (c.ratio < 4.5) low.push(c);
      }
      expect(low).toEqual([]);
    });

    test(`${theme}: /submit "Submit for review" button and help text`, async ({ page }) => {
      await open(page, '/submit');
      const btn = await contrastOf(page.getByRole('button', { name: 'Submit for review' }));
      const help = await contrastOf(page.locator('#submit-visibility'));
      expect([btn, help].filter((r) => r.ratio < 4.5), JSON.stringify([btn, help])).toEqual([]);
    });
  });
}
contrastSuite('light');
contrastSuite('dark');
