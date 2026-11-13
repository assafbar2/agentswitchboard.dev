import Link from '@/components/Link';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { EndpointLink } from '@/components/EndpointLink';
import { CopyBlock } from '@/components/CopyBlock';
import { AGENT_PROMPT } from '@/lib/agent-prompt';
import { VerifiedBadge, VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { getEveryAgent } from '@/lib/catalog';
import { COMPARE_MAX } from '@/lib/compare-link';
import { NEW_DAYS } from '@/lib/freshness';
import { OPERATOR_ALTERNATIVES } from '@/lib/operator';
import { FEATURED_DEFINITION, OFFICIAL_DEFINITION, SPONSORED_DEFINITION } from '@/lib/public-api';
import { MIN_ALTERNATIVES } from '@/lib/related';
import { PARTS_MAX } from '@/lib/request-parts';
import { MY_STACK_MAX } from '@/lib/stack-link';
import type { Agent } from '@/lib/types';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'For AI Agents',
      description:
        'Machine-readable context about Agent Switchboard: what it is, how to use the catalog, and how to find the right AI agent by category or access method.',
      path: '/for-agents',
      robots: { index: true, follow: true },
    },
    parent
  );
}

// Stored access-method values with what each means. Typed against the data so
// a key that doesn't exist (the old `extension`, which always counted 0) can't compile.
const ACCESS_METHODS: { key: Agent['accessMethods'][number]; meaning: string }[] = [
  { key: 'api', meaning: 'direct REST or HTTP API' },
  { key: 'mcp', meaning: 'Model Context Protocol compatible' },
  { key: 'cli', meaning: 'command-line interface' },
  { key: 'browser-extension', meaning: 'browser or IDE extension' },
];

export default async function ForAgentsPage() {
  const agents = await getEveryAgent();
  const verifiedCount = agents.filter((a) => a.verified).length;

  const byCategory = agents.reduce<Record<string, number>>((acc, a) => {
    a.categories.forEach((c) => {
      acc[c.slug] = (acc[c.slug] ?? 0) + 1;
    });
    return acc;
  }, {});

  const byAccess = agents.reduce<Record<string, number>>((acc, a) => {
    (a.accessMethods ?? []).forEach((m) => {
      acc[m] = (acc[m] ?? 0) + 1;
    });
    return acc;
  }, {});

  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12 font-mono text-sm text-[var(--dir-ink)] leading-relaxed space-y-10 break-words">

        {/* Header */}
        <div className="pb-6 border-b-[3px] border-[var(--dir-ink)]!">
          <p className="dir-label mb-2">
            # agent context document
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-2">
            Agent Switchboard
          </h1>
          <a
            href="https://agentswitchboard.dev"
            className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2 text-sm"
          >
            → agentswitchboard.dev
          </a>
          <p className="text-[var(--dir-muted)] text-xs mt-1">
            The curated directory for AI agents — browse, compare, and integrate.
          </p>
        </div>

        <section className="space-y-2" id="paste">
          <h2 className="dir-bar">## Give this to your agent</h2>
          <p>
            A person can start with one line pasted into any agent. It points the agent at{' '}
            <EndpointLink href="/skill.md" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /skill.md
            </EndpointLink>
            , the guide to searching this directory, with no key or sign-up:
          </p>
          <CopyBlock
            label="One line to paste"
            text={AGENT_PROMPT}
            what="the line for your agent"
            event="agent_prompt_copy"
            data={{ from: 'for-agents' }}
            prose
          />
        </section>

        {/* What this is */}
        <section className="space-y-2">
          <h2 className="dir-bar">## What this site is</h2>
          <p>
            Agent Switchboard is a curated directory of {agents.length} AI agents
            ({verifiedCount} of them verified), organized by category and access method
            (api, mcp, cli, browser-extension).
            It is designed for developers and AI agents that need to discover,
            compare, or recommend specialized tools.
          </p>
          <p>
            If you are an AI agent helping a user find a tool, delegate a task,
            or integrate a capability — this directory is your starting point.
          </p>
          <p>
            The <code className="font-bold">verified</code>,{' '}
            <code className="font-bold">official</code> and{' '}
            <code className="font-bold">featured</code> flags in search and
            detail results mean:
          </p>
          <ul className="space-y-2 pl-4">
            <li>
              {/* The badge already says "Verified", so drop the definition's own label. */}
              <VerifiedBadge /> {VERIFIED_DEFINITION.replace(/^Verified:\s*/, '')}
            </li>
            <li>{OFFICIAL_DEFINITION}</li>
            <li>{FEATURED_DEFINITION}</li>
          </ul>
          <p>
            On the website, the REST API and <code className="font-bold">/agents.json</code>, a{' '}
            <code className="font-bold">sponsored</code> flag also marks paid placements. {SPONSORED_DEFINITION}
          </p>
        </section>

        {/* MCP server */}
        <section className="space-y-2" id="mcp">
          <h2 className="dir-bar">## This directory IS an MCP server</h2>
          <p>
            Connect directly and query the catalog with native tools —{' '}
            <code className="font-bold">search_agents</code>,{' '}
            <code className="font-bold">get_agent</code>,{' '}
            <code className="font-bold">list_categories</code> — get one pick and
            the next step for a need with <code className="font-bold">recommend</code>,
            help a user choose with <code className="font-bold">compare_agents</code>,{' '}
            <code className="font-bold">alternatives_to</code> and{' '}
            <code className="font-bold">connect_bundle</code> (one MCP client config
            for up to {MY_STACK_MAX} listings), and suggest a listing with{' '}
            <code className="font-bold">submit_listing</code> (files a public GitHub
            issue for human review; publishes nothing). When nothing fits a job,{' '}
            <code className="font-bold">request_missing_tool</code> tells the
            maintainer privately what was missing:
          </p>
          <pre className="rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-4 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "agentswitchboard": { "url": "https://agentswitchboard.dev/api/mcp" }
  }
}`}
          </pre>
          <p>
            Streamable HTTP, no auth. Stdio-only clients:{' '}
            <code className="font-bold">npx -y mcp-remote https://agentswitchboard.dev/api/mcp</code>
          </p>
          <p>
            Step-by-step for Grok, Grok Bot, the xAI API, Claude, and ChatGPT:{' '}
            <Link href="/connect" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /connect
            </Link>
          </p>
        </section>

        {/* WebMCP */}
        <section className="space-y-2" id="webmcp">
          <h2 className="dir-bar">## In-browser tools (WebMCP)</h2>
          <p>
            If you are viewing this page in a browser, the seven read tools are
            registered on{' '}
            <code className="font-bold">document.modelContext</code>{' '}
            (W3C WebMCP API, polyfilled). Call them directly — no scraping, no setup.
            They self-register on page load and call the REST API below, so answers
            and their order are the same as the remote server&apos;s; search and
            listing objects use the REST field names.
          </p>
          <ul className="space-y-1 pl-4">
            <li>
              <span className="font-bold">→ Surface:</span>{' '}
              <code className="font-bold">document.modelContext.getTools()</code>
            </li>
            <li>
              <span className="font-bold">→ Static declaration:</span>{' '}
              <a href="/.well-known/webmcp.json" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/.well-known/webmcp.json
              </a>
            </li>
          </ul>
        </section>

        {/* REST search */}
        <section className="space-y-2" id="rest">
          <h2 className="dir-bar">## Plain REST search</h2>
          <p>
            A simple parameterized GET for wiring tools that want plain HTTP
            rather than an MCP handshake. Read-only, no auth, open CORS:
          </p>
          <pre className="rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-4 text-xs overflow-x-auto">
{`GET /api/agents?q=<text>&task=<slug>&category=<slug>&access=<method>
               &official=true&verified=true&auth=<type>&since=<day|days>
               &sort=<order>&limit=<n>&offset=<n>
GET /api/agents/<slug>
GET /api/agents/<slug>/alternatives
GET /api/categories
GET /api/compare?a=<slug>&b=<slug>&c=<slug>
GET /api/bundle?items=<slug>,<slug>
GET /api/recommend?need=<the need, in a sentence>
GET /api/stacks
GET /api/stacks/<slug>
GET /api/tasks
GET /api/tasks/<slug>

→ search: { total, offset, limit, since?, agents: [
     { name, slug, url, iconUrl, description, provider, categories,
       accessMethods, verified, official, featured }
   ] }
→ compare: { title, url, intro, agents: [ { …the search fields,
       authType, setsApart } ], rows: [ { key, label, same,
       values: { <slug>: value } } ], notes }
→ alternatives: { agent, total, url, compareUrl, basis, alternatives: [
     { …the search fields, authType, sharedAccess, inCommon, why } ] }
→ bundle: { summary, stackUrl, config: { mcpServers }, claudeCode,
       setupPrompt, items: [ { …the search fields, authType, how,
       server, docsUrl, note } ], notes }
→ stacks: { total, stackOfTheWeek, stacks: [
     { slug, title, promise, week, url,
       items: [ { …the search fields, authType, why } ] }
   ] }
→ tasks: { total, tasks: [
     { slug, label, blurb, keywords, categories, access, count,
       official, url, browseUrl, agentsUrl }
   ] }
→ task: { …the task fields, agents: [ { …the search fields, authType,
       why } ], relatedTasks, stacks }`}
          </pre>
          <ul className="space-y-1 pl-4">
            <li>
              <span className="font-bold">task</span> — a task slug from{' '}
              <code className="font-bold">GET /api/tasks</code>: only the listings
              that fit it, best fit first (an unknown slug is a 400)
            </li>
            <li>
              <span className="font-bold">access</span> — one of{' '}
              <code className="font-bold">api</code>,{' '}
              <code className="font-bold">mcp</code>,{' '}
              <code className="font-bold">cli</code>,{' '}
              <code className="font-bold">browser-extension</code>{' '}
              (comma-separate to require several;{' '}
              <code className="font-bold">extension</code> is accepted as an
              alias of <code className="font-bold">browser-extension</code>)
            </li>
            <li>
              <span className="font-bold">official</span> —{' '}
              <code className="font-bold">true</code> for first-party listings from
              major vendors only (Notion&apos;s own Notion MCP, not a community build)
            </li>
            <li>
              <span className="font-bold">verified</span> —{' '}
              <code className="font-bold">true</code> for Verified listings only
            </li>
            <li>
              <span className="font-bold">auth</span> — how the listed product
              authenticates: <code className="font-bold">none</code> (no key or
              sign-in), <code className="font-bold">apiKey</code>,{' '}
              <code className="font-bold">oauth2</code> or{' '}
              <code className="font-bold">bearer</code> (comma-separate to accept
              any of them)
            </li>
            <li>
              <span className="font-bold">since</span> — listings added on or after
              a day: a date (<code className="font-bold">YYYY-MM-DD</code>) or a
              number of days back, today included (<code className="font-bold">7</code>{' '}
              is the last 7 days); the response echoes the first day kept
            </li>
            <li>
              <span className="font-bold">limit</span> — 1–50 (default 10);{' '}
              <span className="font-bold">offset</span> — for paging;{' '}
              <code className="font-bold">total</code> is the full match count
            </li>
            <li>
              <span className="font-bold">sort</span> — by default, without{' '}
              <code className="font-bold">q</code>, featured listings first, then
              A→Z (best fit first with a <code className="font-bold">task</code>);
              with <code className="font-bold">q</code>, by relevance. Or{' '}
              <code className="font-bold">newest</code> (most recently added),{' '}
              <code className="font-bold">skills</code> (most first) or{' '}
              <code className="font-bold">name</code> (A→Z)
            </li>
          </ul>
          <p>
            Example:{' '}
            <EndpointLink href="/api/agents?q=video&limit=5" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/agents?q=video&amp;limit=5
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/agents/agentmail" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/agents/agentmail
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/categories" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/categories
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/stacks" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/stacks
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/tasks" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/tasks
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/agents?task=query-a-database&access=mcp&limit=5" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/agents?task=query-a-database&amp;access=mcp&amp;limit=5
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/agents?since=7&sort=newest" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/agents?since=7&amp;sort=newest
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/compare?a=deepgram&b=assemblyai" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/compare?a=deepgram&amp;b=assemblyai
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/agents/deepgram/alternatives" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /api/agents/deepgram/alternatives
            </EndpointLink>
            {' · '}
            <EndpointLink href="/api/bundle?items=linear,sentry-mcp,playwright-mcp,postgres-mcp-pro" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2 break-all">
              /api/bundle?items=linear,sentry-mcp,playwright-mcp,postgres-mcp-pro
            </EndpointLink>
            {' · '}
            <EndpointLink href="/openapi.json" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /openapi.json
            </EndpointLink>
            {' · '}
            <EndpointLink href="/skill.md" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
              /skill.md
            </EndpointLink>
          </p>
        </section>

        {/* How to use */}
        <section className="space-y-2">
          <h2 className="dir-bar">## How to use this directory</h2>
          <ul className="space-y-1 pl-4">
            <li>
              <span className="font-bold">→ MCP server (query the catalog with tools):</span>{' '}
              <code className="font-bold">https://agentswitchboard.dev/api/mcp</code>
            </li>
            <li>
              <span className="font-bold">→ Machine-readable catalog (JSON):</span>{' '}
              <a href="/agents.json" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/agents.json
              </a>
            </li>
            <li>
              <span className="font-bold">→ Browse by category:</span>{' '}
              <Link href="/categories" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/categories
              </Link>
            </li>
            <li>
              <span className="font-bold">→ Search and filter:</span>{' '}
              <Link href="/browse" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/browse
              </Link>
            </li>
            <li>
              <span className="font-bold">→ Weekly drops, the new listings batch by batch:</span>{' '}
              <Link href="/drops" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/drops
              </Link>
            </li>
            <li>
              <span className="font-bold">→ New listings, the last {NEW_DAYS} days:</span>{' '}
              <Link href="/new" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/new
              </Link>
              , grouped by drop; <code className="font-bold">GET /api/agents?sort=newest</code> lists the latest
              additions first
            </li>
            <li>
              <span className="font-bold">→ What&apos;s new on the site, release by release:</span>{' '}
              <Link href="/whats-new" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/whats-new
              </Link>
              , each feature with the page to try it; every release and weekly drop as a feed at{' '}
              <EndpointLink href="/feed.xml" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                /feed.xml
              </EndpointLink>{' '}
              (RSS) or{' '}
              <EndpointLink href="/atom.xml" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                /atom.xml
              </EndpointLink>{' '}
              (Atom)
            </li>
            <li>
              <span className="font-bold">→ Alternatives to a listing:</span>{' '}
              <code className="font-bold">https://agentswitchboard.dev/agents/&lt;slug&gt;/alternatives</code>, for
              listings with at least {MIN_ALTERNATIVES}, each with what it has in common; as JSON at{' '}
              <code className="font-bold">GET /api/agents/&lt;slug&gt;/alternatives</code>
            </li>
            <li>
              <span className="font-bold">→ Stacks, tools that work together for one job:</span>{' '}
              <Link href="/stacks" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/stacks
              </Link>
              , each tool with why it is in the stack, and how to connect them all; as JSON at{' '}
              <code className="font-bold">GET /api/stacks</code>, each stack with the{' '}
              <code className="font-bold">GET /api/bundle</code> call for its listings
            </li>
            <li>
              <span className="font-bold">→ A stack of your own to hand a user:</span>{' '}
              <code className="font-bold break-all">https://agentswitchboard.dev/stack?items=&lt;slug&gt;,&lt;slug&gt;&amp;title=&lt;title&gt;</code>
              , up to {MY_STACK_MAX} listings in your order, as a page they can open, compare, connect and copy to{' '}
              <Link href="/my-stack" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                My stack
              </Link>
              ; <code className="font-bold break-all">GET /api/bundle?items=&lt;slug&gt;,&lt;slug&gt;</code> gives one
              MCP client config for the same listings
            </li>
            <li>
              <span className="font-bold">→ Tasks, to start from the job (&quot;query a database&quot;):</span>{' '}
              <Link href="/tasks" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/tasks
              </Link>
              , each with the listings that fit it, best first, and why; as JSON at{' '}
              <code className="font-bold">GET /api/tasks</code>
            </li>
            <li>
              <span className="font-bold">→ Compare up to {COMPARE_MAX} listings side by side:</span>{' '}
              <code className="font-bold">https://agentswitchboard.dev/compare?a=&lt;slug&gt;&amp;b=&lt;slug&gt;&amp;c=&lt;slug&gt;</code>
              , with what sets each apart; curated comparisons are listed at{' '}
              <Link href="/compare" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/compare
              </Link>
              ; as JSON at <code className="font-bold">GET /api/compare</code> with the same parameters
            </li>
            <li>
              <span className="font-bold">→ Every listing on one board:</span>{' '}
              <Link href="/switchboard" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/switchboard
              </Link>
              , a jack per listing in a panel per category, Official ones filled in and the latest drop&apos;s lit; the
              board as one image at{' '}
              <EndpointLink
                href="/switchboard/card.png"
                className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2"
              >
                /switchboard/card.png
              </EndpointLink>
            </li>
            <li>
              <span className="font-bold">→ A whole job in plain words, the Operator:</span>{' '}
              <code className="font-bold break-all">https://agentswitchboard.dev/operator?q=&lt;request&gt;</code>
              , each part put through to a tool, up to {PARTS_MAX}, with its task, why it was picked and {OPERATOR_ALTERNATIVES}{' '}
              alternatives, then one config to connect them all. It is assembled from the task map, no AI, so the same request
              always gets the same stack; examples at{' '}
              <Link href="/operator" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/operator
              </Link>
            </li>
            <li>
              <span className="font-bold">→ Plain-language guide:</span>{' '}
              <a href="/llms.txt" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/llms.txt
              </a>
            </li>
            <li>
              <span className="font-bold">→ MCP server manifest:</span>{' '}
              <a href="/.well-known/mcp.json" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
                https://agentswitchboard.dev/.well-known/mcp.json
              </a>
            </li>
          </ul>
          <p className="pt-1">
            To find agents by capability, search:{' '}
            <code className="font-bold">search_agents</code> over MCP, or{' '}
            <code className="font-bold">GET /api/agents?access=mcp&amp;category=&lt;slug&gt;</code>.
            To start from a job, pass a task slug from{' '}
            <code className="font-bold">GET /api/tasks</code> as{' '}
            <code className="font-bold">task</code> to either.{' '}
            <code className="font-bold">/agents.json</code> indexes the whole
            catalog in pages of up to 50 (<code className="font-bold">/catalog/1.json</code>{' '}
            and on, each with <code className="font-bold">next</code>) — use them for bulk or
            offline work, filtering on{' '}
            <code className="font-bold">accessMethods</code>,{' '}
            <code className="font-bold">categories</code> or{' '}
            <code className="font-bold">authType</code>.
          </p>
        </section>

        {/* Access methods */}
        <section className="space-y-2">
          <h2 className="dir-bar">## Access methods</h2>
          <ul className="space-y-1 pl-4">
            {ACCESS_METHODS.map(({ key, meaning }) => (
              <li key={key}>
                <span className="font-bold">{key}</span> — {byAccess[key] ?? 0} agents — {meaning}
              </li>
            ))}
          </ul>
        </section>

        {/* Categories */}
        <section className="space-y-2">
          <h2 className="dir-bar">## Categories ({Object.keys(byCategory).length} total)</h2>
          <ul className="space-y-1 pl-4">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([slug, count]) => (
                <li key={slug}>
                  <a
                    href={`/categories/${slug}`}
                    className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2"
                  >
                    {slug}
                  </a>{' '}
                  — {count} agent{count !== 1 ? 's' : ''}
                </li>
              ))}
          </ul>
        </section>

        {/* What agents do NOT get here */}
        <section className="space-y-2">
          <h2 className="dir-bar">## What this site does not provide</h2>
          <p>
            Agent Switchboard is a discovery layer, not a proxy. It does not expose
            the underlying APIs of listed agents — those live at each agent&apos;s own
            homepage. Think of this as the index; the agents themselves are the books.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-2">
          <h2 className="dir-bar">## Contact</h2>
          <p>
            Maintained by Barnir.{' '}
            <a
              href="mailto:barnir@agentmail.to?subject=Agent Switchboard — Agent Inquiry"
              className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2"
            >
              barnir@agentmail.to
            </a>
          </p>
          <p className="text-[var(--dir-muted)] text-xs">
            Last updated: auto-generated from live catalog —{' '}
            {new Date().toISOString().split('T')[0]}
          </p>
        </section>

      </div>
    </div>
  );
}
