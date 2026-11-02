## What kind of change?

- [ ] New agent listing (`content/agents/<slug>.json` added)
- [ ] Correction to an existing entry (URL fix, renamed product, new access method…)
- [ ] Removal (product discontinued)
- [ ] Code / site change

## For new listings

- **Product URL:**
- **Why it belongs here** (adoption signals — stars, registries, funding, community — or live endpoints we can verify):
- **Your relationship to the product** (maintainer / vendor / user / none):
- **Docs for any Use it now field** (`mcpEndpoint`, `mcpCommand`, `install`, `quickstartUrl`, `apiBaseUrl`): the page that prints each value

## Checklist

- [ ] `npx tsx scripts/validate-content.ts` passes locally
- [ ] Added a line to `content/changelog.json`
- [ ] All URLs load
- [ ] Skills describe real, documented capabilities (not aspirations)
- [ ] Any Use it now field is copied from the product's own docs, with no placeholders
- [ ] For vendor submissions: `"verified": false` (maintainers verify & flip)
- [ ] `official` left unset (maintainers set it; if you think it applies, link the evidence above. See CONTRIBUTING.md → Official listings)
