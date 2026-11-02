// The Use it now panel on listing pages (lib/use-it-now.ts, components/UseItNow.tsx):
// its prompts first, then one part per access method, each checked against the
// listing's API record so the page, REST and MCP say the same thing.
// Read-only: GETs, plus get_agent over /api/mcp.
import { test, expect } from './fixtures.mjs';

const BASE = process.env.E2E_BASE_URL || 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (use-it-now)' };

const catalog = (await (await fetch(`${BASE}/agents.json`, { headers: UA })).json()).agents;
const has = (method) => (a) => a.accessMethods.includes(method);
const pick = (list, what) => {
  if (!list[0]) throw new Error(`no published listing ${what}`);
  return list[0].slug;
};
const HOSTED = pick(catalog.filter((a) => a.mcpEndpoint), 'with an mcpEndpoint');
const LOCAL = pick(catalog.filter((a) => a.mcpCommand && !a.mcpEndpoint), 'with only an mcpCommand');
const MCP_BARE = catalog.filter((a) => has('mcp')(a) && !a.mcpEndpoint && !a.mcpCommand).map((a) => a.slug);
const INSTALLED = pick(catalog.filter((a) => a.install), 'with an install command');
const CLI_BARE = pick(catalog.filter((a) => has('cli')(a) && !a.install), 'with a CLI and no install command');
const API_BASE = pick(catalog.filter((a) => a.apiBaseUrl), 'with an apiBaseUrl');
const EXTENSION = pick(catalog.filter((a) => a.accessMethods.length === 1 && has('browser-extension')(a)), 'that is only a browser extension');

async function apiRecord(request, slug) {
  const res = await request.get(`/api/agents/${slug}`, { headers: UA });
  expect(res.status(), `/api/agents/${slug}`).toBe(200);
  return res.json();
}

const panel = (page) => page.locator('div.human-only.section').getByRole('region', { name: 'Use it now' });
const part = (page, name) => panel(page).getByRole('region', { name });
const events = (page, name) =>
  page.evaluate((n) => (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === n).map(([, e]) => e.data), name);

async function openHydrated(page, path) {
  await page.goto(path);
  await expect(page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'For Humans' })).toBeVisible();
}

test('the panel sits under the description, with Try this first inside it before the access methods', async ({ page }) => {
  await page.goto('/agents/agentmail');
  const root = page.locator('div.human-only.section');
  await expect(root.locator('p.text-lg + section[aria-labelledby="use-it-now"]')).toHaveCount(1);
  await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('Use it now');
  const headings = await panel(page).getByRole('heading', { level: 3 }).allTextContents();
  expect(headings[0]).toBe('Try this first');
  expect(headings.slice(1)).toEqual(['Connect it over MCP', 'Install the CLI', 'Call the API']);
});

test(`a hosted MCP server (${HOSTED}): client config, Add to Cursor and Claude, Claude Code, all from its endpoint`, async ({ page }) => {
  const rec = await apiRecord(page.request, HOSTED);
  const mcp = rec.useItNow.mcp;
  expect(mcp.endpoint).toBe(rec.mcpEndpoint);
  expect(mcp.clientConfig).toEqual({ mcpServers: { [HOSTED]: { url: rec.mcpEndpoint } } });
  await page.goto(`/agents/${HOSTED}`);
  const box = part(page, 'Connect it over MCP');
  await expect(box.locator('pre').first()).toHaveText(JSON.stringify(mcp.clientConfig, null, 2));
  const cursor = box.getByRole('link', { name: 'Add to Cursor' });
  await expect(cursor).toHaveAttribute('href', mcp.cursorInstallUrl);
  const config = new URL(mcp.cursorInstallUrl).searchParams.get('config');
  expect(JSON.parse(Buffer.from(config, 'base64').toString())).toEqual({ url: rec.mcpEndpoint });
  await expect(box.getByRole('link', { name: 'Add to Claude' })).toHaveAttribute('href', mcp.claudeConnectorUrl);
  await expect(box.locator('pre', { hasText: 'claude mcp add' })).toHaveText(mcp.claudeCodeCommand);
  await expect(box.getByText(rec.mcpEndpoint, { exact: true }).last()).toBeVisible();
  await expect(box.getByRole('link', { name: 'how, step by step' })).toHaveAttribute('href', '/connect');
});

test(`a local MCP server (${LOCAL}): its command as client config, and no web connector`, async ({ page }) => {
  const rec = await apiRecord(page.request, LOCAL);
  const [command, ...args] = rec.mcpCommand.split(' ');
  expect(rec.useItNow.mcp.clientConfig).toEqual({ mcpServers: { [LOCAL]: { command, args } } });
  await page.goto(`/agents/${LOCAL}`);
  const box = part(page, 'Connect it over MCP');
  await expect(box.locator('pre').first()).toHaveText(JSON.stringify(rec.useItNow.mcp.clientConfig, null, 2));
  await expect(box.getByRole('link', { name: 'Add to Cursor' })).toBeVisible();
  await expect(box.getByRole('link', { name: 'Add to Claude' })).toHaveCount(0);
  await expect(box.getByText('It runs on your computer')).toBeVisible();
});

test('every MCP listing shows something to copy: without a known address, a setup prompt and its instructions', async ({ page }) => {
  expect(MCP_BARE.length).toBeGreaterThan(0);
  for (const slug of [MCP_BARE[0], MCP_BARE[Math.floor(MCP_BARE.length / 2)], MCP_BARE[MCP_BARE.length - 1]]) {
    const rec = await apiRecord(page.request, slug);
    await page.goto(`/agents/${slug}`);
    const box = part(page, 'Connect it over MCP');
    await expect(box.getByText('Ask your coding agent to set it up')).toBeVisible();
    await expect(box.getByText(rec.useItNow.mcp.setupPrompt, { exact: true })).toBeVisible();
    await expect(box.locator('pre')).toHaveCount(0);
    await expect(box.getByRole('link', { name: 'Add to Cursor' })).toHaveCount(0);
    await expect(box.locator('a[data-useit="docs"]')).toHaveAttribute('href', rec.useItNow.mcp.docsUrl);
  }
});

test(`a CLI with an install command (${INSTALLED}) shows exactly that command`, async ({ page }) => {
  const rec = await apiRecord(page.request, INSTALLED);
  await page.goto(`/agents/${INSTALLED}`);
  const box = part(page, 'Install the CLI');
  await expect(box.locator('pre')).toHaveText(rec.install.command);
  expect(rec.useItNow.cli.install).toEqual(rec.install);
});

test(`a CLI without one (${CLI_BARE}) gets a docs link and no command`, async ({ page }) => {
  const rec = await apiRecord(page.request, CLI_BARE);
  await page.goto(`/agents/${CLI_BARE}`);
  const box = part(page, 'Install the CLI');
  await expect(box.getByText('Install it as its own instructions say.')).toBeVisible();
  await expect(box.locator('pre')).toHaveCount(0);
  await expect(box.locator('a[data-useit="docs"]')).toHaveAttribute('href', rec.useItNow.cli.docsUrl);
});

test(`an API (${API_BASE}): base URL, auth in plain words, docs`, async ({ page }) => {
  const rec = await apiRecord(page.request, API_BASE);
  await page.goto(`/agents/${API_BASE}`);
  const box = part(page, 'Call the API');
  await expect(box.locator('pre')).toHaveText(rec.apiBaseUrl);
  await expect(box.getByText(rec.useItNow.api.auth, { exact: true })).toBeVisible();
  await expect(box.locator('a[data-useit="docs"]')).toHaveAttribute('href', rec.useItNow.api.docsUrl);
});

test(`a browser extension (${EXTENSION}) links where to get it, with no prompts`, async ({ page }) => {
  const rec = await apiRecord(page.request, EXTENSION);
  expect(rec.useItNow.tryThisFirst).toBeNull();
  await page.goto(`/agents/${EXTENSION}`);
  await expect(panel(page).getByRole('heading', { level: 3 })).toHaveText(['Get the browser extension']);
  await expect(part(page, 'Get the browser extension').locator('a[data-useit="docs"]')).toHaveAttribute('href', rec.useItNow.extension.url);
});

test.describe('copying', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the client config as shown and counts useit_copy', async ({ page }) => {
    const rec = await apiRecord(page.request, HOSTED);
    await openHydrated(page, `/agents/${HOSTED}`);
    // Found by position: the button's name changes to "Copied…" on click.
    const button = part(page, 'Connect it over MCP').getByRole('button').first();
    await expect(button).toHaveAccessibleName('Copy the MCP client config');
    await button.click();
    await expect(button).toHaveText(/Copied/);
    expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(rec.useItNow.mcp.clientConfig);
    expect(await events(page, 'useit_copy')).toEqual([{ slug: HOSTED, what: 'mcp-config' }]);
  });

  test('copies the install command and counts it', async ({ page }) => {
    const rec = await apiRecord(page.request, INSTALLED);
    await openHydrated(page, `/agents/${INSTALLED}`);
    await part(page, 'Install the CLI').getByRole('button', { name: 'Copy the install command' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(rec.install.command);
    expect(await events(page, 'useit_copy')).toEqual([{ slug: INSTALLED, what: 'install' }]);
  });
});

test('Add to Cursor and docs links count useit_deeplink and useit_docs_click', async ({ page }) => {
  await openHydrated(page, `/agents/${HOSTED}`);
  // Keep the page: the counts are what's under test, not cursor:// or the vendor's site.
  await page.evaluate(() => document.addEventListener('click', (e) => e.target.closest('a[data-useit]') && e.preventDefault(), true));
  const box = part(page, 'Connect it over MCP');
  await box.getByRole('link', { name: 'Add to Cursor' }).click();
  await box.getByRole('link', { name: 'Add to Claude' }).click();
  await box.locator('a[data-useit="docs"]').click();
  expect(await events(page, 'useit_deeplink')).toEqual([
    { slug: HOSTED, client: 'cursor' },
    { slug: HOSTED, client: 'claude' },
  ]);
  expect(await events(page, 'useit_docs_click')).toEqual([{ slug: HOSTED, method: 'mcp' }]);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('everything copyable is on the page as text, with no copy buttons', async ({ page }) => {
    const rec = await apiRecord(page.request, HOSTED);
    await page.goto(`/agents/${HOSTED}`);
    await expect(part(page, 'Connect it over MCP').locator('pre').first()).toHaveText(JSON.stringify(rec.useItNow.mcp.clientConfig, null, 2));
    await expect(panel(page).getByRole('button')).toHaveCount(0);
  });
});

test('the text-only view lists the same values', async ({ page }) => {
  const rec = await apiRecord(page.request, HOSTED);
  await openHydrated(page, `/agents/${HOSTED}`);
  const bar = page.getByRole('complementary', { name: 'For AI agents' });
  await bar.getByRole('button', { name: /Switch to text-only view/ }).click();
  const agentView = page.locator('div.agent-only').last();
  await expect(agentView.locator('.agent-section-title', { hasText: 'use it now' })).toBeVisible();
  const row = (key) => agentView.locator('.agent-row').filter({ has: page.getByText(key, { exact: true }) });
  await expect(row('mcp.endpoint').locator('.agent-accent')).toHaveText(rec.mcpEndpoint);
  await expect(row('mcp.config').locator('.agent-accent')).toHaveText(JSON.stringify(rec.useItNow.mcp.clientConfig));
  await expect(row('mcp.docs').locator('.agent-accent')).toHaveText(rec.useItNow.mcp.docsUrl);
});

test('MCP get_agent returns the same useItNow as GET /api/agents/{slug}', async ({ request }) => {
  const rec = await apiRecord(request, HOSTED);
  const res = await request.post('/api/mcp', {
    headers: { ...UA, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_agent', arguments: { slug: HOSTED } } },
  });
  const text = await res.text();
  const json = JSON.parse(text.startsWith('{') ? text : text.split('\n').find((l) => l.startsWith('data: ')).slice(6));
  const out = json.result.structuredContent;
  expect(out.useItNow).toEqual(rec.useItNow);
  expect(out.mcpEndpoint).toBe(rec.mcpEndpoint);
});
