// What Vercel's edge adds in front of the app, so these run only against a
// deployment: HSTS, the http:// and www redirects on the production domain,
// and the vercel.json routes that turn crawlers away from query pages and share
// cards (app/robots.ts already asks them to stay off).
// Read-only: GETs only.
import { test, expect } from './fixtures.mjs';
import { ON_PRODUCTION, ON_VERCEL, PRODUCTION } from '../target.mjs';

test.skip(!ON_VERCEL, 'Vercel’s edge adds these; next start does not');

const UA = { 'user-agent': 'Mozilla/5.0 asb-e2e (edge)' };
const CRAWLERS = {
  PerplexityBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  GoogleOther: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; GoogleOther)',
  ClaudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
};
const FETCHED_FOR_PEOPLE = {
  browser: UA['user-agent'],
  Twitterbot: 'Twitterbot/1.0',
  'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
};
const MIX = 'a=linear&b=sentry-mcp';
const QUERY_PAGES = [`/compare?${MIX}`, '/stack?items=linear,sentry-mcp', '/operator?q=track+bugs'];
const CARDS = [
  '/card.png',
  '/agents/linear/card.png',
  '/agents/livekit-agents/alternatives/card.png',
  '/categories/language/card.png',
  '/drops/2026-10-31/card.png',
  '/stacks/card.png',
  '/tasks/card.png',
  '/switchboard/card.png',
  '/new/card.png',
  '/whats-new/card.png',
  `/compare/card.png?${MIX}`,
];

const status = async (page, path, ua) => (await page.request.get(path, { headers: { 'user-agent': ua }, maxRedirects: 0 })).status();

test('HSTS is set with max-age of at least one year', async ({ page }) => {
  const res = await page.request.get('/', { headers: UA });
  const hsts = res.headers()['strict-transport-security'];
  expect(hsts).toBeTruthy();
  expect(Number(hsts.match(/max-age=(\d+)/)[1])).toBeGreaterThanOrEqual(31536000);
});

test('http:// permanently redirects to https:// on the same path', async ({ page }) => {
  test.skip(!ON_PRODUCTION, 'the production domain only');
  const res = await page.request.get(`${PRODUCTION.replace('https:', 'http:')}/about`, { headers: UA, maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
  expect(res.headers()['location']).toBe(`${PRODUCTION}/about`);
});

test('www host either redirects to the apex or canonicalises to it', async ({ page }) => {
  test.skip(!ON_PRODUCTION, 'the production domain only');
  const res = await page.request.get(`${PRODUCTION.replace('://', '://www.')}/about`, { headers: UA, maxRedirects: 0 });
  const code = res.status();
  test.info().annotations.push({ type: 'www behaviour', description: `status ${code} location ${res.headers()['location'] || '-'}` });
  if (code >= 300 && code < 400) {
    expect(res.headers()['location']).toBe(`${PRODUCTION}/about`);
  } else {
    expect(code).toBe(200);
    expect((await res.text()).match(/<link rel="canonical" href="([^"]+)"/)?.[1]).toBe(`${PRODUCTION}/about`);
  }
});

test.describe('vercel.json turns crawlers away from query pages and share cards', () => {
  for (const path of QUERY_PAGES) {
    test(`${path} is denied to a crawler and served to a browser`, async ({ page }) => {
      expect(await status(page, path, CRAWLERS.PerplexityBot)).toBe(403);
      expect(await status(page, path, FETCHED_FOR_PEOPLE.browser)).toBe(200);
    });
  }

  test('a compare mix is denied to every crawler named in its trap', async ({ page }) => {
    for (const [name, ua] of Object.entries(CRAWLERS)) {
      expect.soft(await status(page, `/compare?${MIX}`, ua), name).toBe(403);
    }
  });

  test('a compare mix and its share card are served when a person asks for them', async ({ page }) => {
    for (const [name, ua] of Object.entries(FETCHED_FOR_PEOPLE)) {
      expect.soft(await status(page, `/compare?${MIX}`, ua), `${name}: page`).toBe(200);
      expect.soft(await status(page, `/compare/card.png?${MIX}`, ua), `${name}: card`).toBe(200);
    }
  });

  test('every kind of share card is denied to a crawler and served to a person or a link preview', async ({ page }) => {
    for (const path of CARDS) {
      expect.soft(await status(page, path, CRAWLERS.PerplexityBot), `PerplexityBot ${path}`).toBe(403);
      for (const [name, ua] of Object.entries(FETCHED_FOR_PEOPLE)) expect.soft(await status(page, path, ua), `${name} ${path}`).toBe(200);
    }
  });

  test('a crawler still gets the bare pages, a listing and the catalog API', async ({ page }) => {
    for (const path of ['/compare', '/stacks', '/operator', '/agents/linear', '/api/agents?limit=1']) {
      expect.soft(await status(page, path, CRAWLERS.PerplexityBot), path).toBe(200);
    }
  });
});
