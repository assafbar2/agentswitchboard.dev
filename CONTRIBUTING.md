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
verify before merge and flip it. **Verified** means we checked it works: your URLs
load, you declare an access method, and any linked GitHub repo is live (not
archived, pushed within 12 months). It's re-checked monthly and drops if the
product stops meeting that bar. `featured` is maintainer-only.

## Official listings

`"official": true` puts an **Official** badge on a listing and includes it in
the Official filter and the homepage's Official platforms section. It is a
fact about who publishes the product, not a paid placement, and it is separate
from `verified` (code-backed checks) and `featured` (maintainer placement).

A listing is Official only if **both** hold:

1. **First-party.** The listed product is built and published by the company
   that owns the brand or platform, and its `agentUrl` is on that company's
   official domain or GitHub org. A community-built "Notion MCP" doesn't count;
   Notion's own does. Wrappers re-hosted on registries (Smithery, Glama, npm)
   don't count either.
2. **Major vendor.** The company is publicly traded, a frontier AI lab, valued
   around $1B or more in a reported round, or the clear commercial leader in
   its category. A wholly owned subsidiary or acquired brand of such a company
   counts (Slack, GitHub, HashiCorp).

Not Official, even when the product is the canonical one: projects governed by
foundations or standards bodies (the MCP SDKs, A2A), university labs, and
personal repos of well-known people.

**Evidence is enforced in CI.** Every vendor is listed in
[`content/official-vendors.json`](content/official-vendors.json) with why it
qualifies (`basis`, `evidence`) and the official `sources` its products ship
from (`"notion.com"` covers subdomains; `"github.com/makenotion"` covers one
org). `validate-content.ts` rejects `"official": true` unless the entry's
`agentUrl` sits on exactly one vendor's sources.

**Don't self-assign it.** Leave `official` out of new submissions, including
for your own product. Maintainers set it during review. If you think a listing
qualifies, say so in the PR and link the evidence: the vendor's own page or
repo for the product, and a public source for the listing, valuation, or
ownership. A PR that adds a vendor to `official-vendors.json` needs the same
evidence and a maintainer's approval.

## Fix an existing entry

Dead link, renamed product, new access method? Edit the entry's JSON file,
add an `updated` line to the changelog, open a PR. These merge fast.

## Not a developer?

Use the form at [agentswitchboard.dev/submit](https://agentswitchboard.dev/submit).
