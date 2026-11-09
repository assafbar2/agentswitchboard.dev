import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { BASE, LOCAL, LOCAL_PORT, SMOKE_ONLY } from './target.mjs';

/**
 * End-to-end checks. They run against a production build of this checkout on
 * localhost:3100, built and started here unless a server already answers there.
 * E2E_BASE_URL points them at a deployment instead, where only the smoke and
 * edge specs run (target.mjs). They are read-only: tests/fixtures.mjs lets only
 * GETs and /api/mcp calls through and drops analytics beacons. Uses the
 * installed Chrome; set E2E_CHANNEL=chromium to use Playwright's own build
 * (`npx playwright install chromium`).
 */
const channel = process.env.E2E_CHANNEL === 'chromium' ? undefined : 'chrome';

export default defineConfig({
  testDir: './tests',
  ...(SMOKE_ONLY ? { testMatch: ['00-smoke.spec.mjs', '05-edge.spec.mjs'] } : {}),
  timeout: 45_000,
  retries: 1,
  workers: 4,
  outputDir: './test-results',
  reporter: [['list'], ['json', { outputFile: 'results/report.json' }]],
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: `npm run build && npm run start -- -p ${LOCAL_PORT}`,
          cwd: fileURLToPath(new URL('..', import.meta.url)),
          url: LOCAL,
          reuseExistingServer: true,
          timeout: 600_000,
        },
      }),
  use: {
    baseURL: BASE,
    headless: true,
    // Tagged so these requests can be filtered out of the request logs.
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 asb-e2e (live smoke tests)',
    extraHTTPHeaders: { 'x-asb-e2e': '1' },
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } } }],
});
