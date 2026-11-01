// Shared guard for every live test: the site is production, so nothing a test
// does may write. Only GET/HEAD reach the site, plus JSON-RPC POSTs to
// /api/mcp (read-only tools). Analytics beacons are dropped so the run does
// not show up as visitors. Every blocked write is recorded on `blocked`.
import { test as base, expect } from '@playwright/test';
export const UA_TAG = 'asb-e2e';
export const test = base.extend({
  blocked: async ({}, use) => { await use([]); },
  page: async ({ page, blocked }, use) => {
    await page.route('**/*', (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.pathname.startsWith('/_vercel/insights') || url.pathname.startsWith('/_vercel/speed-insights') || /sentry\.io|umami\.is$/.test(url.host)) return route.abort();
      const m = req.method();
      if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue();
      if (m === 'POST' && url.pathname === '/api/mcp') return route.continue();
      blocked.push(`${m} ${url.pathname}`);
      return route.fulfill({ status: 418, contentType: 'text/plain', body: 'blocked by asb-e2e: live site is read-only for tests' });
    });
    await use(page);
  },
});
export { expect };
