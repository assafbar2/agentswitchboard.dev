import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/metadata';
import { SUBMIT_LIMITS } from '@/lib/mcp-submit';
import { BotMark } from '@/components/BotMark';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Use with Grok, Claude, ChatGPT',
      description:
        'Connect Agent Switchboard to Grok, Grok Bot, Claude, ChatGPT, Cursor, or your own bot as a remote MCP server: search the catalog, filter by category or Official, and submit a listing.',
      path: '/connect',
      robots: { index: true, follow: true },
    },
    parent
  );
}

const MCP_URL = 'https://agentswitchboard.dev/api/mcp';

const CLAUDE_INSTALL_URL =
  'https://claude.ai/customize/connectors?modal=add-custom-connector' +
  `&connectorName=${encodeURIComponent('Agent Switchboard')}&connectorUrl=${encodeURIComponent(MCP_URL)}`;

const XAI_API_EXAMPLE = `curl https://api.x.ai/v1/responses \\
  -H "Authorization: Bearer $XAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "grok-4.7",
    "input": "Find official MCP servers for project management",
    "tools": [{
      "type": "mcp",
      "server_url": "${MCP_URL}",
      "server_label": "agentswitchboard",
      "allowed_tools": ["search_agents", "get_agent", "list_categories"]
    }]
  }'`;

const MCP_JSON = `{
  "mcpServers": {
    "agentswitchboard": { "url": "${MCP_URL}" }
  }
}`;

const TOOLS: { name: string; does: string }[] = [
  {
    name: 'search_agents',
    does: 'Search by text or task ("query-a-database"), category, access method (api, mcp, cli, browser-extension), official, verified and auth type. Sorted and paged.',
  },
  { name: 'get_agent', does: 'Full detail for one listing: skills, auth, links, Verified and Official status.' },
  { name: 'list_categories', does: 'Every category with its slug and live agent count.' },
  { name: 'submit_listing', does: 'Suggest a new listing. Opens a public GitHub issue for review; publishes nothing.' },
];

const GROK_BOT_PROMPTS = [
  'Use Agent Switchboard to find the official Figma MCP server, then add it for me.',
  'Use Agent Switchboard to list official MCP servers for payments.',
  'Use Agent Switchboard to find browser agents that have a CLI.',
  'Use Agent Switchboard to compare GitHub MCP and Linear: auth, access methods, skills.',
];

const link = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="mono rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-4 text-xs overflow-x-auto my-3">
      {children}
    </pre>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal pl-6 space-y-1">{children}</ol>;
}

export default function ConnectPage() {
  return (
    <div className="container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">
          Use with Grok, Claude, ChatGPT
        </h1>
        <p className="dir-label text-[var(--dir-muted)] pb-6 mb-8 border-b-[3px] border-[var(--dir-ink)]!">
          One remote MCP server · no account · no API key
        </p>

        <div className="space-y-10 text-[17px] leading-relaxed">
          <section>
            <p>
              Add Agent Switchboard to your assistant and ask it things like &ldquo;find an official
              MCP server for Linear&rdquo; or &ldquo;which browser agents have a CLI?&rdquo;. It answers
              from the live directory and links each result. The server address is the same everywhere:
            </p>
            <Code>{MCP_URL}</Code>
            <p>
              It uses Streamable HTTP and needs no sign-in. When an app asks about authentication,
              choose <strong>none</strong> or <strong>No sign in</strong>.
            </p>
          </section>

          <section
            id="grok-bot"
            aria-labelledby="grok-bot-title"
            className="border-[3px] border-[var(--dir-ink)]! p-5 sm:p-7"
          >
            <div className="flex items-center gap-4 mb-5">
              <BotMark className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
              <div>
                <h2 id="grok-bot-title" className="text-[28px] sm:text-[32px] font-extrabold leading-tight tracking-[-0.015em]">
                  Use it from Grok&nbsp;Bot&nbsp;/&nbsp;X
                </h2>
                <p className="text-[15px] text-[var(--dir-muted)]">
                  Ask in the Grok Bot app, or tag @bot under any post on X.
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="dir-label font-bold uppercase tracking-[0.1em] mb-2">1 · One-time setup</h3>
                <Steps>
                  <li>
                    On{' '}
                    <a href="https://grok.com" className={link} rel="noopener">
                      grok.com
                    </a>
                    , open <strong>Settings → Account</strong> and choose <strong>Connect</strong> next to
                    X Account.
                  </li>
                  <li>
                    Get Grok Bot at{' '}
                    <a href="https://x.ai/bot" className={link} rel="noopener">
                      x.ai/bot
                    </a>{' '}
                    and create a Bot of your own.
                  </li>
                  <li>
                    Send it: <em>&ldquo;Add a custom MCP server named Agent Switchboard at {MCP_URL}&rdquo;</em>
                  </li>
                </Steps>
                <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
                  The server is added to your whole account, so every Bot can use it. There is nothing to
                  sign in to.
                </p>
              </div>
              <div>
                <h3 className="dir-label font-bold uppercase tracking-[0.1em] mb-2">2 · Tag @bot on X</h3>
                <p>Reply to any post about AI tools with:</p>
                <p className="mono my-2 border-2 border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-3 py-2 text-sm font-bold text-[var(--dir-on-yellow)]">
                  @bot find alternatives to this on Agent Switchboard
                </p>
                <p>
                  @bot replies on X only to confirm. Your Bot does the search, and the answer lands in the{' '}
                  <strong>Grok Bot app</strong>, not as a reply on X.
                </p>
              </div>
            </div>

            <h3 className="dir-label font-bold uppercase tracking-[0.1em] mt-6 mb-2">Try asking your Bot</h3>
            <ul className="space-y-1.5">
              {GROK_BOT_PROMPTS.map((prompt) => (
                <li key={prompt} className="border-l-[3px] border-[var(--dir-yellow)]! pl-3">
                  &ldquo;{prompt}&rdquo;
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
              In the app, type <code className="mono text-sm">@</code> and pick Agent Switchboard to attach it
              to the task.
            </p>

            <p className="mt-5 pt-4 border-t border-[var(--dir-rule)]! text-[15px] text-[var(--dir-muted)]">
              Tagging @bot isn&rsquo;t available yet for X accounts based in the EU, the UK, Australia,
              Iceland, Liechtenstein, or Norway; it goes by the country on your X account, so a VPN
              doesn&rsquo;t change it. It also skips posts with video or GIFs and posts that also tag @grok.
              Tagged requests count toward your Grok Bot usage. Details:{' '}
              <a href="https://docs.x.ai/grok-bot/tag-on-x" className={link} rel="noopener">
                Tag @bot on X
              </a>
              .
            </p>
            <p className="mt-2 text-[13px] text-[var(--dir-muted)]">
              Agent Switchboard is independent and not affiliated with or endorsed by xAI or X. The bot
              icon is our own.
            </p>
          </section>

          <section id="grok">
            <h2 className="dir-bar mb-3">Grok (grok.com)</h2>
            <Steps>
              <li>
                Open{' '}
                <a href="https://grok.com/connectors" className={link} rel="noopener">
                  grok.com/connectors
                </a>
                .
              </li>
              <li>
                Click <strong>New Connector</strong>, then <strong>Custom</strong>.
              </li>
              <li>Paste the server address above and add it. There is no sign-in step.</li>
              <li>Start a new chat and ask for an agent. Grok calls the tools when your question needs them.</li>
            </Steps>
            <p className="mt-3 text-[15px] text-[var(--dir-muted)]">
              On Grok Business and Enterprise, a team admin adds the connector in the console first.
            </p>
          </section>

          <section id="xai-api">
            <h2 className="dir-bar mb-3">Your own Grok-powered bot (xAI API)</h2>
            <p>
              Add the server as an <code className="mono text-sm">mcp</code> tool on the Responses
              API. xAI connects to it and runs the tool calls for you; no{' '}
              <code className="mono text-sm">authorization</code> value is needed. Leave{' '}
              <code className="mono text-sm">submit_listing</code> out of{' '}
              <code className="mono text-sm">allowed_tools</code> unless your bot should be able to
              file suggestions.
            </p>
            <Code>{XAI_API_EXAMPLE}</Code>
            <p className="text-[15px] text-[var(--dir-muted)]">
              xAI bills the tokens the tool results use; the calls themselves have no per-call fee, and
              this server is free.
            </p>
          </section>

          <section id="claude">
            <h2 className="dir-bar mb-3">Claude</h2>
            <p>
              <a href={CLAUDE_INSTALL_URL} className={link} rel="noopener">
                Add to Claude
              </a>{' '}
              opens the custom connector dialog with the name and address filled in. Or do it by hand:
            </p>
            <Steps>
              <li>
                In Claude, go to <strong>Customize → Connectors</strong>.
              </li>
              <li>
                Click <strong>Add</strong>, then <strong>Custom → Web</strong>.
              </li>
              <li>Enter the name and the server address, then click Continue.</li>
              <li>
                Under Authentication, choose <strong>No sign in</strong>, then click <strong>Add</strong>.
              </li>
            </Steps>
            <p className="mt-3">Claude Code:</p>
            <Code>{`claude mcp add --transport http agentswitchboard ${MCP_URL}`}</Code>
            <p className="text-[15px] text-[var(--dir-muted)]">
              On Team and Enterprise plans an Owner adds it under Organization settings first. The
              Free plan allows one custom connector.
            </p>
          </section>

          <section id="chatgpt">
            <h2 className="dir-bar mb-3">ChatGPT</h2>
            <Steps>
              <li>
                In ChatGPT on the web, open <strong>Plugins</strong>.
              </li>
              <li>
                Click <strong>+</strong>, then <strong>Add custom MCP server</strong>.
              </li>
              <li>Enter the name and the server address.</li>
              <li>
                Set authentication to <strong>No authentication</strong>, confirm the risk notice, and
                choose <strong>Create as a plugin</strong>.
              </li>
              <li>
                Install the plugin, then type <code className="mono text-sm">@</code> in a chat and pick it.
              </li>
            </Steps>
          </section>

          <section id="other-clients">
            <h2 className="dir-bar mb-3">Cursor and other MCP clients</h2>
            <Code>{MCP_JSON}</Code>
            <p>
              Clients that only run local (stdio) servers:{' '}
              <code className="mono text-sm">npx -y mcp-remote {MCP_URL}</code>
            </p>
          </section>

          <section id="tools">
            <h2 className="dir-bar mb-3">Tools</h2>
            <ul className="space-y-2">
              {TOOLS.map((t) => (
                <li key={t.name}>
                  <code className="mono text-sm font-bold">{t.name}</code> — {t.does}
                </li>
              ))}
            </ul>
          </section>

          <section id="submit">
            <h2 className="dir-bar mb-3">Submitting through your assistant</h2>
            <p>
              <code className="mono text-sm">submit_listing</code> files the same kind of request as
              the{' '}
              <Link href="/submit" className={link}>
                submit form
              </Link>
              : a public GitHub issue that the maintainer reviews by hand. Nothing goes live from the
              call. Your assistant should show you the name, link, and description before it sends
              them. A contact email is optional; if you give one, it goes privately to the maintainer
              and never appears on the issue. Each caller can file {SUBMIT_LIMITS.perIpPerHour} per
              hour, and each URL once a day.
            </p>
          </section>

          <section id="limits">
            <h2 className="dir-bar mb-3">Limits and privacy</h2>
            <p>
              The server is free and public. Requests are rate-limited per IP address, and assistant
              platforms share their servers&rsquo; addresses, so a busy minute can return HTTP 429:
              retry shortly. Requests are logged as described on the{' '}
              <Link href="/privacy" className={link}>
                privacy page
              </Link>
              . Use is covered by the{' '}
              <Link href="/terms" className={link}>
                terms of use
              </Link>
              . The full HTTP and MCP reference is on the{' '}
              <Link href="/for-agents#mcp" className={link}>
                for-agents page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
