// Content pages, header and footer navigation, 404 page, and the /submit form.
// Live production site: everything here is GET-only, and the submit test relies
// on the shared fixture's guard to intercept the server-action POST.
import { test, expect } from './fixtures.mjs';

const UA = { 'user-agent': 'asb-e2e (content-pages-nav)' };
const BRAND = 'Agent Switchboard';

// components/Header.tsx navLinks
const HEADER_NAV = [
  { href: '/browse', label: 'Browse', h1: null },
  { href: '/categories', label: 'Categories', h1: null },
  { href: '/for-agents', label: 'For agents', h1: 'Agent Switchboard' },
  { href: '/submit', label: 'List Your Agent', h1: 'List Your Agent' },
];

// components/Footer.tsx footerLinks
const FOOTER_GROUPS = {
  Directory: ['/browse', '/categories', '/tasks', '/drops', '/stacks', '/submit'],
  Resources: ['/for-agents#mcp', '/connect', '/for-agents', '/changelog', '/pro', '/advertise'],
  Company: ['/about', '/contact', 'https://github.com/assafbar2/agentswitchboard.dev', '/privacy', '/terms', '/disclaimer'],
};

// app/<page>/page.tsx metadata.title + h1
const CONTENT_PAGES = [
  { path: '/about', title: 'About', h1: 'About Agent Switchboard' },
  { path: '/connect', title: 'Use with Grok, Claude, ChatGPT', h1: 'Use with Grok, Claude, ChatGPT' },
  { path: '/for-agents', title: 'For AI Agents', h1: 'Agent Switchboard' },
  { path: '/changelog', title: 'Changelog', h1: 'Changelog' },
  { path: '/contact', title: 'Contact', h1: 'Contact' },
  { path: '/privacy', title: 'Privacy', h1: 'Privacy' },
  { path: '/terms', title: 'Terms of Use', h1: 'Terms of Use' },
  { path: '/disclaimer', title: 'Disclaimer', h1: 'Disclaimer' },
  { path: '/advertise', title: 'Advertise', h1: 'Advertise with Us' },
  { path: '/pro', title: 'Pro Access', h1: 'Pro Access' },
  { path: '/submit', title: 'List Your Agent', h1: 'List Your Agent' },
];

const LEGAL_PAGES = ['/privacy', '/terms', '/disclaimer', '/contact', '/about'];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function getStatus(page, url) {
  const res = await page.request.get(url, { headers: UA, maxRedirects: 5 });
  return res.status();
}

test.describe('header navigation', () => {
  test('header nav exposes exactly the four main links', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const hrefs = await nav.getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(HEADER_NAV.map((l) => l.href));
  });

  for (const link of HEADER_NAV) {
    test(`header link ${link.href} resolves with 200`, async ({ page }) => {
      expect(await getStatus(page, link.href)).toBe(200);
    });
  }

  for (const link of HEADER_NAV) {
    test(`clicking header "${link.label}" navigates to ${link.href}`, async ({ page }) => {
      await page.goto('/about');
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: link.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${escapeRe(link.href)}$`));
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();
      if (link.h1) await expect(h1).toContainText(link.h1);
    });
  }

  test('logo link returns to the homepage', async ({ page }) => {
    await page.goto('/privacy');
    await page.getByRole('banner').getByRole('link', { name: BRAND, exact: true }).click();
    await expect(page).toHaveURL(/agentswitchboard\.dev\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every AI Agent Worth Knowing');
  });

  test('agent bar /api/mcp link points at the MCP connect docs, not the raw endpoint', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByRole('complementary', { name: 'For AI agents' });
    const mcp = bar.getByRole('link', { name: '/api/mcp' });
    await expect(mcp).toHaveAttribute('href', '/for-agents#mcp');
    await mcp.click();
    await expect(page).toHaveURL(/\/for-agents#mcp$/);
    await expect(page.locator('#mcp')).toBeInViewport();
  });
});

test.describe('footer navigation', () => {
  for (const [group, expected] of Object.entries(FOOTER_GROUPS)) {
    test(`footer "${group}" links are present and every one resolves`, async ({ page }) => {
      await page.goto('/');
      const footer = page.getByRole('contentinfo');
      const col = footer.locator('div').filter({ has: page.getByRole('heading', { name: group, exact: true }) }).last();
      const hrefs = await col.getByRole('link').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs).toEqual(expected);
      const bad = [];
      for (const href of hrefs) {
        const url = href.startsWith('http') ? href : href.split('#')[0];
        const status = await getStatus(page, url);
        if (status !== 200) bad.push(`${href} -> ${status}`);
      }
      expect(bad, 'footer links not returning 200').toEqual([]);
    });
  }

  test('clicking footer "About" and "Terms of Use" navigates to those pages', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await footer.getByRole('link', { name: 'About', exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Agent Switchboard');
    // "Terms of Use" appears twice in the footer (group + bottom bar); either works.
    await page.getByRole('contentinfo').getByRole('link', { name: 'Terms of Use' }).first().click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of Use');
  });

  test('footer GitHub link is external, https, and opens safely in a new tab', async ({ page }) => {
    await page.goto('/');
    const gh = page.getByRole('contentinfo').getByRole('link', { name: 'GitHub', exact: true });
    await expect(gh).toHaveAttribute('href', /^https:\/\/github\.com\//);
    await expect(gh).toHaveAttribute('target', '_blank');
    await expect(gh).toHaveAttribute('rel', /noopener/);
  });
});

test.describe('content pages', () => {
  for (const p of CONTENT_PAGES) {
    test(`${p.path} returns 200 with h1 "${p.h1}" and title "${p.title}"`, async ({ page }) => {
      const res = await page.goto(p.path);
      expect(res.status()).toBe(200);
      const h1s = page.getByRole('heading', { level: 1 });
      await expect(h1s).toHaveCount(1);
      await expect(h1s).toHaveText(p.h1);
      await expect(page).toHaveTitle(new RegExp(`^${escapeRe(p.title)}`));
      expect(await page.title()).toContain(BRAND);
    });
  }

  test('page titles carry the brand name exactly once (no "X — Agent Switchboard | Agent Switchboard")', async ({ page }) => {
    const dupes = [];
    for (const p of CONTENT_PAGES) {
      await page.goto(p.path);
      const t = await page.title();
      if (t.split(BRAND).length - 1 !== 1) dupes.push(`${p.path}: "${t}"`);
    }
    expect(dupes).toEqual([]);
  });

  test('/for-agents#mcp section shows the MCP config with the production endpoint', async ({ page }) => {
    await page.goto('/for-agents#mcp');
    const mcp = page.locator('section#mcp');
    await expect(mcp).toBeVisible();
    await expect(mcp.getByRole('heading', { level: 2 })).toContainText('MCP server');
    const cfg = mcp.locator('pre');
    await expect(cfg).toContainText('"mcpServers"');
    await expect(cfg).toContainText('"url": "https://agentswitchboard.dev/api/mcp"');
    await expect(mcp).toContainText('npx -y mcp-remote https://agentswitchboard.dev/api/mcp');
  });

  test('/connect#grok-bot explains the one-time setup, @bot tagging, and where answers land', async ({ page }) => {
    await page.goto('/connect#grok-bot');
    const section = page.locator('section#grok-bot');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { level: 2 })).toHaveText('Use it from Grok Bot / X');
    await expect(section).toContainText('Add a custom MCP server named Agent Switchboard at https://agentswitchboard.dev/api/mcp');
    await expect(section).toContainText('@bot find alternatives to this on Agent Switchboard');
    await expect(section).toContainText('not as a reply on X');
    await expect(section).toContainText('the EU, the UK, Australia');
    await expect(section).toContainText('not affiliated with or endorsed by xAI');
    await expect(section.getByRole('link', { name: 'x.ai/bot' })).toHaveAttribute('href', 'https://x.ai/bot');
  });

  test('in-page anchors linked from content pages exist (#verification, #rules)', async ({ page }) => {
    await page.goto('/about#verification');
    await expect(page.locator('#verification')).toBeVisible();
    await page.goto('/submit#rules');
    await expect(page.locator('#rules')).toBeVisible();
    await expect(page.locator('#rules').getByRole('heading', { level: 2 })).toHaveText('What gets accepted');
  });

  for (const path of LEGAL_PAGES) {
    test(`body links on ${path} are visible and underlined`, async ({ page }) => {
      await page.goto(path);
      const links = page.getByRole('main').locator('a[href]');
      const n = await links.count();
      expect(n).toBeGreaterThan(0);
      const offenders = await links.evaluateAll((els) =>
        els
          .filter((a) => {
            const r = a.getBoundingClientRect();
            const cs = getComputedStyle(a);
            const visible = r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0';
            const underlined = cs.textDecorationLine.includes('underline');
            return !(visible && underlined);
          })
          .map((a) => `${a.textContent.trim()} (${a.getAttribute('href')}): ${getComputedStyle(a).textDecorationLine}`)
      );
      expect(offenders).toEqual([]);
    });
  }

  test('every external link on the content pages uses https', async ({ page }) => {
    const insecure = [];
    for (const p of CONTENT_PAGES) {
      await page.goto(p.path);
      const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((e) => e.href));
      for (const h of hrefs) {
        if (/^(mailto:|tel:|javascript:)/.test(h)) continue;
        const u = new URL(h);
        if (u.protocol !== 'https:') insecure.push(`${p.path}: ${h}`);
      }
    }
    expect(insecure).toEqual([]);
  });

  test('internal body links on content pages all resolve (GET 200)', async ({ page }) => {
    // /changelog links every agent, so agent detail pages are sampled (first 5)
    // instead of crawling hundreds of them; every non-agent internal link is checked.
    const seen = new Set();
    const agentPages = [];
    for (const p of CONTENT_PAGES) {
      await page.goto(p.path);
      const hrefs = await page.getByRole('main').locator('a[href]').evaluateAll((els) => els.map((e) => e.href));
      for (const h of hrefs) {
        const u = new URL(h);
        if (u.host !== 'agentswitchboard.dev') continue;
        if (u.pathname.startsWith('/agents/')) {
          if (!agentPages.includes(u.pathname)) agentPages.push(u.pathname);
          continue;
        }
        seen.add(u.pathname);
      }
    }
    expect(agentPages.length).toBeGreaterThan(0);
    agentPages.slice(0, 5).forEach((a) => seen.add(a));
    expect(seen.size).toBeGreaterThan(5);
    expect(seen.size).toBeLessThan(60);
    const bad = [];
    for (const path of seen) {
      const s = await getStatus(page, path);
      if (s !== 200) bad.push(`${path} -> ${s}`);
    }
    expect(bad).toEqual([]);
  });

  test('content pages log no app console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      // aborted analytics beacons / blocked writes from the test guard are not app errors
      if (/_vercel|insights|sentry|ERR_FAILED|net::|418/i.test(t)) return;
      errors.push(`${page.url()}: ${t}`);
    });
    page.on('pageerror', (e) => errors.push(`${page.url()}: pageerror ${e.message}`));
    for (const p of CONTENT_PAGES) {
      await page.goto(p.path, { waitUntil: 'networkidle' });
    }
    expect(errors).toEqual([]);
  });
});

test.describe('404 page', () => {
  test('an unknown URL returns HTTP 404 with the custom not-found page', async ({ page }) => {
    const res = await page.goto('/definitely-not-a-page-asb-e2e-7f3k');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/404\s*—\s*no agent on this line/);
    await expect(page).toHaveTitle(/^Not Found/);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
  });

  test('an unknown agent slug also returns HTTP 404', async ({ page }) => {
    const res = await page.goto('/agents/no-such-agent-asb-e2e-7f3k');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
  });

  test('404 page "Back to home" link goes home', async ({ page }) => {
    await page.goto('/definitely-not-a-page-asb-e2e-7f3k');
    await page.getByRole('main').getByRole('link', { name: 'Back to home' }).click();
    await expect(page).toHaveURL(/agentswitchboard\.dev\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every AI Agent Worth Knowing');
  });

  test('404 page recovery links (browse + machine-readable entry points) all resolve', async ({ page }) => {
    await page.goto('/definitely-not-a-page-asb-e2e-7f3k');
    const hrefs = await page.getByRole('main').locator('a[href]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(expect.arrayContaining(['/browse', '/', '/llms.txt', '/sitemap.xml', '/agents.json', '/openapi.json']));
    const bad = [];
    for (const h of hrefs) {
      const s = await getStatus(page, h);
      if (s !== 200) bad.push(`${h} -> ${s}`);
    }
    expect(bad).toEqual([]);
  });
});

test.describe('/submit form', () => {
  test('empty submit is stopped by required-field validation and nothing is sent', async ({ page, blocked }) => {
    await page.goto('/submit');
    const ask = page.getByLabel('What should we list?');
    const email = page.getByLabel('Your email');
    await expect(ask).toHaveAttribute('required', '');
    await expect(email).toHaveAttribute('required', '');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    expect(await ask.evaluate((el) => el.validity.valueMissing)).toBe(true);
    expect(await page.locator('form').evaluate((f) => f.checkValidity())).toBe(false);
    await page.waitForTimeout(500);
    expect(blocked).toEqual([]);
    await expect(page).toHaveURL(/\/submit$/);
  });

  test('a too-short description and a malformed email are rejected client-side', async ({ page, blocked }) => {
    await page.goto('/submit');
    const ask = page.getByLabel('What should we list?');
    const email = page.getByLabel('Your email');
    await expect(ask).toHaveAttribute('minlength', '20');
    await ask.fill('too short');
    await email.fill('not-an-email');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    expect(await ask.evaluate((el) => el.validity.tooShort)).toBe(true);
    expect(await email.evaluate((el) => el.validity.typeMismatch)).toBe(true);
    await page.waitForTimeout(500);
    expect(blocked).toEqual([]);
  });

  test('a valid filled form is intercepted by the read-only guard (never reaches the server)', async ({ page, blocked }) => {
    await page.goto('/submit');
    await page.getByLabel('What should we list?').fill('asb-e2e test entry, never submitted: https://example.com agent with an MCP server.');
    await page.getByLabel('Your email').fill('e2e@example.com');
    expect(await page.locator('form').evaluate((f) => f.checkValidity())).toBe(true);
    await page.getByRole('button', { name: /Submit for review|Submitting/ }).click();
    await expect.poll(() => blocked.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(blocked.every((b) => b.startsWith('POST /submit'))).toBe(true);
    // The success state must never render, since the request never got through.
    await expect(page.getByRole('status').filter({ hasText: '✅' })).toHaveCount(0);
  });

  test('honeypot field "website" is present but hidden from humans and skipped by tab order', async ({ page }) => {
    await page.goto('/submit');
    const hp = page.locator('form input[name="website"]');
    await expect(hp).toHaveCount(1);
    await expect(hp).toBeHidden();
    await expect(hp).toHaveAttribute('tabindex', '-1');
    await expect(hp).toHaveAttribute('aria-hidden', 'true');
    await expect(hp).toHaveAttribute('autocomplete', 'off');
  });
});

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('menu toggle reveals the main nav and a link navigates', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    const toggle = page.getByRole('button', { name: 'Toggle menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link')).toHaveCount(4);
    await nav.getByRole('link', { name: 'For agents', exact: true }).click();
    await expect(page).toHaveURL(/\/for-agents$/);
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  });

  test('content pages do not scroll horizontally at phone width', async ({ page }) => {
    const overflow = [];
    for (const p of CONTENT_PAGES) {
      await page.goto(p.path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (sw > cw + 1) overflow.push(`${p.path}: scrollWidth ${sw} > ${cw}`);
    }
    expect(overflow).toEqual([]);
  });
});
