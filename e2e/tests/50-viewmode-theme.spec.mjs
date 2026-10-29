// Text-only (agent) view and theme on the live site.
// Source of truth: components/ViewModeToggle.tsx, components/AgentBar.tsx,
// components/CategoryRail.tsx, components/ThemeToggle.tsx, app/layout.tsx,
// app/globals.css (.human-only / .agent-only / [data-view="agent"]).
import { test, expect } from './fixtures.mjs';

const LIGHT_BG = 'rgb(255, 255, 255)'; // html.light --dir-paper: #ffffff
const DARK_BG = 'rgb(17, 17, 17)';     // :root --dir-paper: #111111

const agentBar = (page) => page.getByRole('complementary', { name: 'For AI agents' });
const barButton = (page) => agentBar(page).getByRole('button');
const viewGroup = (page) => page.getByRole('group', { name: 'Page view' });
const railTab = (page) => page.locator('main').getByRole('button', { name: /^AGENTS/ });
const htmlEl = (page) => page.locator('html');

async function bodyBg(page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

async function overflowX(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function gotoMounted(page, path) {
  const res = await page.goto(path);
  expect(res.status()).toBe(200);
  // After hydration the header segmented control renders real buttons.
  await expect(viewGroup(page).getByRole('button', { name: 'For Humans' })).toBeVisible();
  return res;
}

test.describe('text-only view: agent bar button', () => {
  test('bar button switches html to data-view="agent"', async ({ page }) => {
    await gotoMounted(page, '/');
    await expect(htmlEl(page)).not.toHaveAttribute('data-view', /.*/);
    await expect(barButton(page)).toHaveAccessibleName('Switch to text-only view');
    await barButton(page).click();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
  });

  test('text-only view hides .human-only and shows .agent-only on the homepage', async ({ page }) => {
    await gotoMounted(page, '/');
    const h1 = page.getByRole('heading', { level: 1, name: /Every AI Agent Worth Knowing/ });
    await expect(h1).toBeVisible();
    await expect(page.locator('main .agent-only').first()).toBeHidden();
    await barButton(page).click();
    await expect(h1).toBeHidden();
    await expect(page.locator('main .human-only').first()).toBeHidden();
    const agentBlock = page.locator('main .agent-only').first();
    await expect(agentBlock).toBeVisible();
    await expect(agentBlock).toContainText('agentswitchboard.dev');
    await expect(agentBlock).toContainText(/\d+ agents indexed/);
  });

  test('bar button label flips to "Back to the human view" and clicking again restores', async ({ page }) => {
    await gotoMounted(page, '/');
    await barButton(page).click();
    await expect(barButton(page)).toHaveAccessibleName('Back to the human view');
    await expect(barButton(page)).toBeVisible();
    await barButton(page).click();
    await expect(htmlEl(page)).not.toHaveAttribute('data-view', /.*/);
    await expect(barButton(page)).toHaveAccessibleName('Switch to text-only view');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('main .agent-only').first()).toBeHidden();
  });

  test('agent bar stays visible in text-only view with its fetch links', async ({ page }) => {
    await gotoMounted(page, '/');
    await barButton(page).click();
    await expect(agentBar(page)).toBeVisible();
    for (const [name, href] of [['/llms.txt', '/llms.txt'], ['/index.md', '/index.md'], ['/api/mcp', '/for-agents#mcp']]) {
      await expect(agentBar(page).getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
  });
});

test.describe('text-only view: controls stay in sync', () => {
  test('header "For Agents" toggle switches the view and the bar button follows', async ({ page }) => {
    await gotoMounted(page, '/');
    const forAgents = viewGroup(page).getByRole('button', { name: 'For Agents' });
    const forHumans = viewGroup(page).getByRole('button', { name: 'For Humans' });
    await expect(forHumans).toHaveAttribute('aria-pressed', 'true');
    await expect(forAgents).toHaveAttribute('aria-pressed', 'false');
    await forAgents.click();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(forAgents).toHaveAttribute('aria-pressed', 'true');
    await expect(barButton(page)).toHaveAccessibleName('Back to the human view');
    await forHumans.click();
    await expect(htmlEl(page)).not.toHaveAttribute('data-view', /.*/);
    await expect(barButton(page)).toHaveAccessibleName('Switch to text-only view');
  });

  test('bar button updates the header toggle pressed state', async ({ page }) => {
    await gotoMounted(page, '/');
    await barButton(page).click();
    await expect(viewGroup(page).getByRole('button', { name: 'For Agents' })).toHaveAttribute('aria-pressed', 'true');
    await expect(viewGroup(page).getByRole('button', { name: 'For Humans' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('rail AGENTS tab switches to text-only view and syncs bar + header', async ({ page }) => {
    await gotoMounted(page, '/');
    await expect(railTab(page)).toBeVisible();
    await expect(railTab(page)).toHaveAccessibleName(/text only/);
    await railTab(page).click();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(barButton(page)).toHaveAccessibleName('Back to the human view');
    await expect(viewGroup(page).getByRole('button', { name: 'For Agents' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('another tab picks up the change through the storage event', async ({ page }) => {
    await gotoMounted(page, '/');
    const ctx = page.context();
    // Same read-only rule for the second tab.
    await ctx.route('**/*', (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.pathname.startsWith('/_vercel/') || /sentry\.io/.test(url.host)) return route.abort();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.continue();
      return route.fulfill({ status: 418, body: 'blocked by asb-e2e' });
    });
    const other = await ctx.newPage();
    await gotoMounted(other, '/browse');
    await barButton(page).click();
    await expect(htmlEl(other)).toHaveAttribute('data-view', 'agent');
    await expect(barButton(other)).toHaveAccessibleName('Back to the human view');
    await other.close();
  });
});

test.describe('text-only view: persistence', () => {
  test('survives a reload (localStorage viewMode=agent)', async ({ page }) => {
    await gotoMounted(page, '/');
    await barButton(page).click();
    expect(await page.evaluate(() => localStorage.getItem('viewMode'))).toBe('agent');
    await page.reload();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(page.locator('main .agent-only').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /Every AI Agent Worth Knowing/ })).toBeHidden();
    await expect(barButton(page)).toHaveAccessibleName('Back to the human view');
  });

  test('carries over to another page (/browse) and to a category page', async ({ page }) => {
    await gotoMounted(page, '/');
    await barButton(page).click();
    for (const path of ['/browse', '/categories', '/changelog']) {
      await gotoMounted(page, path);
      await expect(htmlEl(page), path).toHaveAttribute('data-view', 'agent');
      await expect(page.locator('main .agent-only').first(), path).toBeVisible();
      await expect(page.locator('main .human-only').first(), path).toBeHidden();
    }
  });

  test('head script applies saved agent view before hydration (no flash)', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/', { waitUntil: 'commit' });
    // As soon as the DOM exists, before React hydrates, the attribute is set.
    await page.waitForSelector('body', { state: 'attached' });
    const attr = await page.evaluate(() => document.documentElement.getAttribute('data-view'));
    expect(attr).toBe('agent');
  });

  test('pages without an agent view offer a /index.md link instead of a toggle', async ({ page }) => {
    for (const path of ['/for-agents', '/about', '/submit']) {
      await gotoMounted(page, path);
      expect(await page.locator('.agent-only').count(), `${path} has no .agent-only block`).toBe(0);
      await expect(agentBar(page).getByRole('button'), path).toHaveCount(0);
      const link = agentBar(page).getByRole('link', { name: 'Switch to text-only view' });
      await expect(link, path).toBeVisible();
      await expect(link, path).toHaveAttribute('href', '/index.md');
    }
  });

  test('the /index.md text view the fallback link points to is served as markdown', async ({ page }) => {
    const res = await page.request.get('/index.md', { headers: { 'user-agent': 'asb-e2e' } });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/text\/(markdown|plain)/);
    expect((await res.text()).length).toBeGreaterThan(200);
  });
});

test.describe('theme', () => {
  test('light theme by default: html.light and a white body', async ({ page }) => {
    await gotoMounted(page, '/');
    await expect(htmlEl(page)).toHaveClass(/\blight\b/);
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  });

  test('theme toggle switches to dark and the body background actually changes', async ({ page }) => {
    await gotoMounted(page, '/');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(htmlEl(page)).not.toHaveClass(/\blight\b/);
    await expect.poll(() => bodyBg(page)).toBe(DARK_BG);
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(htmlEl(page)).toHaveClass(/\blight\b/);
    await expect.poll(() => bodyBg(page)).toBe(LIGHT_BG);
  });

  test('dark theme persists across reload', async ({ page }) => {
    await gotoMounted(page, '/');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
    await expect(htmlEl(page)).not.toHaveClass(/\blight\b/);
    expect(await bodyBg(page)).toBe(DARK_BG);
  });

  test('dark theme plus text-only view work together', async ({ page }) => {
    await gotoMounted(page, '/');
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await barButton(page).click();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(htmlEl(page)).not.toHaveClass(/\blight\b/);
    expect(await bodyBg(page)).toBe(DARK_BG);
    const agentBlock = page.locator('main .agent-only').first();
    await expect(agentBlock).toBeVisible();
    // Agent text is readable on the dark paper (not dark-on-dark).
    const color = await agentBlock.evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = color.match(/\d+/g).map(Number);
    expect((r + g + b) / 3, `agent text colour ${color}`).toBeGreaterThan(110);
    await page.reload();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(htmlEl(page)).not.toHaveClass(/\blight\b/);
  });
});

test.describe('keyboard', () => {
  async function tabTo(page, locator, max = 8) {
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      if (await locator.evaluate((el) => el === document.activeElement)) return true;
    }
    return false;
  }

  test('Tab reaches the bar button first-ish and Enter activates it', async ({ page }) => {
    await gotoMounted(page, '/');
    expect(await tabTo(page, barButton(page), 3), 'bar button within the first 3 tab stops').toBe(true);
    await page.keyboard.press('Enter');
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(barButton(page)).toBeFocused();
  });

  test('Space toggles back to the human view from the keyboard', async ({ page }) => {
    await gotoMounted(page, '/');
    expect(await tabTo(page, barButton(page), 3)).toBe(true);
    await page.keyboard.press('Space');
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await page.keyboard.press('Space');
    await expect(htmlEl(page)).not.toHaveAttribute('data-view', /.*/);
  });

  test('theme toggle is keyboard operable', async ({ page }) => {
    await gotoMounted(page, '/');
    const toggle = page.getByRole('button', { name: 'Switch to dark mode' });
    expect(await tabTo(page, toggle, 20)).toBe(true);
    await page.keyboard.press('Enter');
    await expect(htmlEl(page)).not.toHaveClass(/\blight\b/);
  });
});

test.describe('no horizontal overflow in text-only view (desktop)', () => {
  for (const path of ['/', '/browse', '/categories', '/changelog']) {
    test(`text-only ${path} has no horizontal scroll at 1440`, async ({ page }) => {
      await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
      await gotoMounted(page, path);
      await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('mobile text-only view', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('bar button works on a phone and the rail is hidden', async ({ page }) => {
    await page.goto('/');
    await expect(barButton(page)).toBeVisible();
    await expect(railTab(page)).toBeHidden();
    await barButton(page).tap();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(page.locator('main .agent-only').first()).toBeVisible();
  });

  for (const path of ['/', '/browse', '/categories', '/changelog']) {
    test(`text-only ${path} has no horizontal scroll at 375`, async ({ page }) => {
      await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
      const res = await page.goto(path);
      expect(res.status()).toBe(200);
      await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
      await page.waitForLoadState('load');
      expect(await overflowX(page), `${path} scrollWidth - clientWidth`).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('text-only view on detail and category pages', () => {
  test('agent detail page /agents/a2a-protocol swaps to its agent block', async ({ page }) => {
    await gotoMounted(page, '/agents/a2a-protocol');
    const human = page.locator('main .human-only').first();
    await expect(human).toBeVisible();
    await barButton(page).click();
    await expect(human).toBeHidden();
    const agent = page.locator('main .agent-only').first();
    await expect(agent).toBeVisible();
    expect((await agent.innerText()).trim().length).toBeGreaterThan(50);
  });

  test('rail AGENTS tab on a category page switches the view', async ({ page }) => {
    await gotoMounted(page, '/categories/language');
    await railTab(page).click();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(page.locator('main .agent-only').first()).toBeVisible();
    await expect(barButton(page)).toHaveAccessibleName('Back to the human view');
  });

  test('toggling view and theme logs no app console errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await gotoMounted(page, '/');
    await barButton(page).click();
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await barButton(page).click();
    await gotoMounted(page, '/browse');
    const app = errors.filter((t) => !/_vercel|sentry|ERR_FAILED|418|blocked by asb-e2e/i.test(t));
    expect(app).toEqual([]);
  });
});

test.describe('mobile menu view toggle', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('mobile menu "For Agents" switches the view and syncs the bar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Toggle menu' }).tap();
    const forAgents = viewGroup(page).getByRole('button', { name: 'For Agents' });
    await expect(forAgents).toBeVisible();
    await forAgents.tap();
    await expect(htmlEl(page)).toHaveAttribute('data-view', 'agent');
    await expect(forAgents).toHaveAttribute('aria-pressed', 'true');
    await expect(barButton(page)).toHaveAccessibleName('Back to the human view');
  });

  test('text-only agent detail page has no horizontal scroll at 375', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    const res = await page.goto('/agents/a2a-protocol');
    expect(res.status()).toBe(200);
    await page.waitForLoadState('load');
    await expect(page.locator('main .agent-only').first()).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
  });
});
