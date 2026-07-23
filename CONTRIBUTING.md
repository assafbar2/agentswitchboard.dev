# Contributing to Agent Switchboard

The catalog is maintained **in the open**: every agent in the directory is a
JSON file in [`content/agents/`](content/agents/). Corrections and new
listings happen via pull request — CI validates, a human maintainer merges.

## Submit a new agent

1. Fork the repo
2. Add `content/agents/<your-slug>.json` (kebab-case slug, must match filename):

```json
{
  "id": "your-slug",
  "name": "Official Product Name",
  "slug": "your-slug",
  "description": "Starts with a verb. What it does + who it's for. Max 200 chars.",
  "providerName": "Company or OSS org",
  "providerUrl": "https://example.com",
  "agentUrl": "https://docs.example.com",
  "categories": ["code-devtools"],
  "tags": ["six-to-eight", "specific-kebab-tags"],
  "skills": [
    { "id": "kebab-id", "name": "2-4 Word Name", "description": "Verb-first, 80-150 chars, a real documented capability." }
  ],
  "authType": "apiKey",
  "supportsStreaming": false,
  "supportsPushNotifications": false,
  "status": "published",
  "featured": false,
  "verified": false,
  "tier": "free",
  "discoveredBy": "manual",
  "accessMethods": ["api", "mcp"],
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

3. Add a line to `content/changelog.json` (top of the array):
   `{ "action": "added", "slug": "your-slug", "name": "Official Product Name" }`
4. Run `npx tsx scripts/validate-content.ts` locally (CI runs it too)
5. Open the PR — fill in the template

**Valid category slugs** are in [`content/categories.json`](content/categories.json).
**Field rules** are enforced by [`scripts/validate-content.ts`](scripts/validate-content.ts):
description ≤ 200 chars, no generic tags (`ai`, `tool`, `automation`…),
kebab-case everywhere, 1–3 categories.

## What gets accepted

We are curators, not collectors. Listings need:

- ✅ A real, working product with a loadable URL
- ✅ Programmatic access: API, MCP, CLI, or browser extension — not just a web UI
- ✅ An identifiable provider (company or OSS org)
- ✅ Genuine adoption or traction signals (stars, registry listings, funding, community discussion — or, for vendors submitting their own product, endpoints we can verify live)
- ❌ No vaporware, GPT wrappers, dead links, or pure self-promo

Vendors submitting their own product: set `"verified": false` — maintainers
verify endpoints before merge and flip it. `featured` is maintainer-only.

## Fix an existing entry

Dead link, renamed product, new access method? Edit the entry's JSON file,
add an `updated` line to the changelog, open a PR. These merge fast.

## Not a developer?

Use the form at [agentswitchboard.dev/submit](https://agentswitchboard.dev/submit).
