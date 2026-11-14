// The Operator: /operator (app/operator/page.tsx) puts a request in plain
// words through to a tool for each part (lib/request-parts.ts, lib/operator.ts):
// each part's task, pick, why and alternatives against GET /api/tasks/<slug>,
// the stack, Connect them all and the share card; the box on the homepage and
// the page (components/OperatorBox.tsx) and what both count; the text-only
// view, the page without JavaScript and on a phone, and the links to it.
// Read-only: GETs only; Add all writes My stack, in the browser's localStorage.
import { test, expect } from './fixtures.mjs';
import { BASE } from '../target.mjs';

const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (operator)' };
// lib/request-parts.ts OPERATOR_EXAMPLES, PARTS_MAX, REQUEST_MAX; lib/operator.ts OPERATOR_ALTERNATIVES
const EXAMPLES = [
  'read my Notion, file Linear tickets, ping me on Slack',
  'query Postgres and send email',
  'monitor errors with Sentry and open Jira tickets',
  'review my pull requests, deploy to Vercel',
];
const PARTS_MAX = 6;
const REQUEST_MAX = 300;
const ALTERNATIVES = 2;
const HONEST = "Assembled from the directory's task map — no AI guesses.";
const EMPTY_HINT = 'Say the whole job in your own words. Commas, “then” and “and” split it into parts.';

const TASKS = (await (await fetch(`${BASE}/api/tasks`, { headers: UA })).json()).tasks;
const taskBySlug = new Map(TASKS.map((t) => [t.slug, t]));
const fitsOf = new Map();

/** lib/request-parts.ts operatorQuery, for a request as read. */
const query = (request) => `q=${encodeURIComponent(request).replace(/%20/g, '+').replace(/%2C/g, ',')}`;
const href = (request) => `/operator?${query(request)}`;
/** lib/utils.ts joinList */
const joinList = (xs) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const tools = (n) => `${n} ${n === 1 ? 'tool' : 'tools'}`;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const human = (page) => page.locator('.human-only');
const pageBox = (page) => human(page).getByLabel('Your request');
const hint = (scope) => scope.locator('form [aria-live="polite"]');
const parts = (page) => human(page).locator('section[aria-labelledby="put-through"] ol > li');
const stackSection = (page) => human(page).locator('section[aria-labelledby="use-this-stack"]');
const stackSlugs = (page) =>
  stackSection(page)
    .locator('ul a[href^="/agents/"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('href').split('/')[2]));
const events = (page, name) =>
  page.evaluate((n) => (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === n).map(([, e]) => e.data), name);
const meta = (page, key) => page.locator(`meta[name="${key}"], meta[property="${key}"]`).first().getAttribute('content');
const robots = (page) => page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.getAttribute('content')).join(','));
const stored = async (page) => JSON.parse((await page.evaluate(() => localStorage.getItem('my-stack'))) ?? 'null');

async function json(request, path, status = 200) {
  const res = await request.get(path, { headers: UA });
  expect(res.status(), path).toBe(status);
  return res.json();
}

/** GET /api/tasks/<slug>'s listings, best fit first, each with its why. */
async function fits(request, slug) {
  if (!fitsOf.has(slug)) fitsOf.set(slug, (await json(request, `/api/tasks/${slug}`)).agents);
  return fitsOf.get(slug);
}

/** A part as the page shows it. */
async function readPart(li) {
  const task = li.locator('a[href^="/tasks/"]');
  const card = li.locator('.cmp-card > a[href^="/agents/"]');
  const also = li.locator('p:has-text("Also fits:")');
  const because = li.locator('p', { hasText: /^(Picked because|The task’s best fit)/ });
  return {
    text: (await li.locator(':scope > p').first().locator('span').nth(1).textContent()).trim().replace(/^“|”$/g, ''),
    task: (await task.count()) > 0 ? (await task.getAttribute('href')).split('/')[2] : null,
    taskLine: (await task.count()) > 0 ? (await task.locator('xpath=..').textContent()).trim() : null,
    pick: (await card.count()) > 0 ? (await card.getAttribute('href')).split('/')[2] : null,
    why: (await card.count()) > 0 && (await card.locator('p:has(.dir-label)').count()) > 0 ? (await card.locator('p:has(.dir-label)').textContent()).trim() : null,
    because: (await because.count()) > 0 ? (await because.textContent()).trim() : null,
    also: (await also.count()) > 0 ? await also.locator('a[href^="/agents/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href').split('/')[2])) : [],
    compare: (await also.count()) > 0 ? await also.locator('a[href^="/compare?"]').getAttribute('href') : null,
  };
}

/** Opens `path` once the layout's scripts run: both set their attribute on <html> after hydration. */
async function openReady(page, path) {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-cmp-ready', '');
  await expect(page.locator('html')).toHaveAttribute('data-stk-ready', '');
}

/** Types `text` into `box`, again until the page has hydrated and the line under it follows. */
async function say(box, scope, text) {
  await expect(async () => {
    await box.fill(text);
    await expect(hint(scope)).not.toHaveText(EMPTY_HINT, { timeout: 1000 });
  }).toPass();
}

/** The task labels /operator puts `request` through to, in order. */
async function tasksOf(page, request) {
  await page.goto(href(request));
  return parts(page)
    .locator('a[href^="/tasks/"]')
    .evaluateAll((els) => els.map((e) => e.textContent.replace(/^I need to /, '')));
}

test.describe('the way in', () => {
  test('the sitemap lists /operator, and the footer, llms.txt, index.md and /for-agents link it', async ({ page, request }) => {
    const xml = await (await request.get('/sitemap.xml', { headers: UA })).text();
    expect(xml).toContain(`<loc>${ORIGIN}/operator</loc>`);
    const llms = await (await request.get('/llms.txt', { headers: UA })).text();
    expect(llms).toContain(`${ORIGIN}/operator?q=<request> (for example ?q=${EXAMPLES[0].replace(/ /g, '+')};`);
    const md = await (await request.get('/index.md', { headers: UA })).text();
    expect(md).toContain(`- [/operator](${ORIGIN}/operator) — the Operator: a whole job in plain words at \`/operator?q={request}\``);
    await page.goto('/for-agents');
    await expect(page.locator('main').getByRole('link', { name: `${ORIGIN}/operator`, exact: true })).toHaveAttribute('href', '/operator');
    await expect(page.locator('footer').getByRole('link', { name: 'The Operator', exact: true })).toHaveAttribute('href', '/operator');
  });

  test('the homepage links the Operator as a secondary way in, and its box opens there without JavaScript', async ({ page }) => {
    await page.goto('/');
    const link = human(page).getByRole('navigation', { name: 'Other ways in' }).getByRole('link', { name: /Operator/ });
    await expect(link).toHaveAttribute('href', '/operator');
    await expect(human(page).locator('form[action="/operator"] input[name="q"]')).toHaveCount(1);
    await expect(human(page).locator('section[aria-labelledby="ask-the-switchboard"]')).toHaveCount(0);
  });

  test('as you type, the line under the box names the parts and the task each goes to, as the page will', async ({ page }) => {
    const labels = await tasksOf(page, EXAMPLES[0]);
    expect(labels).toHaveLength(3);
    await page.goto('/operator');
    const scope = human(page);
    await say(pageBox(page), scope, EXAMPLES[0]);
    await expect(hint(scope)).toHaveText(`→ 3 parts: ${labels.join(' · ')}`);
    await say(pageBox(page), scope, 'query Postgres, xyzzy plugh');
    await expect(hint(scope)).toContainText('· “xyzzy plugh”, no task yet');
    await say(pageBox(page), scope, 'please');
    await expect(hint(scope)).toHaveText('Say what to do: “query Postgres”, “ping me on Slack”.');
  });

  test('Enter puts the request through, counting its parts and tasks, never its words', async ({ page }) => {
    await page.goto('/operator');
    await say(pageBox(page), human(page), EXAMPLES[0]);
    await pageBox(page).press('Enter');
    await page.waitForURL(new RegExp(`${escapeRe(href(EXAMPLES[0]))}$`));
    await expect(parts(page)).toHaveCount(3);
    expect(await events(page, 'operator_submit')).toEqual([{ from: 'operator', parts: 3, tasks: 3 }]);
    expect(JSON.stringify(await page.evaluate(() => window.vaq ?? []))).not.toMatch(/Notion|Linear|Slack/);
    // Page views and events carry the page's URL, so what the site hands analytics before sending keeps the page, not the words.
    const sent = await page.evaluate(() => {
      const [, beforeSend] = (window.vaq ?? []).find(([kind]) => kind === 'beforeSend') ?? [];
      return beforeSend?.({ type: 'pageview', url: `${location.href}#connect` })?.url ?? null;
    });
    expect(sent).toBe(new URL('/operator#connect', page.url()).href);
  });

  test('Shift+Enter starts a new line, which ends a part', async ({ page }) => {
    await page.goto('/operator');
    await say(pageBox(page), human(page), 'query Postgres');
    await pageBox(page).press('Shift+Enter');
    await pageBox(page).pressSequentially('send email');
    await expect(hint(human(page))).toContainText('→ 2 parts:');
    await expect(page).toHaveURL(/\/operator$/);
    await pageBox(page).press('Enter');
    await page.waitForURL(new RegExp(`${escapeRe(href('query Postgres, send email'))}$`));
    await expect(parts(page)).toHaveCount(2);
  });
});

test.describe('/operator', () => {
  test('without a request: the box, the line that says how it is made, requests to try and how it works', async ({ page }) => {
    const res = await page.goto('/operator');
    expect(res.status()).toBe(200);
    await expect(human(page).getByRole('heading', { level: 1 })).toHaveText('Ask the switchboard');
    await expect(human(page).getByText(HONEST, { exact: true })).toBeVisible();
    await expect(pageBox(page)).toHaveValue('');
    await expect(pageBox(page)).toHaveAttribute('placeholder', EXAMPLES[0]);
    const tries = human(page).locator('section[aria-labelledby="try-one"] a[data-example]');
    expect(await tries.evaluateAll((els) => els.map((e) => [e.getAttribute('href'), e.dataset.example]))).toEqual(
      EXAMPLES.map((request, i) => [href(request), String(i + 1)])
    );
    await expect(human(page).locator('section[aria-labelledby="how-it-works"] ol > li')).toHaveCount(4);
    await expect(parts(page)).toHaveCount(0);
    await expect(stackSection(page)).toHaveCount(0);
  });

  test('is a page for search engines, with its first example as the share card', async ({ page }) => {
    await page.goto('/operator');
    await expect(page).toHaveTitle('The Operator: ask the switchboard | Agent Switchboard');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(`${ORIGIN}/operator`);
    expect(await robots(page)).not.toContain('noindex');
    const og = await meta(page, 'og:image');
    expect(og).toMatch(new RegExp(`^${escapeRe(`${ORIGIN}/operator/card.png`)}\\?v=[0-9a-f]{8}$`));
    expect(await meta(page, 'og:image:alt')).toMatch(new RegExp(`^Ask the switchboard: “${escapeRe(EXAMPLES[0])}” put through to `));
    const card = await page.request.get(og.replace(ORIGIN, ''), { headers: UA });
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toContain('image/png');
    const buf = await card.body();
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  for (const request of EXAMPLES) {
    test(`“${request}”: each part's task, its pick with why, and ${ALTERNATIVES} more that fit to compare`, async ({ page, request: api }) => {
      await page.goto(href(request));
      await expect(pageBox(page)).toHaveValue(request);
      const shown = [];
      for (const li of await parts(page).all()) shown.push(await readPart(li));
      expect(shown.length).toBeGreaterThan(1);
      await expect(human(page).locator('#put-through')).toHaveText(`Put through · ${shown.length} parts`);
      for (const [i, part] of shown.entries()) {
        const where = `part ${i + 1}, “${part.text}”`;
        expect(request, where).toContain(part.text);
        const task = taskBySlug.get(part.task);
        expect(task, where).toBeTruthy();
        expect(part.taskLine, where).toBe(`→ I need to ${task.label} · ${tools(task.count)}`);
        const listings = await fits(api, task.slug);
        const pick = listings.find((a) => a.slug === part.pick);
        expect(pick, `${where}: ${part.pick} fits ${task.slug}`).toBeTruthy();
        expect(part.why, where).toBe(pick.why ? `Why ${pick.why}` : null);
        expect(part.because, where).toMatch(/^Picked because it (mentions “.+”|has an? .+|is Official)|^The task’s best fit\./);
        const named = [...(part.because.match(/“([^”]+)”/g) ?? [])].map((q) => q.slice(1, -1).toLowerCase());
        const found = await json(api, `/api/agents/${pick.slug}`);
        const haystack = [found.name, found.providerName ?? found.provider ?? '', found.description, ...(found.tags ?? []), ...found.skills.map((s) => s.name)]
          .join(' ')
          .toLowerCase();
        for (const word of named) for (const w of word.split(' ')) expect(haystack, `${where}: ${pick.slug} mentions ${w}`).toContain(w.slice(0, 4));
        expect(part.also.length, where).toBe(Math.min(ALTERNATIVES, listings.length - 1));
        for (const slug of part.also) {
          expect(slug, where).not.toBe(part.pick);
          expect(listings.some((a) => a.slug === slug), `${where}: ${slug} fits ${task.slug}`).toBe(true);
        }
        if (part.also.length > 0) expect(part.compare, where).toBe(`/compare?${[part.pick, ...part.also].map((s, j) => `${'abc'[j]}=${s}`).join('&')}`);
      }
      const picks = [...new Set(shown.map((p) => p.pick))];
      expect(await stackSlugs(page)).toEqual(picks);
    });
  }

  test('the same request always gets the same stack, however it is typed', async ({ page }) => {
    await page.goto(href(EXAMPLES[0]));
    const first = await stackSlugs(page);
    expect(first).toHaveLength(3);
    await page.goto(href(EXAMPLES[0]));
    expect(await stackSlugs(page)).toEqual(first);
    await page.goto(`/operator?q=${encodeURIComponent('  READ my notion ,file linear tickets,   ping me on slack  ')}`);
    expect(await stackSlugs(page)).toEqual(first);
  });

  test('a request is for its link only: noindex, and its title and share card name the tools, never the words', async ({ page }) => {
    await page.goto(href(EXAMPLES[0]));
    const names = await stackSection(page).locator('ul a .dir-row-name').allTextContents();
    expect(await robots(page)).toContain('noindex');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(`${ORIGIN}${href(EXAMPLES[0])}`);
    await expect(page).toHaveTitle(`${joinList(names)}: a stack from the Operator | Agent Switchboard`);
    expect(await meta(page, 'og:title')).not.toMatch(/ping|read my/);
    const jobs = await parts(page)
      .locator('a[href^="/tasks/"]')
      .evaluateAll((els) => els.map((e) => `“${e.textContent.replace(/^I need to /, '')}”`));
    expect(await meta(page, 'description')).toBe(
      `3 tools for 3 jobs, put through by the Operator from the directory's task map: ${joinList(jobs)}.`
    );
    expect(await meta(page, 'og:description')).not.toMatch(/ping|read my/);
    const og = await meta(page, 'og:image');
    expect(og).toMatch(new RegExp(`^${escapeRe(`${ORIGIN}/operator/card.png?${query(EXAMPLES[0])}`)}&v=[0-9a-f]{8}$`));
    expect(await meta(page, 'og:image:alt')).toBe(`${joinList(names)}: 3 tools for 3 jobs, from the Operator on Agent Switchboard`);
    const card = await page.request.get(og.replace(ORIGIN, ''), { headers: UA });
    expect(card.status()).toBe(200);
    expect(card.headers()['content-type']).toContain('image/png');
  });

  test('the picks make a stack: in order, added to My stack at once, shared as the link, connected all at once', async ({ page, request }) => {
    await openReady(page, href(EXAMPLES[0]));
    const slugs = await stackSlugs(page);
    const section = stackSection(page);
    await expect(section.locator('#use-this-stack')).toHaveText(`Use this stack · ${tools(slugs.length)}`);
    await expect(section.locator('code')).toHaveText(`${ORIGIN}${href(EXAMPLES[0])}`);
    await section.getByRole('button', { name: 'Add all to My stack' }).click();
    await expect(section.locator('.stk-needs-js').getByRole('status')).toContainText(`Added ${slugs.length} to My stack.`);
    expect(await stored(page)).toMatchObject({ title: EXAMPLES[0], items: slugs.map((slug) => ({ slug })) });
    expect(await events(page, 'stack_add')).toEqual([{ from: 'operator', items: slugs.length }]);

    const bundle = await json(request, `/api/bundle?items=${slugs.join(',')}`);
    const connect = human(page).locator('section#connect');
    await expect(connect.getByRole('heading', { level: 2 })).toHaveText('Connect them all');
    await expect(connect.locator('pre').first()).toHaveText(JSON.stringify(bundle.config, null, 2));
  });

  test('asked for an MCP server or Official, the pick has it, and says so', async ({ page, request }) => {
    await page.goto(href('a Postgres MCP server'));
    const [mcp] = await Promise.all((await parts(page).all()).map(readPart));
    expect(mcp.because).toBe('Picked because it mentions “Postgres” and has an MCP server.');
    expect((await json(request, `/api/agents/${mcp.pick}`)).accessMethods).toContain('mcp');
    for (const slug of mcp.also) expect((await json(request, `/api/agents/${slug}`)).accessMethods).toContain('mcp');

    await page.goto(href('an official way to send email'));
    const [official] = await Promise.all((await parts(page).all()).map(readPart));
    expect(official.because).toBe('Picked because it is Official.');
    expect((await json(request, `/api/agents/${official.pick}`)).official).toBe(true);
  });

  test("a part that names no task says so and offers the nearest, each asking again in that task's words", async ({ page }) => {
    const request = 'answer support calls, book meetings';
    await openReady(page, href(request));
    const vague = parts(page).first();
    await expect(vague).toContainText('“answer support calls”');
    await expect(vague).toContainText("No task in the directory's map names it. Did you mean");
    const offered = vague.locator('a[data-fallback-task]');
    expect(await offered.count()).toBeGreaterThan(0);
    for (const link of await offered.all()) {
      const task = taskBySlug.get(await link.getAttribute('data-fallback-task'));
      expect(task).toBeTruthy();
      await expect(link).toHaveText(task.label);
      await expect(link).toHaveAttribute('href', href(`${task.label}, book meetings`));
    }
    const slug = await offered.first().getAttribute('data-fallback-task');
    await offered.first().click();
    await page.waitForURL(new RegExp(`${escapeRe(href(`${taskBySlug.get(slug).label}, book meetings`))}$`));
    expect(await events(page, 'operator_fallback_task_click')).toEqual([{ task: slug, from: 'operator' }]);
    await expect(parts(page).first().locator('a[href^="/tasks/"]')).toHaveAttribute('href', `/tasks/${slug}`);
  });

  test('a request that names nothing is not put through, and offers requests to try', async ({ page, request }) => {
    const nothing = 'xyzzy plugh';
    await page.goto(href(nothing));
    await expect(human(page).locator('#put-through')).toHaveText('Not put through · 1 part');
    const part = parts(page).first();
    await expect(part).toContainText(`No task in the directory's map names it. Try other words, see all ${TASKS.length} tasks, or search the directory for it.`);
    await expect(part.getByRole('link', { name: `all ${TASKS.length} tasks` })).toHaveAttribute('href', '/tasks');
    await expect(part.getByRole('link', { name: 'search the directory for it' })).toHaveAttribute('href', '/browse?q=xyzzy+plugh');
    await expect(stackSection(page)).toHaveCount(0);
    await expect(human(page).locator('section[aria-labelledby="try-one"] a[data-example]')).toHaveCount(EXAMPLES.length);
    expect(await meta(page, 'og:image')).toMatch(new RegExp(`^${escapeRe(`${ORIGIN}/operator/card.png`)}\\?v=`));
    expect((await request.get(`/operator/card.png?${query(nothing)}`, { headers: UA })).status()).toBe(404);
  });

  test(`past ${PARTS_MAX} parts, the rest are left out, and past ${REQUEST_MAX} characters, the rest is not read`, async ({ page }) => {
    const seven = 'read my email, query postgres, scrape websites, deploy my app, write code, book meetings, transcribe audio';
    await page.goto(href(seven));
    await expect(parts(page)).toHaveCount(PARTS_MAX);
    await expect(human(page).locator('section[aria-labelledby="put-through"]')).toContainText('1 more part left out: it puts through up to 6.');

    const long = `query postgres and ${'then send a long email about it '.repeat(12)}`;
    await page.goto(`/operator?q=${encodeURIComponent(long)}`);
    await expect(human(page).locator('section[aria-labelledby="put-through"]')).toContainText(`Only the first ${REQUEST_MAX} characters were read.`);
    const read = await pageBox(page).inputValue();
    expect(read.length).toBeLessThanOrEqual(REQUEST_MAX);
    expect(long.startsWith(read)).toBe(true);
  });

  test("the page's box puts a new request through in place of the old one", async ({ page }) => {
    // The line under a request's box is never the empty one, so say() can't tell when the page has hydrated.
    await openReady(page, href(EXAMPLES[0]));
    const scope = human(page);
    await say(pageBox(page), scope, EXAMPLES[1]);
    await pageBox(page).press('Enter');
    await page.waitForURL(new RegExp(`${escapeRe(href(EXAMPLES[1]))}$`));
    await expect(pageBox(page)).toHaveValue(EXAMPLES[1]);
    await expect(parts(page)).toHaveCount(2);
    expect(await events(page, 'operator_submit')).toEqual([{ from: 'operator', parts: 2, tasks: 2 }]);
  });

  test('the text-only view lists each part with its task, pick, why and alternatives, then how to connect them', async ({ page }) => {
    await page.goto(href(EXAMPLES[0]));
    const slugs = await stackSlugs(page);
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto(href(EXAMPLES[0]));
    const view = page.locator('.agent-only');
    await expect(view.getByText(href(EXAMPLES[0]), { exact: true })).toBeVisible();
    await expect(view.getByText(HONEST, { exact: true })).toBeVisible();
    const rows = view.locator('a.agent-row[href^="/agents/"]');
    expect(await rows.evaluateAll((els) => els.map((e) => e.getAttribute('href').split('/')[2]))).toEqual(slugs);
    for (const [i, slug] of slugs.entries()) {
      await expect(rows.nth(i).locator('.agent-accent')).toHaveText(`${i + 1}. ${slug}`);
      await expect(rows.nth(i)).toContainText('Picked because it mentions');
      await expect(rows.nth(i)).toContainText(' · also: ');
    }
    await expect(view.locator(`a[href="/api/bundle?items=${slugs.join(',')}"]`)).toBeVisible();
  });
});

test.describe('copying', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('the link to the request counts stack_share, and the MCP config operator_bundle_export', async ({ page, request }) => {
    await openReady(page, href(EXAMPLES[2]));
    const slugs = await stackSlugs(page);
    await human(page).getByRole('button', { name: 'Copy the link to this request', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${ORIGIN}${href(EXAMPLES[2])}`);
    expect(await events(page, 'stack_share')).toEqual([{ items: slugs.length, from: 'operator' }]);

    const bundle = await json(request, `/api/bundle?items=${slugs.join(',')}`);
    await human(page).getByRole('button', { name: 'Copy the MCP client config for this stack', exact: true }).click();
    expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(bundle.config);
    expect(await events(page, 'operator_bundle_export')).toEqual([
      { from: 'operator', items: slugs.length, servers: Object.keys(bundle.config.mcpServers).length, what: 'mcp-config' },
    ]);
    expect(await events(page, 'stack_bundle_export')).toEqual([]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test("the box's own form puts a request through", async ({ page }) => {
    await page.goto('/operator');
    await pageBox(page).fill(EXAMPLES[0]);
    await human(page).getByRole('button', { name: 'Put me through', exact: true }).click();
    await page.waitForURL(/\/operator\?q=/);
    await expect(parts(page)).toHaveCount(3);
    await expect(stackSection(page).locator('ul a')).toHaveCount(3);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('the box and a put-through request fit without sideways scrolling', async ({ page }) => {
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await page.goto('/operator');
    await expect(pageBox(page)).toBeVisible();
    expect(await fits()).toBe(true);
    await page.goto(href(EXAMPLES[0]));
    await expect(parts(page)).toHaveCount(3);
    expect(await fits()).toBe(true);
  });
});
