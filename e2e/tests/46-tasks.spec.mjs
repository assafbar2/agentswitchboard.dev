// Tasks: the /tasks index, every /tasks/<slug> page (content/tasks.json via
// lib/tasks.ts, ranked by lib/search.ts taskMatches), their share cards,
// GET /api/tasks and /api/tasks/<slug>, `task` on GET /api/agents,
// /browse?task= with its banner, filters, sort and ways back, and the ways in:
// the homepage's "I need an agent to…" box (lib/task-match.ts) and task chips,
// the chips atop /browse, and tasks in the search box's suggestions. Each page
// is checked against GET /api/tasks/<slug>, and each why line against the
// listing's own skills.
// Read-only: only GETs (via fetch at collection time, page.goto and page.request).
import { test, expect } from './fixtures.mjs';
import { BASE } from '../target.mjs';

const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'asb-e2e (tasks)' };
// lib/tasks.ts
const PAGE_SIZE = 12;
const OFFICIAL_SIZE = 8;
const MIN_LISTINGS = 3;
const RELATED_TASKS = 4;
const RELATED_STACKS = 3;
const WHY_MAX = 150;
const ACCESS_WORDS = { api: 'API', mcp: 'MCP', cli: 'CLI', 'browser-extension': 'browser extension' };

// GET /api/tasks drives the parametrized tests: every task, in the order /tasks shows them.
const API = await (await fetch(`${BASE}/api/tasks`, { headers: UA })).json();
const TASKS = API.tasks;
const SAMPLE = TASKS.find((t) => t.slug === 'query-a-database') ?? TASKS[0];
const CATEGORIES = (await (await fetch(`${BASE}/api/categories`, { headers: UA })).json()).categories;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const human = (page) => page.locator('.human-only');
const hrefs = (locator) => locator.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
const tools = (n) => `${n} ${n === 1 ? 'tool' : 'tools'}`;
const titleOf = (task) => `I need to ${task.label}`;
/** lib/utils.ts joinList */
const joinList = (xs, word) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} ${word} ${xs.at(-1)}`);
/** lib/tasks.ts taskExplanation */
const explanation = (task) =>
  `Picked from listings that mention ${joinList(task.keywords, 'or')} in their name, description, tags or skills; ` +
  `those in ${joinList(task.categories.map((c) => CATEGORIES.find((x) => x.slug === c)?.name ?? c), 'or')}, ` +
  `or with ${joinList(task.access.map((m) => ACCESS_WORDS[m] ?? m), 'or')} access, rank higher.`;
/** The /browse count bar for a task view. */
const fitLine = (n, official = false) => `${n}${official ? ' official' : ''} agent${n === 1 ? '' : 's'} ${n === 1 ? 'fits' : 'fit'} this task`;

const cards = (page) => human(page).locator('a[href^="/agents/"]:has(h3)');
const countBar = (page) => human(page).locator('h2.dir-bar');
const sortMenu = (page) => human(page).getByLabel('Sort');
const banner = (page) => human(page).locator('section[aria-label="Task"]');
const indexRows = (page) => human(page).locator('section[aria-labelledby="i-need-to"] li > a');
const bestFits = (page) => human(page).locator('section[aria-labelledby="best-fits"]');
// lib/task-comparison.ts, components/TaskComparison.tsx
const COMPARISON_SIZE = 6;
// /browse shows 60 listings a page
const BROWSE_PAGE = 60;
const SIGN_IN = { none: 'None', apiKey: 'API key', bearer: 'Token', oauth2: 'Sign in (OAuth)' };
const comparison = (page) => human(page).locator('section[aria-labelledby="comparison"]');

// components/TaskChips.tsx TASK_CHIPS, components/TaskSearch.tsx
const CHIPS = 8;
const EMPTY_HINT = 'Say it in your own words, or pick a task.';
const homeBlock = (page) => human(page).locator('section[aria-labelledby="i-need-an-agent-to"]');
const browseBlock = (page) => human(page).locator('section[aria-labelledby="browse-by-task"]');
const chips = (block) => block.locator('li > a[href^="/browse?task="]');
const taskBox = (page) => homeBlock(page).getByLabel('I need an agent to…');
const hint = (page) => homeBlock(page).locator('[aria-live="polite"]');
const chipHrefs = (query = '') => TASKS.slice(0, CHIPS).map((t) => `/browse?task=${t.slug}${query}`);

/** Types `text` into the homepage box, again until the page has hydrated and the line under it follows. */
async function say(page, text) {
  await expect(async () => {
    await taskBox(page).fill(text);
    await expect(hint(page)).not.toHaveText(EMPTY_HINT, { timeout: 1000 });
  }).toPass();
}

async function json(request, path, status = 200) {
  const res = await request.get(path, { headers: UA });
  expect(res.status(), path).toBe(status);
  return res.json();
}

const detail = (request, slug) => json(request, `/api/tasks/${slug}`);

/** lib/tasks.ts whyItFits: "Skill name: what it does", or the description when it opens with the name, cut at WHY_MAX. */
function quotes(why, skill) {
  if (!skill?.name || !skill?.description) return false;
  const name = skill.name.trim();
  const description = skill.description.trim();
  const full = description.toLowerCase().startsWith(name.toLowerCase()) ? description : `${name}: ${description}`;
  return why === full || (why.endsWith('…') && full.startsWith(why.slice(0, -1)));
}

async function itemList(page) {
  const lists = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((e) => { try { return JSON.parse(e.textContent); } catch { return null; } }).filter((j) => j && j['@type'] === 'ItemList'));
  expect(lists).toHaveLength(1);
  return lists[0];
}

/** The analytics script is blocked (fixtures.mjs), so events wait in its queue. */
function events(page, name) {
  return page.evaluate((n) => (window.vaq ?? []).filter(([kind, e]) => kind === 'event' && e.name === n).map(([, e]) => e.data), name);
}

/** Opens `path` and waits for React to run it: a click before then is a full page load, which loses what it counted. */
async function openHydrated(page, path) {
  await page.goto(path);
  // After hydration the header's view control renders real buttons (see 50-viewmode-theme).
  await expect(page.getByRole('group', { name: 'Page view' }).getByRole('button', { name: 'For Humans' })).toBeVisible();
}

async function expectCard(page, url) {
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
  const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content');
  expect(og).toBe(tw);
  expect(og).toMatch(new RegExp(`^${escapeRe(`${ORIGIN}${url}`)}\\?v=[0-9a-f]{8}$`));
  const card = await page.request.get(og.replace(ORIGIN, ''), { headers: UA });
  expect(card.status()).toBe(200);
  expect(card.headers()['content-type']).toContain('image/png');
  const buf = await card.body();
  expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([1200, 630]);
}

test('the sitemap lists /tasks and every task page', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml', { headers: UA })).text();
  expect(xml).toContain(`<loc>${ORIGIN}/tasks</loc>`);
  const slugs = [...xml.matchAll(/\/tasks\/([a-z0-9-]+)<\/loc>/g)].map((m) => m[1]);
  expect(slugs.sort()).toEqual(TASKS.map((t) => t.slug).sort());
});

test.describe('GET /api/tasks', () => {
  test('lists every task once, each with 3 to 5 keywords and at least 3 listings that fit it', () => {
    expect(TASKS.length).toBeGreaterThan(0);
    expect(API.total).toBe(TASKS.length);
    expect(new Set(TASKS.map((t) => t.slug)).size).toBe(TASKS.length);
    expect(new Set(TASKS.map((t) => t.label.toLowerCase())).size).toBe(TASKS.length);
    for (const t of TASKS) {
      expect(t.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(t.label, t.slug).not.toBe('');
      expect(t.blurb, t.slug).not.toBe('');
      expect(t.keywords.length, t.slug).toBeGreaterThanOrEqual(3);
      expect(t.keywords.length, t.slug).toBeLessThanOrEqual(5);
      expect(t.count, t.slug).toBeGreaterThanOrEqual(MIN_LISTINGS);
      expect(t.official, t.slug).toBeLessThanOrEqual(t.count);
      expect(t.url).toBe(`${ORIGIN}/tasks/${t.slug}`);
      expect(t.browseUrl).toBe(`${ORIGIN}/browse?task=${t.slug}`);
      expect(t.agentsUrl).toBe(`${ORIGIN}/api/agents?task=${t.slug}`);
    }
  });

  test('each task ranks by categories and access methods that exist', () => {
    const categories = new Set(CATEGORIES.map((c) => c.slug));
    for (const t of TASKS) {
      expect(t.categories.length, t.slug).toBeGreaterThan(0);
      for (const c of t.categories) expect(categories.has(c), `${t.slug}: ${c}`).toBe(true);
      expect(t.access.length, t.slug).toBeGreaterThan(0);
      for (const m of t.access) expect(Object.keys(ACCESS_WORDS), `${t.slug}: ${m}`).toContain(m);
    }
  });

  test('GET /api/tasks/<slug> is the summary plus every listing that fits, related tasks and stacks that exist', async ({ request }) => {
    const stacks = new Map((await json(request, '/api/stacks')).stacks.map((s) => [s.slug, s.items.map((i) => i.slug)]));
    const slugs = new Set(TASKS.map((t) => t.slug));
    for (const t of TASKS) {
      const { agents, relatedTasks, stacks: inStacks, ...summary } = await detail(request, t.slug);
      expect(summary, t.slug).toEqual(t);
      expect(agents.length, t.slug).toBe(t.count);
      const fits = new Set(agents.map((a) => a.slug));
      expect(fits.size, t.slug).toBe(t.count);
      expect(agents.filter((a) => a.official).length, t.slug).toBe(t.official);
      for (const a of agents) {
        expect(a.url, `${t.slug}: ${a.slug}`).toBe(`${ORIGIN}/agents/${a.slug}`);
        expect(a.authType, `${t.slug}: ${a.slug}`).toBeTruthy();
        if (a.why !== null) {
          expect(a.why, `${t.slug}: ${a.slug}`).not.toBe('');
          expect(a.why.length, `${t.slug}: ${a.slug}`).toBeLessThanOrEqual(WHY_MAX);
        }
      }
      expect(relatedTasks.length, t.slug).toBeLessThanOrEqual(RELATED_TASKS);
      expect(relatedTasks, t.slug).not.toContain(t.slug);
      for (const r of relatedTasks) expect(slugs.has(r), `${t.slug}: ${r}`).toBe(true);
      expect(inStacks.length, t.slug).toBeLessThanOrEqual(RELATED_STACKS);
      for (const s of inStacks) {
        expect(stacks.has(s), `${t.slug}: ${s}`).toBe(true);
        expect(stacks.get(s).some((slug) => fits.has(slug)), `${t.slug}: ${s} has a listing that fits`).toBe(true);
      }
    }
  });

  test('every why line quotes one of the listing\'s own skills', async ({ request }) => {
    const { agents } = await detail(request, SAMPLE.slug);
    const withWhy = agents.filter((a) => a.why);
    expect(withWhy.length).toBeGreaterThan(0);
    for (const a of withWhy) {
      const { skills } = await json(request, `/api/agents/${a.slug}`);
      expect(skills.some((s) => quotes(a.why, s)), `${a.slug}: ${a.why}`).toBe(true);
    }
  });

  test('an unknown slug is a JSON 404 that says where the tasks are', async ({ request }) => {
    expect(await json(request, '/api/tasks/not-a-real-task', 404)).toEqual({
      error: 'not_found',
      message: 'No task with slug "not-a-real-task". GET /api/tasks lists every task.',
    });
  });

  test('allows any origin, on errors too', async ({ request }) => {
    for (const path of ['/api/tasks', `/api/tasks/${SAMPLE.slug}`, `/api/agents?task=${SAMPLE.slug}`, '/api/agents?task=not-a-real-task']) {
      const res = await request.get(path, { headers: { ...UA, origin: 'https://example.com' } });
      expect(res.headers()['access-control-allow-origin'], path).toBe('*');
    }
  });
});

test.describe('task on GET /api/agents', () => {
  test('returns each task\'s listings, best fit first, as GET /api/tasks/<slug> does', async ({ request }) => {
    for (const t of TASKS) {
      const { agents } = await detail(request, t.slug);
      const body = await json(request, `/api/agents?task=${t.slug}&limit=50`);
      expect(body.total, t.slug).toBe(t.count);
      expect(body.agents.map((a) => a.slug), t.slug).toEqual(agents.slice(0, 50).map((a) => a.slug));
    }
  });

  test('combines with the other filters and keeps best fit first; pages with offset', async ({ request }) => {
    const { agents } = await detail(request, SAMPLE.slug);
    const mcp = agents.filter((a) => a.accessMethods.includes('mcp'));
    const body = await json(request, `/api/agents?task=${SAMPLE.slug}&access=mcp&limit=50`);
    expect(body.total).toBe(mcp.length);
    expect(body.agents.map((a) => a.slug)).toEqual(mcp.slice(0, 50).map((a) => a.slug));

    const official = await json(request, `/api/agents?task=${SAMPLE.slug}&official=true&limit=50`);
    expect(official.total).toBe(SAMPLE.official);
    expect(official.agents.map((a) => a.slug)).toEqual(agents.filter((a) => a.official).slice(0, 50).map((a) => a.slug));

    const second = await json(request, `/api/agents?task=${SAMPLE.slug}&limit=5&offset=5`);
    expect(second.agents.map((a) => a.slug)).toEqual(agents.slice(5, 10).map((a) => a.slug));
  });

  test('a search inside a task keeps only the task\'s listings', async ({ request }) => {
    const fits = new Set((await detail(request, SAMPLE.slug)).agents.map((a) => a.slug));
    const body = await json(request, `/api/agents?task=${SAMPLE.slug}&q=postgres&limit=50`);
    expect(body.total).toBeGreaterThan(0);
    expect(body.total).toBeLessThanOrEqual(SAMPLE.count);
    for (const a of body.agents) expect(fits.has(a.slug), a.slug).toBe(true);
  });

  test('takes the slug in any case; an unknown one is a 400 that says where the tasks are', async ({ request }) => {
    expect((await json(request, `/api/agents?task=${SAMPLE.slug.toUpperCase()}&limit=1`)).total).toBe(SAMPLE.count);
    expect(await json(request, '/api/agents?task=not-a-real-task', 400)).toEqual({
      error: 'unknown_task',
      message: 'No task with slug "not-a-real-task". GET /api/tasks lists every task.',
    });
  });
});

test.describe('/tasks index', () => {
  test('lists every task in order, each row linking its page', async ({ page }) => {
    const res = await page.goto('/tasks');
    expect(res.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tasks');
    await expect(page).toHaveTitle(/^Tasks \|/);
    await expect(human(page).locator('#i-need-to')).toHaveText(`I need to… · ${TASKS.length}`);
    expect(await hrefs(indexRows(page))).toEqual(TASKS.map((t) => `/tasks/${t.slug}`));
  });

  test('each row shows the job, how many tools do it, up to six of their icons and the blurb', async ({ page, request }) => {
    await page.goto('/tasks');
    for (const t of TASKS) {
      const row = human(page).locator(`a[href="/tasks/${t.slug}"]`);
      await expect(row, t.slug).toContainText(t.label);
      await expect(row, t.slug).toContainText(tools(t.count));
      await expect(row, t.slug).toContainText(t.blurb);
      const icons = new Set((await detail(request, t.slug)).agents.map((a) => a.iconUrl)).size;
      await expect(row.locator('.agent-icon'), t.slug).toHaveCount(Math.min(6, icons));
    }
  });

  test('opening a task counts task_select from the index', async ({ page }) => {
    const target = TASKS[TASKS.length - 1];
    await openHydrated(page, '/tasks');
    await human(page).locator(`a[href="/tasks/${target.slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${target.slug}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(titleOf(target));
    expect(await events(page, 'task_select')).toEqual([{ task: target.slug, from: 'tasks' }]);
  });

  test('canonical, share card and the list for search engines', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${ORIGIN}/tasks`);
    await expectCard(page, '/tasks/card.png');
    const list = await itemList(page);
    expect(list.numberOfItems).toBe(TASKS.length);
    expect(list.itemListElement.map((e) => e.url)).toEqual(TASKS.map((t) => t.url));
    expect(list.itemListElement.map((e) => e.name)).toEqual(TASKS.map(titleOf));
  });

  test('text-only view lists every task in the same order, with how many fit', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/tasks');
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(human(page).first()).toBeHidden();
    const rows = agentView.locator('a.agent-row[href^="/tasks/"]');
    expect(await hrefs(rows)).toEqual(TASKS.map((t) => `/tasks/${t.slug}`));
    for (const [i, t] of TASKS.entries()) await expect(rows.nth(i)).toContainText(`${t.count} fit`);
    await expect(agentView).toContainText('GET /api/tasks');
  });
});

test.describe('every task page', () => {
  for (const task of TASKS) {
    test(`/tasks/${task.slug}: the job, its best fits in order with why, official listings, related tasks and stacks`, async ({ page, request }) => {
      const { agents, relatedTasks, stacks } = await detail(request, task.slug);
      const res = await page.goto(`/tasks/${task.slug}`);
      expect(res.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titleOf(task));
      await expect(page).toHaveTitle(new RegExp(`^${escapeRe(titleOf(task))} \\|`));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', task.url);
      await expect(human(page)).toContainText(task.blurb);
      await expect(human(page)).toContainText(task.official > 0 ? `${tools(task.count)} · ${task.official} official` : tools(task.count));
      await expect(human(page)).toContainText(explanation(task));

      const compared = agents.slice(0, COMPARISON_SIZE);
      await expect(comparison(page).locator('#comparison')).toHaveText(`Compared · top ${compared.length}`);
      expect(await hrefs(comparison(page).locator('tbody tr td:first-child a'))).toEqual(compared.map((a) => `/agents/${a.slug}`));
      for (const [i, a] of compared.entries()) {
        await expect(comparison(page).locator('tbody tr').nth(i).locator('td').nth(2)).toHaveText(SIGN_IN[a.authType]);
      }
      expect(await hrefs(comparison(page).locator('a[href^="/compare"]'))).toHaveLength(1);

      const best = agents.slice(0, PAGE_SIZE);
      await expect(bestFits(page).locator('#best-fits')).toHaveText(`Best fits · ${best.length}`);
      const fits = bestFits(page).locator('ol > li > .cmp-card > a');
      expect(await hrefs(fits)).toEqual(best.map((a) => `/agents/${a.slug}`));
      for (const [i, a] of best.entries()) {
        await expect(fits.nth(i).locator('h3')).toHaveText(a.name);
        const why = fits.nth(i).locator('p:has(> .dir-label)');
        if (a.why) await expect(why, a.slug).toHaveText(`Why ${a.why}`);
        else await expect(why, a.slug).toHaveCount(0);
      }
      await expect(bestFits(page).locator(`a[href="/browse?task=${task.slug}"] .dir-row-name`)).toHaveText(
        task.count > best.length ? `See all ${task.count} on Browse, with filters` : 'Filter these on Browse'
      );

      const official = agents.filter((a) => a.official);
      const officialSection = human(page).locator('section[aria-labelledby="official"]');
      if (official.length === 0) {
        await expect(officialSection).toHaveCount(0);
      } else {
        await expect(officialSection.locator('#official')).toHaveText(`Official · ${official.length}`);
        expect(await hrefs(officialSection.locator('li > a'))).toEqual(official.slice(0, OFFICIAL_SIZE).map((a) => `/agents/${a.slug}`));
        const all = officialSection.locator(`a[href="/browse?task=${task.slug}&official=1"]`);
        if (official.length > OFFICIAL_SIZE) await expect(all).toContainText(`See all ${official.length} official on Browse`);
        else await expect(all).toHaveCount(0);
      }

      const related = human(page).locator('section[aria-labelledby="related-tasks"] li > a');
      expect(await hrefs(related)).toEqual(relatedTasks.map((s) => `/tasks/${s}`));
      for (const [i, slug] of relatedTasks.entries()) {
        const t = TASKS.find((x) => x.slug === slug);
        await expect(related.nth(i)).toContainText(t.label);
        await expect(related.nth(i)).toContainText(tools(t.count));
      }
      expect(await hrefs(human(page).locator('section[aria-labelledby="in-stacks"] li > a'))).toEqual(stacks.map((s) => `/stacks/${s}`));

      const next = TASKS[(TASKS.indexOf(task) + 1) % TASKS.length];
      const nav = page.getByRole('navigation', { name: 'More tasks' });
      await expect(nav.getByRole('link', { name: 'All tasks' })).toHaveAttribute('href', '/tasks');
      await expect(nav.getByRole('link', { name: /^Next:/ })).toHaveAttribute('href', `/tasks/${next.slug}`);
      await expect(nav.getByRole('link', { name: /^Next:/ })).toContainText(next.label);

      const list = await itemList(page);
      expect(list.name).toBe(titleOf(task));
      expect(list.numberOfItems).toBe(best.length);
      expect(list.itemListElement.map((e) => e.url)).toEqual(best.map((a) => a.url));
      await expectCard(page, `/tasks/${task.slug}/card.png`);
    });
  }
});

test.describe('task page details', () => {
  test('counts task_to_listing_click when a best fit is opened', async ({ page, request }) => {
    const item = (await detail(request, SAMPLE.slug)).agents[1];
    await openHydrated(page, `/tasks/${SAMPLE.slug}`);
    await bestFits(page).locator('ol > li > .cmp-card > a').nth(1).click();
    await expect(page).toHaveURL(new RegExp(`/agents/${item.slug}$`));
    expect(await events(page, 'task_to_listing_click')).toEqual([{ task: SAMPLE.slug, slug: item.slug, from: 'task-page' }]);
  });

  test('counts task_select when a related task is opened', async ({ page, request }) => {
    const { relatedTasks } = await detail(request, SAMPLE.slug);
    test.skip(relatedTasks.length === 0, 'no related tasks');
    await openHydrated(page, `/tasks/${SAMPLE.slug}`);
    await human(page).locator('section[aria-labelledby="related-tasks"] li > a').first().click();
    await expect(page).toHaveURL(new RegExp(`/tasks/${relatedTasks[0]}$`));
    expect(await events(page, 'task_select')).toEqual([{ task: relatedTasks[0], from: 'task-page' }]);
  });

  test('a task page is a large share card', async ({ page }) => {
    await page.goto(`/tasks/${SAMPLE.slug}`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  });

  test('text-only view lists the best fits in order with why, and links the task as JSON', async ({ page, request }) => {
    const best = (await detail(request, SAMPLE.slug)).agents.slice(0, PAGE_SIZE);
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto(`/tasks/${SAMPLE.slug}`);
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(agentView).toContainText(`/tasks/${SAMPLE.slug}`);
    const compared = best.slice(0, COMPARISON_SIZE);
    const listed = agentView.locator('a.agent-row[href^="/agents/"]');
    expect(await hrefs(listed)).toEqual([...compared, ...best].map((a) => `/agents/${a.slug}`));
    await expect(agentView).toContainText('compared · as of ');
    for (const [i, a] of compared.entries()) await expect(listed.nth(i)).toContainText(`auth: ${a.authType}`);
    for (const [i, a] of best.entries()) await expect(listed.nth(compared.length + i)).toContainText(a.why ?? a.description);
    await expect(agentView.locator(`a[href="/api/tasks/${SAMPLE.slug}"]`)).toHaveCount(1);
    await expect(agentView.locator(`a[href="/browse?task=${SAMPLE.slug}"]`)).toHaveCount(1);
  });

  test('an unknown task is the 404 page, and so is its card', async ({ page }) => {
    const res = await page.goto('/tasks/not-a-real-task');
    expect(res.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    const card = await page.request.get('/tasks/not-a-real-task/card.png', { headers: UA });
    expect(card.status()).toBe(404);
  });
});

test.describe('/browse?task=', () => {
  test('narrows the directory to the task, best fit first, under a banner that names it', async ({ page, request }) => {
    const { agents } = await detail(request, SAMPLE.slug);
    await page.goto(`/browse?task=${SAMPLE.slug}`);
    await expect(page).toHaveTitle(new RegExp(`^${escapeRe(titleOf(SAMPLE))} \\|`));
    await expect(banner(page)).toHaveAttribute('data-task', SAMPLE.slug);
    await expect(banner(page)).toContainText(titleOf(SAMPLE));
    await expect(banner(page)).toContainText(SAMPLE.blurb);
    await expect(banner(page)).toContainText(explanation(SAMPLE));
    await expect(banner(page).getByRole('link', { name: 'About this task →' })).toHaveAttribute('href', `/tasks/${SAMPLE.slug}`);
    await expect(banner(page).getByRole('link', { name: 'Remove task' })).toHaveAttribute('href', '/browse');
    await expect(countBar(page)).toHaveText(fitLine(SAMPLE.count));
    expect(await hrefs(cards(page))).toEqual(agents.slice(0, BROWSE_PAGE).map((a) => `/agents/${a.slug}`));
    await expect(sortMenu(page)).toHaveValue('relevance');
    await expect(sortMenu(page).locator('option[value="relevance"]')).toHaveText('Best match');
  });

  test('keeps the task through filters and the sort, and removing it keeps them', async ({ page, request }) => {
    const mcp = await json(request, `/api/agents?task=${SAMPLE.slug}&access=mcp&limit=50`);
    await page.goto(`/browse?task=${SAMPLE.slug}&access=mcp`);
    await expect(countBar(page)).toHaveText(fitLine(mcp.total));
    // The API answers at most 50; the page shows up to 60.
    expect((await hrefs(cards(page))).slice(0, mcp.agents.length)).toEqual(mcp.agents.map((a) => `/agents/${a.slug}`));
    await expect(banner(page).getByRole('link', { name: 'Remove task' })).toHaveAttribute('href', '/browse?access=mcp');

    await human(page).getByRole('button', { name: 'Official' }).click();
    await expect(page).toHaveURL(/[?&]official=1/);
    expect(new URL(page.url()).searchParams.get('task')).toBe(SAMPLE.slug);
    const official = await json(request, `/api/agents?task=${SAMPLE.slug}&access=mcp&official=true&limit=50`);
    await expect(countBar(page)).toHaveText(fitLine(official.total, true));
    expect(await hrefs(cards(page))).toEqual(official.agents.map((a) => `/agents/${a.slug}`));

    await sortMenu(page).selectOption('newest');
    await expect(page).toHaveURL(/[?&]sort=newest/);
    expect(new URL(page.url()).searchParams.get('task')).toBe(SAMPLE.slug);
    const newest = await json(request, `/api/agents?task=${SAMPLE.slug}&access=mcp&official=true&sort=newest&limit=50`);
    await expect.poll(() => hrefs(cards(page))).toEqual(newest.agents.map((a) => `/agents/${a.slug}`));

    const remove = banner(page).getByRole('link', { name: 'Remove task' });
    await expect(remove).toHaveAttribute('href', '/browse?official=1&access=mcp&sort=newest');
    await remove.click();
    await expect(page).toHaveURL(/\/browse\?official=1&access=mcp&sort=newest$/);
    await expect(banner(page)).toHaveCount(0);
    const without = await json(request, '/api/agents?access=mcp&official=true&limit=1');
    await expect(countBar(page)).toHaveText(`${without.total} official agents listed`);
  });

  test('a search inside a task finds only the task\'s listings', async ({ page, request }) => {
    const body = await json(request, `/api/agents?task=${SAMPLE.slug}&q=postgres&limit=50`);
    await page.goto(`/browse?task=${SAMPLE.slug}&q=postgres`);
    await expect(banner(page)).toHaveAttribute('data-task', SAMPLE.slug);
    await expect(countBar(page)).toHaveText(`${body.total} agent${body.total === 1 ? '' : 's'} matched`);
    expect(await hrefs(cards(page))).toEqual(body.agents.map((a) => `/agents/${a.slug}`));
    await expect(banner(page).getByRole('link', { name: 'Remove task' })).toHaveAttribute('href', '/browse?q=postgres');
  });

  test('takes the slug in any case; an unknown one is ignored, so a stale link still lists everything', async ({ page, request }) => {
    await page.goto(`/browse?task=${SAMPLE.slug.toUpperCase()}`);
    await expect(banner(page)).toHaveAttribute('data-task', SAMPLE.slug);
    await expect(countBar(page)).toHaveText(fitLine(SAMPLE.count));

    const all = await json(request, '/api/agents?limit=1');
    await page.goto('/browse?task=not-a-real-task');
    await expect(banner(page)).toHaveCount(0);
    await expect(countBar(page)).toHaveText(`${all.total} agents listed`);
    await expect(page).toHaveTitle(/^Browse Agents \|/);
  });

  test('counts task_to_listing_click when a listing is opened from a task view', async ({ page, request }) => {
    const first = (await detail(request, SAMPLE.slug)).agents[0];
    await openHydrated(page, `/browse?task=${SAMPLE.slug}`);
    await cards(page).first().click();
    await expect(page).toHaveURL(new RegExp(`/agents/${first.slug}$`));
    expect(await events(page, 'task_to_listing_click')).toEqual([{ task: SAMPLE.slug, slug: first.slug, from: 'browse' }]);
  });

  test('a search inside a task that finds nothing offers to drop the task, with what it brings back', async ({ page, request }) => {
    const task = TASKS.find((t) => t.slug === 'transcribe-audio');
    test.skip(!task, 'no transcribe-audio task');
    test.skip((await json(request, `/api/agents?task=${task.slug}&q=postgres&limit=1`)).total > 0, 'a transcription listing mentions postgres');
    const without = await json(request, '/api/agents?q=postgres&limit=6');
    await page.goto(`/browse?task=${task.slug}&q=postgres`);
    await expect(countBar(page)).toHaveText('No agents found');
    await expect(banner(page)).toHaveAttribute('data-task', task.slug);

    const drop = human(page).locator('[data-recovery="removal"] a[data-what="task"]');
    await expect(drop).toHaveText(`Remove Task: ${task.label} · ${without.total} results`);
    await expect(drop).toHaveAttribute('href', '/browse?q=postgres');
    const preview = human(page).locator('[data-recovery="closest"]');
    await expect(preview).toContainText(`Closest matches, without Task: ${task.label}`);
    expect(await hrefs(preview.locator('a[href^="/agents/"]:has(h3)'))).toEqual(without.agents.map((a) => `/agents/${a.slug}`));
    await expect.poll(() => events(page, 'search_zero_results')).toEqual([{ offer: 'unfiltered', words: 1, filters: 1 }]);

    await drop.click();
    await expect(page).toHaveURL(/\/browse\?q=postgres$/);
    await expect(countBar(page)).toHaveText(`${without.total} agents matched`);
    expect(await events(page, 'recovery_click')).toEqual([{ kind: 'removal', what: 'task' }]);
  });

  test('a word nothing uses, inside a task: dropping the word keeps the task', async ({ page }) => {
    await page.goto(`/browse?task=${SAMPLE.slug}&q=zzqxjv`);
    await expect(human(page)).toContainText('Nothing in the directory mentions “zzqxjv”.');
    const drop = human(page).locator('[data-recovery="removal"] a[data-what="word"]');
    await expect(drop).toHaveText(`Remove “zzqxjv” · ${SAMPLE.count} results`);
    await expect(drop).toHaveAttribute('href', `/browse?task=${SAMPLE.slug}`);
    await expect(human(page).locator('[data-recovery="removal"] a[data-what="task"]')).toHaveCount(0);
  });

  test('text-only view names the task and links its page and the view without it', async ({ page, request }) => {
    const { agents } = await detail(request, SAMPLE.slug);
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto(`/browse?task=${SAMPLE.slug}&access=mcp`);
    const agentView = page.locator('.agent-only');
    await expect(agentView).toBeVisible();
    await expect(agentView).toContainText(`task: ${SAMPLE.slug}`);
    await expect(agentView.locator(`a[href="/tasks/${SAMPLE.slug}"]`)).toHaveCount(1);
    await expect(agentView.locator('a[href="/browse?access=mcp"]')).toHaveCount(1);
    const mcp = agents.filter((a) => a.accessMethods.includes('mcp'));
    expect(await hrefs(agentView.locator('a.agent-row[href^="/agents/"]'))).toEqual(mcp.map((a) => `/agents/${a.slug}`));
  });
});

test.describe('"I need an agent to…" on the homepage', () => {
  test('a box labelled by its heading, the first tasks as chips and a link to all of them', async ({ page }) => {
    await page.goto('/');
    const block = homeBlock(page);
    await expect(block.getByRole('heading', { level: 2 })).toHaveText('I need an agent to…');
    await expect(taskBox(page)).toHaveAttribute('placeholder', 'read my email');
    await expect(block.getByRole('button', { name: 'Go', exact: true })).toBeVisible();
    await expect(hint(page)).toHaveText(EMPTY_HINT);
    expect(await hrefs(chips(block))).toEqual(chipHrefs());
    expect(await chips(block).allTextContents()).toEqual(TASKS.slice(0, CHIPS).map((t) => t.label));
    await expect(block.getByRole('link', { name: `All ${TASKS.length} tasks` })).toHaveAttribute('href', '/tasks');
    // The hero's box stays the page's only search landmark.
    await expect(page.getByRole('search')).toHaveCount(1);
  });

  test('a chip opens its task on /browse, counted as picked on the homepage', async ({ page }) => {
    const task = TASKS[1];
    await openHydrated(page, '/');
    await chips(homeBlock(page)).nth(1).click();
    await page.waitForURL(new RegExp(`/browse\\?task=${task.slug}$`));
    await expect(banner(page)).toHaveAttribute('data-task', task.slug);
    expect(await events(page, 'task_select')).toEqual([{ task: task.slug, from: 'home' }]);
  });

  test('words that name a task go to it, and the line under the box says so first', async ({ page }) => {
    const task = TASKS.find((t) => t.slug === 'send-and-read-email');
    await page.goto('/');
    await say(page, 'read my inbox please');
    await expect(hint(page)).toContainText(`Task: ${task.label} · ${tools(task.count)}`);
    await expect(hint(page).getByRole('link', { name: 'search the directory instead' })).toHaveAttribute(
      'href',
      '/browse?q=read+my+inbox+please'
    );
    await taskBox(page).press('Enter');
    await page.waitForURL(new RegExp(`/browse\\?task=${task.slug}$`));
    await expect(countBar(page)).toHaveText(fitLine(task.count));
    expect(await events(page, 'task_search')).toEqual([{ matched: true, task: task.slug, words: 4 }]);
    expect(JSON.stringify(await page.evaluate(() => window.vaq ?? []))).not.toMatch(/inbox|please/);
  });

  test('words that name no task run as a search, with the closest tasks offered', async ({ page }) => {
    await page.goto('/');
    await say(page, 'build an agent');
    await expect(hint(page)).toContainText('Searches the directory for “build an agent”');
    const close = hint(page).getByRole('link');
    await expect(close).toHaveCount(2);
    for (const link of await close.all()) {
      const label = (await link.textContent()).trim();
      const task = TASKS.find((t) => t.label === label);
      expect(task, `"${label}" is a task`).toBeTruthy();
      expect(label).toMatch(/\bbuild\b/);
      await expect(link).toHaveAttribute('href', `/browse?task=${task.slug}`);
    }
    await homeBlock(page).getByRole('button', { name: 'Go', exact: true }).click();
    await page.waitForURL(/\/browse\?q=build\+an\+agent$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Results for “build an agent”');
    expect(await events(page, 'task_search')).toEqual([{ matched: false, words: 3 }]);
  });

  test('a task offered under the box opens it, counted as picked from the box', async ({ page }) => {
    await page.goto('/');
    await say(page, 'build an agent');
    const link = hint(page).getByRole('link').first();
    const label = (await link.textContent()).trim();
    const task = TASKS.find((t) => t.label === label);
    await link.click();
    await page.waitForURL(new RegExp(`/browse\\?task=${task.slug}$`));
    expect(await events(page, 'task_select')).toEqual([{ task: task.slug, from: 'task-search' }]);
    expect(await events(page, 'task_search')).toEqual([]);
  });

  test('"search the directory instead" runs the words and counts the task it passed over', async ({ page }) => {
    await page.goto('/');
    await say(page, 'read my email');
    await hint(page).getByRole('link', { name: 'search the directory instead' }).click();
    await page.waitForURL(/\/browse\?q=read\+my\+email$/);
    await expect(countBar(page)).toBeVisible();
    expect(await events(page, 'task_search')).toEqual([{ matched: false, words: 3, declined: 'send-and-read-email' }]);
  });

  test('Go with nothing typed opens every task', async ({ page }) => {
    await page.goto('/');
    await say(page, 'x');
    await taskBox(page).fill('');
    await expect(hint(page)).toHaveText(EMPTY_HINT);
    await homeBlock(page).getByRole('button', { name: 'Go', exact: true }).click();
    await page.waitForURL(/\/tasks$/);
    expect(await events(page, 'task_search')).toEqual([]);
  });

  test('the text-only view lists the same tasks with how many fit', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/');
    const rows = page.locator('.agent-only a.agent-row[href^="/browse?task="]');
    expect(await hrefs(rows)).toEqual(chipHrefs());
    for (const [i, t] of TASKS.slice(0, CHIPS).entries()) await expect(rows.nth(i)).toContainText(`${t.count} fit`);
  });
});

test.describe('task chips atop /browse', () => {
  test('/browse with nothing chosen offers the first tasks, and keeps the sort in their links', async ({ page }) => {
    await page.goto('/browse');
    const block = browseBlock(page);
    await expect(block.getByRole('heading', { level: 2 })).toHaveText('I need an agent to…');
    expect(await hrefs(chips(block))).toEqual(chipHrefs());
    await expect(block.getByRole('link', { name: `All ${TASKS.length} tasks` })).toHaveAttribute('href', '/tasks');
    await page.goto('/browse?sort=newest');
    expect(await hrefs(chips(browseBlock(page)))).toEqual(chipHrefs('&sort=newest'));
  });

  test('a chip opens its task with the sort kept, counted as picked on /browse', async ({ page }) => {
    const task = TASKS[0];
    await openHydrated(page, '/browse?sort=newest');
    await chips(browseBlock(page)).first().click();
    await page.waitForURL(new RegExp(`/browse\\?task=${task.slug}&sort=newest$`));
    await expect(banner(page)).toHaveAttribute('data-task', task.slug);
    await expect(sortMenu(page)).toHaveValue('newest');
    expect(await events(page, 'task_select')).toEqual([{ task: task.slug, from: 'browse' }]);
  });

  test('a search, a task or any filter puts the chips away', async ({ page }) => {
    for (const query of ['q=postgres', `task=${SAMPLE.slug}`, 'category=code-devtools', 'official=1', 'vendor=github', 'verified=1', 'auth=none', 'access=mcp']) {
      await page.goto(`/browse?${query}`);
      await expect(countBar(page), query).toBeVisible();
      await expect(browseBlock(page), query).toHaveCount(0);
    }
  });
});

test.describe('tasks in the search box suggestions', () => {
  test('/search-index.json carries every task with how many listings fit it and its keywords', async ({ request }) => {
    const index = await json(request, '/search-index.json');
    expect(index.tasks).toEqual(TASKS.map((t) => [t.label, t.slug, t.count, t.keywords]));
  });

  test('a keyword suggests its task; picking it opens the task on /browse and empties the box', async ({ page }) => {
    let requested = false;
    page.on('request', (r) => {
      if (new URL(r.url()).pathname === '/search-index.json') requested = true;
    });
    await page.goto('/');
    const box = page.getByRole('combobox', { name: 'Look it up' });
    await expect(async () => {
      await box.blur();
      await box.focus();
      expect(requested).toBe(true);
    }).toPass();
    await box.pressSequentially('postgres');
    const list = human(page).getByRole('search').getByRole('listbox');
    const option = list
      .getByRole('group', { name: 'Tasks' })
      .getByRole('option', { name: new RegExp(`^${escapeRe(SAMPLE.label)} ${SAMPLE.count} agents$`) });
    await expect(option).toBeVisible();
    const position = (await list.getByRole('option').allTextContents()).findIndex((t) => t.startsWith(SAMPLE.label)) + 1;
    await option.click();
    await page.waitForURL(new RegExp(`/browse\\?task=${SAMPLE.slug}$`));
    await expect(banner(page)).toHaveAttribute('data-task', SAMPLE.slug);
    await expect(human(page).getByRole('search').getByRole('combobox')).toHaveValue('');
    expect(await events(page, 'autocomplete_select')).toEqual([{ kind: 'task', position, chars: 8, page: '/' }]);
    expect(await events(page, 'task_select')).toEqual([{ task: SAMPLE.slug, from: 'autocomplete' }]);
  });
});

test.describe('tasks elsewhere on the site', () => {
  test('the footer links /tasks', async ({ page }) => {
    await page.goto('/stacks');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Tasks', exact: true })).toHaveAttribute('href', '/tasks');
  });

  test('llms.txt, index.md, skill.md and /for-agents point agents at /tasks and /api/tasks', async ({ page }) => {
    for (const path of ['/llms.txt', '/index.md']) {
      const body = await (await page.request.get(path, { headers: UA })).text();
      expect(body, path).toContain(`${ORIGIN}/tasks`);
      expect(body, path).toContain(`${TASKS.length} tasks`);
      expect(body, path).toContain('/api/tasks');
      expect(body, path).toContain('task=');
    }
    const skill = await (await page.request.get('/skill.md', { headers: UA })).text();
    expect(skill).toContain(`GET ${ORIGIN}/api/tasks`);
    expect(skill).toContain(`GET ${ORIGIN}/api/agents?task=${SAMPLE.slug}`);
    await page.goto('/for-agents');
    await expect(page.getByRole('link', { name: `${ORIGIN}/tasks` })).toHaveAttribute('href', '/tasks');
    await expect(page.getByRole('main')).toContainText('GET /api/tasks');
  });

  test('the homepage text-only view lists /tasks with its JSON', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('viewMode', 'agent'); } catch {} });
    await page.goto('/');
    const row = page.locator('.agent-only .agent-row').filter({ has: page.locator('a[href="/tasks"]') });
    await expect(row).toContainText('json: GET /api/tasks');
  });

  test('no app console errors on /tasks, a task page and /browse?task=', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    for (const path of ['/tasks', `/tasks/${SAMPLE.slug}`, `/browse?task=${SAMPLE.slug}`]) await page.goto(path, { waitUntil: 'networkidle' });
    // Aborted analytics beacons are the harness's doing, not the app's.
    expect(errors.filter((t) => !/_vercel|insights|ERR_FAILED|sentry/i.test(t))).toEqual([]);
  });
});

test.describe('tasks on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('/tasks, task pages and /browse?task= do not scroll sideways', async ({ page }) => {
    const longest = TASKS.reduce((a, b) => (b.label.length > a.label.length ? b : a));
    const overflow = [];
    for (const path of ['/tasks', `/tasks/${SAMPLE.slug}`, `/tasks/${longest.slug}`, `/browse?task=${longest.slug}`]) {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      if (sw > cw + 1) overflow.push(`${path}: scrollWidth ${sw} > ${cw}`);
    }
    expect(overflow).toEqual([]);
  });

  test('the homepage and /browse task chips fit, and the box, Go and every chip are easy to tap', async ({ page }) => {
    for (const [path, block] of [['/', homeBlock], ['/browse', browseBlock]]) {
      await page.goto(path);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw, path).toBeLessThanOrEqual(cw + 1);
      const heights = await block(page).locator('input, button, li > a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      expect(heights.length, path).toBeGreaterThan(CHIPS);
      expect(Math.min(...heights), path).toBeGreaterThanOrEqual(44);
    }
  });

  test('on /browse the chips are one row that scrolls sideways, so the filters stay near the top', async ({ page }) => {
    await page.goto('/browse');
    const row = browseBlock(page).locator('ul');
    const tops = await row.locator('li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const [scrollWidth, clientWidth] = await row.evaluate((e) => [e.scrollWidth, e.clientWidth]);
    expect(scrollWidth).toBeGreaterThan(clientWidth);
    const all = browseBlock(page).getByRole('link', { name: `All ${TASKS.length} tasks` });
    await all.scrollIntoViewIfNeeded();
    await expect(all).toBeInViewport();
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw + 1);
  });
});
