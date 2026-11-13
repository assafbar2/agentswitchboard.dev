import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { getEveryAgent, getAllCategories } from '@/lib/catalog';
import { getReleases, highlightedReleases } from '@/lib/changelog';
import { curatedComparisons } from '@/lib/compare';
import { COMPARE_MAX } from '@/lib/compare-link';
import { getDropSchedule } from '@/lib/drops';
import { isNew, NEW_DAYS, newSince } from '@/lib/freshness';
import { FEATURED_DEFINITION, OFFICIAL_DEFINITION, SPONSORED_DEFINITION } from '@/lib/public-api';
import { OPERATOR_ALTERNATIVES } from '@/lib/operator';
import { MIN_ALTERNATIVES } from '@/lib/related';
import { OPERATOR_EXAMPLES, PARTS_MAX } from '@/lib/request-parts';
import { MY_STACK_MAX } from '@/lib/stack-link';
import { getStacks, stackOfTheWeek } from '@/lib/stacks';
import { getTasks } from '@/lib/tasks';

export const dynamic = 'force-static';

export async function GET() {
  // Sequential on purpose: each call reads the whole catalog from disk.
  const agents = await getEveryAgent();
  const categories = await getAllCategories();
  const verifiedCount = agents.filter((a) => a.verified).length;

  const categoryLines = categories.map((c) => `- ${c.slug}: ${c.name}`).join('\n');
  const latestDrop = getDropSchedule().drops[0];
  const dropLine = latestDrop
    ? `\n- Weekly drops, the new listings batch by batch: https://agentswitchboard.dev/drops (latest: https://agentswitchboard.dev/drops/${latestDrop.date}, ${latestDrop.added.length} added)`
    : '';
  const since = newSince();
  const newCount = agents.filter((a) => isNew(a.createdAt, since)).length;
  const [release] = highlightedReleases(getReleases());
  const releaseLine = release
    ? `\n- What's new on the site, release by release, each feature with the page to try it: https://agentswitchboard.dev/whats-new (latest: ${release.version} ${release.title}, ${release.date}). Every release and weekly drop as a feed: https://agentswitchboard.dev/feed.xml (RSS) or https://agentswitchboard.dev/atom.xml (Atom)`
    : '';
  const stacks = getStacks();
  const week = stackOfTheWeek(stacks);
  const weekLine = week ? `; stack of the week: https://agentswitchboard.dev/stacks/${week.slug}` : '';
  const comparisons = curatedComparisons(agents);

  const body = `# Agent Switchboard

> The curated directory for AI agents with real API, MCP, CLI, and browser-extension access.
> Browse the full site: https://agentswitchboard.dev

## What this site is

Agent Switchboard is a curated directory of ${agents.length} AI agents (${verifiedCount} of
them verified), organized by category and access method. If you are an AI agent — or
an AI assistant helping a human find the right tool — this directory is for you.

Every listing includes the agent's name, description, category, supported access
methods (api / mcp / cli / browser-extension), and a direct link to the provider.

The \`verified\`, \`official\` and \`featured\` flags in search and detail results mean:

- ${VERIFIED_DEFINITION}
- ${OFFICIAL_DEFINITION}
- ${FEATURED_DEFINITION}

On the website, the REST API and /agents.json, a \`sponsored\` flag also marks paid placements. ${SPONSORED_DEFINITION}

## How to use this directory

- Full agent context (for agents): https://agentswitchboard.dev/for-agents
- Machine-readable catalog (JSON index, pages of 50): https://agentswitchboard.dev/agents.json
- Browse by category: https://agentswitchboard.dev/categories
- Search and filter: https://agentswitchboard.dev/browse${dropLine}
- New listings, everything added in the last ${NEW_DAYS} days: https://agentswitchboard.dev/new (${newCount} since ${since}, grouped by drop)${releaseLine}
- Alternatives to a listing: https://agentswitchboard.dev/agents/<slug>/alternatives (listings with at least ${MIN_ALTERNATIVES}; each says what it has in common)
- Stacks, tools that work together for one job: https://agentswitchboard.dev/stacks (${stacks.length} stacks, each tool with why it is there, and how to connect them all${weekLine})
- A stack of your own to hand a user: https://agentswitchboard.dev/stack?items=<slug>,<slug>&title=<title> (up to ${MY_STACK_MAX} listings in your order, as a page they can open, compare, connect and copy to My stack at https://agentswitchboard.dev/my-stack)
- Tasks, to start from the job ("query a database"): https://agentswitchboard.dev/tasks (${getTasks().length} tasks, each with the listings that fit it, best first; /browse?task=<slug> filters them; each task page as Markdown: https://agentswitchboard.dev/tasks/<slug>.md)
- Compare up to ${COMPARE_MAX} listings side by side: https://agentswitchboard.dev/compare?a=<slug>&b=<slug>&c=<slug> (what each does, access, auth, how to connect it, skills; ${comparisons.length} curated comparisons are listed at https://agentswitchboard.dev/compare)
- The Switchboard, every listing on one board: https://agentswitchboard.dev/switchboard (a jack per listing in a panel per category, Official ones filled in and the latest drop's lit; the board as one image: https://agentswitchboard.dev/switchboard/card.png)
- The Operator, a whole job in plain words put through to a tool for each part: https://agentswitchboard.dev/operator?q=<request> (for example ?q=${OPERATOR_EXAMPLES[0].replace(/ /g, '+')}; up to ${PARTS_MAX} parts, each with its task, its pick and why, ${OPERATOR_ALTERNATIVES} alternatives and one config to connect them all. Assembled from the task map, no AI: the same request always gets the same stack)

For a job rather than a product name, GET /api/tasks lists the tasks, and
GET /api/agents?task=<slug> (or \`task\` on the \`search_agents\` MCP tool) returns
the listings that fit one, best fit first.
To find agents by access method or use case, search: the \`search_agents\` MCP tool, or
GET /api/agents?access=mcp&category=<slug> (add \`official=true\` for first-party listings
from major vendors, e.g. Notion's own Notion MCP; \`verified=true\` for Verified ones;
\`auth=none\` for no key or sign-in; \`since=7\` for what was added in the last 7 days, or
\`since=<YYYY-MM-DD>\`; \`sort=newest\` for the latest additions first).
/agents.json indexes the whole catalog: it links static pages of up to 50 listings
(/catalog/1.json, /catalog/2.json, …; each has \`next\`). Use them for bulk or offline
work, filtering on \`accessMethods\`, \`categories\`, \`authType\` (\`none\` for no key or
sign-in) and \`official\`.

To help a user choose and set up:
- One recommendation for what your user needs, and the next step to start using it: the
  \`recommend\` MCP tool, or GET /api/recommend?need=<the need, in a sentence>. Each need
  it names gets one pick, why it fits, the next step (the MCP config to paste when the
  vendor's docs give one) and two alternatives. Picked by fixed matching rules, not a
  model or paid placement. Write the need yourself; never include names, emails or phones.
- Compare 2 or 3 listings, the facts that set each apart and one row per field: the
  \`compare_agents\` MCP tool, or GET /api/compare?a=<slug>&b=<slug>&c=<slug>
- Listings that could stand in for one, each with why: the \`alternatives_to\` MCP tool,
  or GET /api/agents/<slug>/alternatives
- One MCP client config to paste for up to ${MY_STACK_MAX} listings, with how to connect the
  ones it can't hold: the \`connect_bundle\` MCP tool, or GET /api/bundle?items=<slug>,<slug>
  (every address and command is copied from the vendor's docs, as on its listing page)

## This directory is itself an MCP server

- Remote MCP (Streamable HTTP, no auth): https://agentswitchboard.dev/api/mcp
- Stdio-only clients: npx -y mcp-remote https://agentswitchboard.dev/api/mcp
- Server manifest: https://agentswitchboard.dev/.well-known/mcp.json
- Tools: search_agents, get_agent, list_categories, compare_agents, alternatives_to, connect_bundle, recommend, submit_listing (files a public GitHub issue for human review; publishes nothing), request_missing_tool (tells the maintainer privately that nothing fits a job; also POST /api/missing-tool)
- Connect it to Grok, Grok Bot, the xAI API, Claude, or ChatGPT: https://agentswitchboard.dev/connect
- Plain REST search (no MCP handshake needed): GET /api/agents?q=&task=&category=&access=&official=&verified=&auth=&since=&sort=&limit=&offset=&page=
- REST detail: GET /api/agents/{slug}
- REST categories: GET /api/categories
- REST stacks: GET /api/stacks, GET /api/stacks/{slug}
- REST tasks: GET /api/tasks, GET /api/tasks/{slug}
- REST compare: GET /api/compare?a={slug}&b={slug}&c={slug}
- REST alternatives: GET /api/agents/{slug}/alternatives
- REST connect bundle: GET /api/bundle?items={slug},{slug}
- REST recommend: GET /api/recommend?need={the need, in a sentence}
- OpenAPI: https://agentswitchboard.dev/openapi.json
- Connector skill: https://agentswitchboard.dev/skill.md

## WebMCP (in-browser tools)

If you are an agent viewing this site in a browser, the same tools are registered
on \`document.modelContext\` (W3C WebMCP API, polyfilled) — call them directly
instead of scraping the DOM. No setup: they self-register on page load.

- Declaration: https://agentswitchboard.dev/.well-known/webmcp.json
- Tools: search_agents, get_agent, list_categories, compare_agents, alternatives_to,
  connect_bundle, recommend. They call the REST API above, so answers and their order are the
  same as the remote MCP's; search and listing objects use the REST field names (see
  the OpenAPI document).

## Access methods explained

- api               — the agent exposes a REST or HTTP API you can call directly
- mcp               — compatible with the Model Context Protocol (MCP)
- cli               — available as a command-line tool
- browser-extension — available as a browser or IDE extension
                      (search filters also accept \`extension\` as an alias)

## Categories (${categories.length} total)

${categoryLines}

## Legal

- Privacy: https://agentswitchboard.dev/privacy
- Terms of Use: https://agentswitchboard.dev/terms

## Maintained by

Barnir — barnir@agentmail.to
Generated: ${new Date().toISOString().slice(0, 10)}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
