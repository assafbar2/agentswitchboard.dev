import { defineConfig, devices } from '@playwright/test';

/**
 * Live end-to-end checks. They run against production by default
 * (E2E_BASE_URL overrides it, e.g. a Vercel preview) and are read-only:
 * tests/fixtures.mjs lets only GETs and /api/mcp calls through and drops
 * analytics beacons. Uses the installed Chrome; set E2E_CHANNEL=chromium to use
 * Playwright's own build (`npx playwright install chromium`).
 */
const channel = process.env.E2E_CHANNEL === 'chromium' ? undefined : 'chrome';

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  retries: 1,
  workers: 4,
  outputDir: './test-results',
  reporter: [['list'], ['json', { outputFile: 'results/report.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://agentswitchboard.dev',
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
