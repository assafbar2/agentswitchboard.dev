# AGENT SWITCHBOARD — CONTENT DISCOVERY RUN

**Mode A** — launched or materially updated since the last full sweep (cap 14 days).
**Mode B** — established products still missing from the catalog.
Run both unless told otherwise.

**Principles.** *Derive, don't declare* — read the contract from code every run (§4).
*Prefer inclusion* — reject only against §3. An incomplete entry beats a missing one.
*Only the code gates* — nothing here is a hard requirement; preferences get flagged, not enforced.

**Two approvals, both conversational.** Gate 1 (which entries) and Gate 2 (deploy). No
tool-permission prompts interrupt the run — the mechanics are pre-authorized in
`~/.claude/settings.json`. If a prompt ever appears, the allowlist drifted; fix it, don't
click through. **Never treat a permission prompt as a substitute for Gate 1 or Gate 2.**

---

## 1. GROUND TRUTH

```bash
cd /Users/assafbarnir/1Code/agentswitchboard.dev

# 1a. SYNC — ABORT GATE. Repo is edited from >1 machine. A stale clone silently
# widens the window (§5 reads local git) and re-proposes another machine's work.
git fetch origin
echo "behind $(git rev-list --count HEAD..origin/main) / ahead $(git rev-list --count origin/main..HEAD) / $(git rev-parse --abbrev-ref HEAD)"
```

**Behind > 0 → stop, pull, restart.** Ahead > 0 → warn, live isn't the baseline. Not `main` → stop.

```bash
# 1b. Quarantine dirt — never stage anything on this list.
git status --porcelain | tee /tmp/asb-dirt.txt

# 1c. Counts + reconcile. The validator prints a FILE count (trap 2.1).
npx tsx scripts/validate-content.ts
echo "published $(jq -s '[.[]|select(.status=="published")]|length' content/agents/*.json) / archived $(jq -s '[.[]|select(.status=="archived")]|length' content/agents/*.json)"
curl -fsS https://agentswitchboard.dev/agents.json -o /tmp/asb-live.json
jq -r '.agents[].slug' /tmp/asb-live.json | sort > /tmp/asb-live-slugs.txt
jq -sr '.[]|select(.status=="published")|.slug' content/agents/*.json | sort > /tmp/asb-local-pub.txt
diff /tmp/asb-local-pub.txt /tmp/asb-live-slugs.txt && echo RECONCILED

# 1d. Dedup set — published + draft + archived, so archived never returns as "new".
find content/agents -maxdepth 1 -name '*.json' -exec basename {} .json \; | sort > /tmp/asb-slugs.txt

# 1e. Link-rot harvest — the Monday bot already found dead URLs.
gh issue list --label link-rot --state open --json number,title
```

Compare findings **across reports**: dead in one but not the next = transient; dead in all =
real. Each resolves to UPDATE (replacement verified), ARCHIVE (permanently dead), or
REJECTED (transient).

**Abort if:** behind origin · validation fails · JSON unparseable · no reconcile.
Last sweep was today → Mode B only.

---

## 2. TRAPS

The only hardcoded facts here, because no file records them.

1. `validate-content.ts` prints **file count incl. archived**. Never quote as published.
2. `Weekly drop` subject dates differ from commit dates by weeks. §5 reads the **subject**.
3. Backfills share the `Weekly drop` prefix. The `added [0-9]+` filter excludes them; without it the window collapses.
4. `skills` is optional; **empty is normal** (~90 of 362 had zero, incl. `cursor`, `crewai`). Never withhold an entry over it. Never invent skills.
5. `accessMethods` has no `.min()` either — empty passes CI.
6. Retire `AGENTS_TO_ADD` by **renaming** to `_AGENTS_ADDED_<DATE>_<LABEL>`, never emptying. Audit trail.
7. `status: 'published'` is hardcoded. No draft state — merged is live.
8. Schema is `.strict()`. Inventing a field fails CI.
9. **Judge the product, not the artifact.** A markdown repo isn't the product — check its `homepage`. `awesome-mcp-servers` looks like a plain list; its homepage is Glama, which serves a real JSON API, so it qualifies. Counter-rule: "you can curl any raw repo" is *not* programmatic access.

---

## 3. SCOPE & DISQUALIFIERS

**In scope:** agents · frameworks and orchestration · MCP servers · agent-native APIs, SDKs,
CLIs, runtimes, memory, observability, security, browser, integration infra · **and any API
an agent can realistically drive in a loop.**

**The test is drivability, not intent.** If an agent can authenticate, call it, and act on
the response, it qualifies. It needn't have been built for agents.

**Reject only for these six. Name which one.**

1. No working canonical URL
2. No programmatic surface — web UI only *(read trap 9 first)*
3. Not usable today — waitlist, unshipped, broken
4. No identifiable provider
5. Duplicate *(check `/tmp/asb-slugs.txt`, includes archived)*
6. Undifferentiated reseller of an upstream API

Thin docs, no skills, low stars, quiet commits → **a note in the table, not a rejection.**

**Signal is evidence, not a threshold.** Two standards, never crossed: closed-source
commercial products have no repo — judge docs, customers, working API. Judge open source on
its repo. **Maturity ≠ abandonment.** Blocked source → record **not checked**, never claim otherwise.

---

## 4. DERIVE THE CONTRACT

```bash
sed -n '/^const SkillSchema/,/^function main/p' scripts/validate-content.ts   # rules
grep -n "interface AgentInput" -A 25 scripts/weekly-drop.ts                    # input shape
grep -n "?? " scripts/weekly-drop.ts                                           # defaults
npx tsx scripts/cms.ts                                                         # subcommands
npx tsx scripts/cms.ts categories                                              # category slugs
```

Note which fields are optional or may be empty. Report the contract at Gate 1 so drift is visible.

---

## 5. WINDOW

```bash
LAST=$(git log --first-parent -E --grep='^Weekly drop .*added [0-9]+' -1 --format='%cs|%s')
python3 - "$LAST" <<'PY'
from datetime import date; from pathlib import Path; import re, sys, os
raw=sys.argv[1].strip(); cdate,_,subj=raw.partition("|")
ov=os.environ.get("LOOKBACK_OVERRIDE","").strip(); CAP=14
if ov: w=min(int(ov),CAP); print(f"override -> {w}d")
elif not raw: w=CAP; print(f"no prior sweep -> {CAP}d")
else:
    m=re.search(r"Weekly drop (\d{4}-\d{2}-\d{2})",subj); sweep=m.group(1) if m else cdate
    d=(date.today()-date.fromisoformat(sweep)).days; w=min(max(d,0),CAP)
    print(f"last sweep {sweep} ({'subject' if m else 'commit date'}) -> {w}d")
Path("/tmp/asb-window.txt").write_text(f"{w}\n")
PY
```

Force with `LOOKBACK_OVERRIDE=10`. Always report the window used.

---

## 6. DISCOVERY — ordered by measured yield

**Dedup before you verify.** Collect names → grep `/tmp/asb-slugs.txt` → research only
survivors. Reversing this wastes most of the run.
**Prefer APIs over browsing.** `gh` and HN Algolia never bot-block; scraping registries often does.

### Tier 1 — run every time

**6a. Platform gap audit — the single highest-yield step.** Nothing else finds these.

```bash
for n in stripe twilio sendgrid shopify plaid hubspot salesforce zendesk notion airtable \
  linear jira asana clickup slack discord zoom docusign dropbox supabase mongodb snowflake \
  databricks bigquery datadog vercel netlify cloudflare railway render github gitlab figma \
  canva webflow contentful algolia elastic openrouter groq together fireworks modal inngest \
  deepgram assemblyai serper langchain docker glama smithery; do
  grep -qi "$n" /tmp/asb-slugs.txt || printf "%s " "$n"; done; echo
```

Extend the list each run. Then confirm official first-party MCP servers — the strongest single qualifier:
`gh api repos/<org>/<repo> --jq '"\(.full_name) \(.stargazers_count)★ \(.pushed_at[0:10])"'`

**6b. GitHub discovery.**

```bash
: > /tmp/asb-gh.txt
for q in "mcp-server" "ai-agent" "llm-tools" "agentic" "agent framework" "agent toolkit" "model context protocol"; do
  gh search repos "$q" --sort stars --limit 30 --json fullName,stargazersCount,description \
    | jq -r '.[]|"\(.stargazersCount)\t\(.fullName)\t\(.description[0:80])"' >> /tmp/asb-gh.txt; done
sort -u -k2,2 /tmp/asb-gh.txt | sort -rn | while IFS=$'\t' read -r s r d; do
  grep -qix "$(echo "$r"|cut -d/ -f2|tr '[:upper:]' '[:lower:]')" /tmp/asb-slugs.txt \
    || printf "%8s  %-42s %s\n" "$s" "$r" "${d:0:60}"; done | head -50
```

Expect noise: awesome-lists, courses, substring collisions (`ml-agents`, `nuclear`). Most fail §3.2 — apply trap 9 before rejecting.

**6c. Hacker News** — Mode A's best source. **Encode `>` as `%3E`** or you get silent zeros.

```bash
SINCE=$(python3 -c "import datetime,sys;print(int(datetime.datetime.fromisoformat(sys.argv[1]).timestamp()))" <LAST_SWEEP>)
for q in MCP "AI+agent" agentic "Show+HN+agent"; do
  curl -fsS "https://hn.algolia.com/api/v1/search?query=$q&tags=story&numericFilters=created_at_i%3E$SINCE,points%3E30" \
   | jq -r '.hits[]|"\(.points)p  \(.created_at[0:10])  \(.title[0:60])  \(.url // "NO-URL")"'; done
```

Pull `.url` in the same pass — headlines alone can't become entries.

### Tier 2 — medium yield
Smithery `?sort=usage` (real usage numbers) · mcp.so `?sort=latest` (good for recency; ~2 in 3 are low-signal self-submissions) · Glama API `https://glama.ai/api/mcp/v1/servers`.

### Tier 3 — low yield, time permitting
`registry.modelcontextprotocol.io` (raw feed: alphabetical, duplicated, ad-tech heavy) ·
there.so · mcpservers.org · e2b-dev/awesome-ai-agents · Product Hunt · Futurepedia · HF
trending · TechCrunch/Batch/Ben's Bites/TLDR · Indie Hackers · Reddit · composio.dev/tools ·
theresanaiforthat · A2A discussions.

**Report every Tier-3 source as checked or not checked. Never imply coverage you don't have.**

---

## GATE 1 — APPROVE THE ENTRIES

Present **one table**, sorted strongest first, every row numbered. Summaries only — draft
full field-level entries *after* approval, never before. At 30+ candidates, drafting
up front wastes most of it.

```
RUN CONTEXT   sync · window (last sweep) · baseline published (local==live?) · link-rot issues read
CONTRACT      required · optional/may-be-empty · lengths · enums · banned tags · categories · drift?
```

**TO ADD**

| # | Name | Provider | Categories | Access | Signal | Gaps |
|---|------|----------|-----------|--------|--------|------|
| 1 | LangChain | LangChain | orchestration, code-devtools | api, cli | 143k★, pushed today | — |
| 2 | Groq | Groq | language, infrastructure | api | official inference API | no skills documented |

**TO UPDATE**

| # | Slug | Field | Current → Proposed | Evidence |
|---|------|-------|--------------------|----------|
| 1 | google-mcp-toolbox | providerUrl | `…github.io/genai-toolbox/` (404) → `github.com/googleapis/genai-toolbox` (200) | #19 #13 #7 #1 |

**TO ARCHIVE**

| # | Slug | Disqualifier | Replacement |
|---|------|-------------|-------------|
| 1 | blender-mcp | §3.1 no working URL | none — upstream deleted |

**REJECTED** — one line each, naming the §3 disqualifier.
**SOURCES** — checked / not checked.

**Reply with:** `all` · `all except 5, 12, 19` · `only 1-7` · `add 1-9, update 1, skip archive` · `cancel`

Nothing is written before this reply.

---

## PHASE 2 — APPLY

Draft full entries for approved rows → paste into `AGENTS_TO_ADD` → run:

```bash
npx tsx scripts/weekly-drop.ts
```

Then **rename** the array to `_AGENTS_ADDED_<YYYY_MM_DD>_<LABEL>` and declare a fresh empty
`AGENTS_TO_ADD` below it (trap 6). Never run with a stale populated array.

Updates/features/archives: use subcommands exactly as `cms.ts` printed in §4, one per
approved field. Don't hand-edit JSON a subcommand can write — they also append changelog.

```bash
npx tsx scripts/validate-content.ts && npm run typecheck && npm test && npm run lint && npm run build
jq -s '[.[]|select(.status=="published")]|length' content/agents/*.json
```

**Lint note:** untracked `.claude/worktrees/` produces ~100 phantom errors. Scope it:
`npx eslint . --ignore-pattern '.claude/**'`. Only tracked-file results count.

---

## GATE 2 — APPROVE THE DEPLOY

```
Added N · Updated N · Archived N · changelog entries N
Published:  before (live) N → after (local) N · delta = +adds −archives   [must reconcile exactly]
Link-rot resolved: #N
Validation: content ✅ typecheck ✅ tests ✅ lint ✅ build ✅ nothing unrelated staged ✅
git diff --stat

Nothing committed or pushed. Reply "push".
```

---

## PUBLISH

```bash
git fetch origin && git rev-list --count HEAD..origin/main   # non-zero -> stop, pull, rebase
git add content/ scripts/weekly-drop.ts                       # NEVER git add -A
git commit -m "Weekly drop YYYY-MM-DD: added X, updated Y, archived Z"
git push origin main
```

Today's date **and** a numeric `added X` — the next run's window depends on both (traps 2, 3).
`git add -A` would sweep `package-lock.json` and `.claude/worktrees/` from the dirt list.

**Verify, then report:** CI green · deploy succeeded · `/agents.json` matches Gate 2's "after"
· sample new pages return 200 · archived slugs absent from the published catalog.

**Then close the link-rot issues you resolved** — only those, never ones you didn't review:

```bash
gh issue close <n> --comment "Resolved in Weekly drop YYYY-MM-DD (<sha>): <what changed>"
```

---

## FINAL REPORT

```
Sync · window used (last sweep) · contract drift
Started N published → finished N (verified live)
ADDED / UPDATED / ARCHIVED / REJECTED (with disqualifier) / NEW CATEGORIES
LINK-ROT CLOSED · SOURCES NOT CHECKED · COMMIT · DEPLOYMENT
```

---

## HARD RULES

Never run behind `origin/main` · no writes before Gate 1 · no push before Gate 2 · never
`git add -A` · derive the contract every run · reject only against §3 and name which · never
withhold over a missing optional field, absent skills, low stars, or quiet commits · never
invent skills or access methods · never quote the validator's count as published · retire
`AGENTS_TO_ADD` by renaming · dedup before verifying · close only link-rot issues you
resolved · report unchecked sources honestly · **code wins over this document.**
