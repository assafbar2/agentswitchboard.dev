# Live e2e checks

About 470 Playwright tests that run against the production site after a deploy:
homepage, search and `/browse`, every category, listing pages, the text-only
view and theme, the machine endpoints (`/api/mcp`, `/llms.txt`, `/agents.json`,
…), content pages and navigation, mobile layout, accessibility, and social-card
and HTTP-header metadata.

```bash
npm run test:e2e
```

- **Read-only.** `tests/fixtures.mjs` routes every request: only GET/HEAD/OPTIONS
  and JSON-RPC POSTs to `/api/mcp` reach the site; anything else (the submit
  form's server action, for one) is answered 418 and recorded. Analytics beacons
  are dropped, and requests carry an `asb-e2e` user agent.
- **Target.** `E2E_BASE_URL=https://… npm run test:e2e` points it at another
  deployment. Some assertions check absolute production URLs in the content, so
  production is the reference target.
- **Browser.** Uses the installed Chrome. With `E2E_CHANNEL=chromium` it uses
  Playwright's build instead (`npx playwright install chromium` first).
- Some tests compare the live pages with `content/` in this checkout, so run them
  from a checkout that matches what is deployed.
