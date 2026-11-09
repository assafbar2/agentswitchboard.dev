# e2e checks

About 900 Playwright tests of the site: homepage, search and `/browse`, every
category, listing pages, weekly drops, stacks and tasks, compare, My stack and
shared stacks, what's new and the feeds, the Switchboard, the Operator, the
text-only view and theme, the machine endpoints (`/api/mcp`, `/llms.txt`,
`/agents.json`, …), content pages and navigation, mobile layout,
accessibility, and social-card and HTTP-header metadata.

```bash
npm run test:e2e
```

- **Target.** A production build of this checkout on `localhost:3100`. The
  config runs `npm run build` and `npm run start -- -p 3100` first, unless a
  server already answers on that port; it then tests that server as it is, so
  restart it after a change.
- **Deployments.** `E2E_BASE_URL=https://… npm run test:e2e` runs only
  `00-smoke` and `05-edge` against a deployment: the edge spec checks what
  Vercel adds in front of the app (HSTS, the http:// and www redirects, the
  `vercel.json` rules that turn crawlers away from query pages), which a local
  server doesn't have. Every request to a deployment, preview or production,
  counts against the Vercel team's usage and a full run makes thousands, so
  the full suite runs against one only with `E2E_FULL=1`.
- **Read-only.** `tests/fixtures.mjs` routes every request: only GET/HEAD/OPTIONS
  and JSON-RPC POSTs to `/api/mcp` reach the site; anything else (the submit
  form's server action, for one) is answered 418 and recorded. Analytics beacons
  are dropped, and requests carry an `asb-e2e` user agent. The MCP
  `submit_listing` tool files a real public issue, so tests call it only with an
  already-listed URL or invalid input, which return before anything is filed.
- **Browser.** Uses the installed Chrome. With `E2E_CHANNEL=chromium` it uses
  Playwright's build instead (`npx playwright install chromium` first).
- Some tests compare the pages with `content/` in this checkout, so against a
  deployment, run them from the checkout it was built from.
