import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { getEveryAgent, getAllCategories } from '@/lib/catalog';
import { getReleases, highlightedReleases } from '@/lib/changelog';
import { curatedComparisons } from '@/lib/compare';
import { COMPARE_MAX } from '@/lib/compare-link';
import { getDropSchedule } from '@/lib/drops';
import { BASE_URL } from '@/lib/env';
import { isNew, NEW_DAYS, newSince } from '@/lib/freshness';
import { FEATURED_DEFINITION, OFFICIAL_DEFINITION } from '@/lib/public-api';
import { getStacks, stackOfTheWeek } from '@/lib/stacks';
import { getTasks } from '@/lib/tasks';

/**
 * Markdown twin of the homepage.
 *
 * Reachable directly at /index.md, and served for `/` when a client asks for
 * text/markdown via Accept (see proxy.ts). Kept deliberately short: an
 * agent that wants the whole catalog should follow the links to /agents.json
 * or the MCP server rather than scrape prose.
 *
 * Prerendered at build time, like /llms.txt. Rendered per request it returned
 * HTTP 500 in production: it read the catalog three times at once (React
 * cache() does not dedupe inside a route handler), opening ~2,500 content files
 * concurrently, past the 1,024 file descriptors a serverless function gets
 * (EMFILE). The catalog only changes with a deploy, so a static body is exact.
 */
export const dynamic = 'force-static';

export async function GET() {
  // One catalog read, then categories — sequential, never several at once.
  const agents = await getEveryAgent();
  const categories = await getAllCategories();
  const agentCount = agents.length;
  const verifiedCount = agents.filter((a) => a.verified).length;
  const providerCount = new Set(agents.map((a) => a.providerName)).size;
  const latestDrop = getDropSchedule().drops[0];
  const dropLine = latestDrop
    ? `\n- [/drops](${BASE_URL}/drops) — the weekly drops, new listings batch by batch; the latest is [/drops/${latestDrop.date}](${BASE_URL}/drops/${latestDrop.date}) (${latestDrop.added.length} added).`
    : '';
  const since = newSince();
  const newLine = `\n- [/new](${BASE_URL}/new) — every listing added in the last ${NEW_DAYS} days (${
    agents.filter((a) => isNew(a.createdAt, since)).length
  } since ${since}), grouped by drop.`;
  const [release] = highlightedReleases(getReleases());
  const releaseLine = release
    ? `\n- [/whats-new](${BASE_URL}/whats-new) — what you can do on the site that you couldn't before, release by release, each feature with the page to try it; the latest is ${release.version} ${release.title} (${release.date}). Every release and weekly drop as a feed: [/feed.xml](${BASE_URL}/feed.xml) (RSS) or [/atom.xml](${BASE_URL}/atom.xml) (Atom).`
    : '';
  const weekStack = stackOfTheWeek(getStacks());
  const stackLine = `\n- [/stacks](${BASE_URL}/stacks) — tools that work together for one job, each with why it is there${
    weekStack ? `; the stack of the week is [/stacks/${weekStack.slug}](${BASE_URL}/stacks/${weekStack.slug})` : ''
  }. JSON: \`/api/stacks\`.`;
  const taskLine = `\n- [/tasks](${BASE_URL}/tasks) — ${getTasks().length} tasks, to start from the job ("query a database"): each lists the listings that fit it, best first, with why. JSON: \`/api/tasks\`; filter one with \`/api/agents?task={slug}\`.`;
  const comparisons = curatedComparisons(agents);
  const compareLine = `\n- [/compare](${BASE_URL}/compare) — up to ${COMPARE_MAX} listings side by side at \`/compare?a={slug}&b={slug}&c={slug}\`: what each does, access, auth, how to connect it, skills. ${comparisons.length} curated comparisons${
    comparisons[0] ? `, such as [/compare/${comparisons[0].slug}](${BASE_URL}/compare/${comparisons[0].slug})` : ''
  }.`;

  const body = `# Agent Switchboard

The curated directory for the agentic web: ${agentCount} AI agents (${verifiedCount} verified) from ${providerCount} providers, each tagged with how it is reached: \`api\`, \`mcp\`, \`cli\`, or \`browser-extension\`.

The \`verified\`, \`official\` and \`featured\` flags in search and detail results mean:

- ${VERIFIED_DEFINITION}
- ${OFFICIAL_DEFINITION}
- ${FEATURED_DEFINITION}

## What to use

- \`${BASE_URL}/api/mcp\` — MCP server (streamable HTTP). Tools: \`search_agents\`, \`get_agent\`, \`list_categories\`, \`submit_listing\` (files a public GitHub issue for review). Setup for Grok, Claude, ChatGPT: [/connect](${BASE_URL}/connect).
- \`GET ${BASE_URL}/api/agents?q=&task=&category=&access=&official=&verified=&auth=&sort=&limit=&offset=\` — plain REST search, no auth. \`auth=none\` keeps listings that need no key or sign-in; \`task\` keeps those that fit a task from \`/api/tasks\`; \`sort\` is \`relevance\`, \`newest\`, \`skills\` or \`name\`. Detail: \`/api/agents/{slug}\`.
- [/openapi.json](${BASE_URL}/openapi.json) — OpenAPI 3.1 description of the HTTP surface.
- [/.well-known/mcp.json](${BASE_URL}/.well-known/mcp.json) — MCP server manifest.
- [/agents.json](${BASE_URL}/agents.json) — the entire catalog as one large JSON file, no auth. Use it for bulk or offline work; search for everything else.
- [/llms.txt](${BASE_URL}/llms.txt) — plain-language site guide.
- [/for-agents](${BASE_URL}/for-agents) — how to use all of the above.${dropLine}${newLine}${releaseLine}${stackLine}${taskLine}${compareLine}

## When to use this site

Reach for Agent Switchboard when you need to find out whether an agent already exists for a job, compare a few that do, or look up the access methods and homepage of one you have already chosen. It is a directory, not an execution platform: it will not run an agent for you.

## Categories

${categories.map((c) => `- ${c.name} (\`${c.slug}\`)`).join('\n')}

## Pages

- [Browse](${BASE_URL}/browse) · [Categories](${BASE_URL}/categories) · [Tasks](${BASE_URL}/tasks) · [Weekly drops](${BASE_URL}/drops) · [New listings](${BASE_URL}/new) · [Stacks](${BASE_URL}/stacks) · [Compare](${BASE_URL}/compare) · [What's new](${BASE_URL}/whats-new) · [Submit an agent](${BASE_URL}/submit)
- [About](${BASE_URL}/about) · [Contact](${BASE_URL}/contact) · [Privacy](${BASE_URL}/privacy) · [Terms of Use](${BASE_URL}/terms) · [Disclaimer](${BASE_URL}/disclaimer)

Contact: barnir@agentmail.to
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      // Same URL can answer as HTML or Markdown, so caches must key on Accept.
      Vary: 'Accept, Accept-Encoding',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
