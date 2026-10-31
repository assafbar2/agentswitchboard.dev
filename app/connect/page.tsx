import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/metadata';
import { SUBMIT_LIMITS } from '@/lib/mcp-submit';

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
  { name: 'search_agents', does: 'Search by text, category, access method (api, mcp, cli, browser-extension), and official. Paged.' },
  { name: 'get_agent', does: 'Full detail for one listing: skills, auth, links, Verified and Official status.' },
  { name: 'list_categories', does: 'Every category with its slug and live agent count.' },
  { name: 'submit_listing', does: 'Suggest a new listing. Opens a public GitHub issue for review; publishes nothing.' },
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

          <section id="grok-bot">
            <h2 className="dir-bar mb-3">Grok Bot (and @bot on X)</h2>
            <Steps>
              <li>
                In a chat with any Bot, send:{' '}
                <em>&ldquo;Add a custom MCP server named Agent Switchboard at {MCP_URL}&rdquo;</em>.
              </li>
              <li>Approve when the Bot asks. The server is public, so there is nothing to sign in to.</li>
              <li>
                Type <code className="mono text-sm">@</code> and pick Agent Switchboard to attach it to a task.
              </li>
            </Steps>
            <p className="mt-3">
              The server is added to your whole account, so every Bot can use it. Once it is added, you
              can also reply to a post on X with{' '}
              <em>&ldquo;@bot find tools for this on Agent Switchboard&rdquo;</em>: X hands the post to
              your Bot, and the answer arrives in the Grok Bot app, not on X. Tagging @bot is not
              available yet for X accounts based in the UK, the EU, Australia, Iceland, Liechtenstein,
              or Norway.
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
