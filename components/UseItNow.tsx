import Link from 'next/link';
import type { ReactNode } from 'react';
import { CopyBlock } from '@/components/CopyBlock';
import { MyStackToggle } from '@/components/MyStackToggle';
import { PART_HEADING, TryThisFirst } from '@/components/TryThisFirst';
import { UseItEvents } from '@/components/UseItEvents';
import type { TryThis } from '@/lib/try-this';
import type { Agent } from '@/lib/types';
import { INSTALL_LABELS, displayUrl, type UseItNow as UseItNowData } from '@/lib/use-it-now';

const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';
const ADD =
  'inline-flex min-h-10 items-center rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-3 text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--dir-ink)] no-underline hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';

export function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-6 border-t border-[var(--dir-rule)]! pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 id={id} className={PART_HEADING}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Copyable({
  slug,
  kind,
  ...block
}: {
  label: string;
  text: string;
  what: string;
  slug: string;
  kind: string;
  prose?: boolean;
}) {
  return <CopyBlock {...block} event="useit_copy" data={{ slug, what: kind }} />;
}

function Docs({ url, method, guide }: { url: string; method: string; guide: boolean }) {
  return (
    <p className="mt-3">
      {guide ? 'Setup guide' : 'Its page'}:{' '}
      <a href={url} target="_blank" rel="noopener noreferrer" data-useit="docs" data-method={method} className={`${LINK} break-all`}>
        {displayUrl(url)}
      </a>
    </p>
  );
}

/** Whether UseItNow has anything to show. */
export function hasUseItNow(tryThis: TryThis | null, { mcp, cli, api, extension }: UseItNowData): boolean {
  return Boolean(tryThis || mcp || cli || api || extension);
}

/**
 * "Use it now", under a listing's description: the My stack toggle, its Try
 * this first prompts, then one part per access method, all from
 * lib/use-it-now.ts.
 */
export function UseItNow({
  agent,
  tryThis,
  use,
}: {
  agent: Pick<Agent, 'slug' | 'name' | 'iconUrl' | 'providerName' | 'authType' | 'quickstartUrl'>;
  tryThis: TryThis | null;
  use: UseItNowData;
}) {
  const { mcp, cli, api, extension } = use;
  if (!hasUseItNow(tryThis, use)) return null;
  const { slug } = agent;
  const guide = Boolean(agent.quickstartUrl);
  const signIn = agent.authType !== 'none' && (
    <p className="mt-3 text-[15px] text-[var(--dir-muted)]">
      It may ask you to sign in to {agent.providerName} or for a key when you add it; the setup guide says which.
    </p>
  );

  return (
    <section aria-labelledby="use-it-now" className="mb-10">
      <h2 id="use-it-now" className="dir-bar">
        Use it now
      </h2>
      <MyStackToggle agent={agent} className="pt-4" />
      <UseItEvents slug={slug}>
        <div className="pt-4">
          {tryThis && <TryThisFirst slug={slug} tryThis={tryThis} />}

          {mcp && (
            <Part id="use-mcp" title="Connect it over MCP">
              {mcp.clientConfig ? (
                <>
                  <Copyable
                    label={mcp.endpoint ? 'Cursor and other MCP clients' : 'Cursor, Claude Desktop and other MCP clients'}
                    text={JSON.stringify(mcp.clientConfig, null, 2)}
                    what="the MCP client config"
                    slug={slug}
                    kind="mcp-config"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mcp.cursorInstallUrl && (
                      <a href={mcp.cursorInstallUrl} data-useit="deeplink" data-client="cursor" className={ADD}>
                        Add to Cursor
                      </a>
                    )}
                    {mcp.claudeConnectorUrl && (
                      <a
                        href={mcp.claudeConnectorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-useit="deeplink"
                        data-client="claude"
                        className={ADD}
                      >
                        Add to Claude
                      </a>
                    )}
                  </div>
                  {mcp.claudeCodeCommand && (
                    <Copyable label="Claude Code" text={mcp.claudeCodeCommand} what="the Claude Code command" slug={slug} kind="claude-code" />
                  )}
                  {mcp.endpoint && mcp.command && (
                    <Copyable label="Or run it on your computer" text={mcp.command} what="the local command" slug={slug} kind="mcp-command" />
                  )}
                  <p className="mt-3">
                    {mcp.endpoint ? (
                      <>
                        In Grok, ChatGPT and other assistants, add a custom connector with the address{' '}
                        <code className="mono text-sm font-bold break-all">{mcp.endpoint}</code> (
                        <Link href="/connect" className={LINK}>
                          how, step by step
                        </Link>
                        ).
                      </>
                    ) : (
                      'It runs on your computer, so web assistants such as Grok and ChatGPT can’t start it.'
                    )}
                  </p>
                  {signIn}
                  <Docs url={mcp.docsUrl} method="mcp" guide={guide} />
                </>
              ) : (
                <>
                  <Copyable
                    label="Ask your coding agent to set it up"
                    text={mcp.setupPrompt}
                    what="the setup prompt"
                    slug={slug}
                    kind="setup-prompt"
                    prose
                  />
                  <Docs url={mcp.docsUrl} method="mcp" guide={guide} />
                </>
              )}
            </Part>
          )}

          {cli && (
            <Part id="use-cli" title="Install the CLI">
              {cli.install ? (
                <Copyable
                  label={INSTALL_LABELS[cli.install.type]}
                  text={cli.install.command}
                  what="the install command"
                  slug={slug}
                  kind="install"
                />
              ) : (
                <p className="mt-2">Install it as its own instructions say.</p>
              )}
              <Docs url={cli.docsUrl} method="cli" guide={guide} />
            </Part>
          )}

          {api && (
            <Part id="use-api" title="Call the API">
              {api.baseUrl && <Copyable label="Base URL" text={api.baseUrl} what="the API base URL" slug={slug} kind="api-base-url" />}
              <p className="mt-3">
                <span className="dir-label text-[var(--dir-muted)]">Auth</span> <span className="font-bold">{api.auth}</span>
              </p>
              <Docs url={api.docsUrl} method="api" guide={guide} />
            </Part>
          )}

          {extension && (
            <Part id="use-extension" title="Get the browser extension">
              <Docs url={extension.url} method="browser-extension" guide={guide} />
            </Part>
          )}
        </div>
      </UseItEvents>
    </section>
  );
}
