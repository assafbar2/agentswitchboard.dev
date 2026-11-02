import Link from 'next/link';
import type { ReactNode } from 'react';
import { CopyBlock } from '@/components/CopyBlock';
import { EndpointLink } from '@/components/EndpointLink';
import { Part } from '@/components/UseItNow';
import { bundleSummary, type Bundle, type BundleItem } from '@/lib/bundle';
import { displayUrl, type McpServerConfig } from '@/lib/use-it-now';
import { joinList } from '@/lib/utils';

const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

function serverText(server: McpServerConfig): string {
  return 'url' in server ? server.url : [server.command, ...server.args].join(' ');
}

function Listing({ item, children }: { item: BundleItem; children?: ReactNode }) {
  const { agent, docsUrl } = item;
  return (
    <li className="border-b border-[var(--dir-rule)]! py-2.5 last:border-b-0">
      <Link
        href={`/agents/${agent.slug}`}
        className="text-[17px] font-bold leading-snug text-[var(--dir-ink)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
      >
        {agent.name}
      </Link>
      {children && <p className="mt-0.5 text-[16px] leading-snug wrap-break-word">{children}</p>}
      <p className="mt-0.5 text-[15px] leading-snug text-[var(--dir-muted)]">
        {agent.quickstartUrl ? 'Setup guide' : 'Its page'}:{' '}
        <a href={docsUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} break-all`}>
          {displayUrl(docsUrl)}
        </a>
      </p>
    </li>
  );
}

/**
 * Connect them all, on a stack's page: the stack's connect bundle
 * (lib/bundle.ts), as GET /api/bundle gives it, grouped by what to do with
 * each listing.
 */
export function ConnectStack({ bundle, from, stack }: { bundle: Bundle; from: 'stacks' | 'stack'; stack?: string }) {
  const { items, config, claudeCode, setupPrompt } = bundle;
  const inConfig = items.filter((i) => i.how === 'config');
  const guided = items.filter((i) => i.how === 'guide');
  const rest = items.filter((i) => i.how === 'other');
  const names = (group: BundleItem[]) => joinList(group.map((i) => i.agent.name));
  const data = (what: string) => ({ from, items: items.length, servers: inConfig.length, what, ...(stack && { stack }) });

  return (
    <section id="connect" aria-labelledby="connect-them-all" className="mt-10">
      <h2 id="connect-them-all" className="dir-bar">
        {items.length === 1 ? 'Connect it' : 'Connect them all'}
      </h2>
      <p className="pt-4 text-[17px] font-bold">{bundleSummary(items)}.</p>
      <div className="pt-4">
        {config && (
          <Part id="connect-config" title="In the config">
            <p className="mt-2">
              Paste it into your MCP client to connect {names(inConfig)}. Every address and command is copied from the vendor&apos;s docs, as on
              each listing&apos;s page.
            </p>
            <CopyBlock
              label={inConfig.some((i) => i.server && 'url' in i.server) ? 'Cursor and other MCP clients' : 'Cursor, Claude Desktop and other MCP clients'}
              text={JSON.stringify(config, null, 2)}
              what="the MCP client config for this stack"
              event="stack_bundle_export"
              data={data('mcp-config')}
            />
            {claudeCode.length > 0 && (
              <CopyBlock
                label="Claude Code"
                text={claudeCode.join('\n')}
                what={claudeCode.length === 1 ? 'the Claude Code command for this stack' : 'the Claude Code commands for this stack'}
                event="stack_bundle_export"
                data={data('claude-code')}
              />
            )}
            <ul className="mt-3">
              {inConfig.map((item) => (
                <Listing key={item.agent.slug} item={item}>
                  {item.note}
                </Listing>
              ))}
            </ul>
          </Part>
        )}

        {setupPrompt && (
          <Part id="connect-guides" title={guided.length === 1 ? 'From its guide' : 'From their guides'}>
            <p className="mt-2">The docs for {names(guided)} don&apos;t print a server address or command to copy.</p>
            <CopyBlock
              label={guided.length === 1 ? 'Ask your coding agent to set it up' : 'Ask your coding agent to set them up'}
              text={setupPrompt}
              what="the setup prompt for this stack"
              event="stack_bundle_export"
              data={data('setup-prompt')}
              prose
            />
            <ul className="mt-3">
              {guided.map((item) => (
                <Listing key={item.agent.slug} item={item} />
              ))}
            </ul>
          </Part>
        )}

        {rest.length > 0 && (
          <Part id="connect-rest" title={rest.length === 1 ? 'Use it another way' : 'Use them another way'}>
            <ul className="mt-1">
              {rest.map((item) => (
                <Listing key={item.agent.slug} item={item}>
                  {item.note}
                </Listing>
              ))}
            </ul>
          </Part>
        )}
      </div>
    </section>
  );
}

/** Connect them all in the text-only view: how each listing connects, then the same bundle as JSON. */
export function ConnectStackRows({ bundle }: { bundle: Bundle }) {
  const slugs = bundle.items.map((i) => i.agent.slug).join(',');
  return (
    <>
      <div className="agent-section-title">connect them all · {bundleSummary(bundle.items)}</div>
      {bundle.items.map((item) => (
        <div key={item.agent.slug} className="agent-row agent-row-stack">
          <span className="agent-accent">{item.agent.slug}</span>
          <span className="agent-dim">{item.how}</span>
          <span className="agent-dim wrap-anywhere">{item.server ? serverText(item.server) : `${item.note} ${item.docsUrl}`}</span>
        </div>
      ))}
      <EndpointLink href={`/api/bundle?items=${slugs}`} className="agent-row agent-row-stack no-underline hover:underline">
        <span className="agent-accent">/api/bundle?items={slugs}</span>
        <span className="agent-dim">one MCP client config for these listings, as JSON</span>
        <span className="agent-dim">GET · no auth</span>
      </EndpointLink>
    </>
  );
}
