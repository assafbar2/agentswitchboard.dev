import Link from '@/components/Link';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentCard } from '@/components/AgentCard';
import { ConnectStack, ConnectStackRows } from '@/components/ConnectStack';
import { CopyButton } from '@/components/CopyButton';
import { JsonLd } from '@/components/JsonLd';
import { SaveStack } from '@/components/SaveStack';
import { connectBundle } from '@/lib/bundle';
import { getEveryAgent, getRetiredListings } from '@/lib/catalog';
import { COMPARE_MAX, compareHref } from '@/lib/compare-link';
import { smallIconPath } from '@/lib/icons';
import { pageMetadata } from '@/lib/metadata';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import { sharedStackCard, sharedStackCardImage } from '@/lib/share-cards';
import {
  entrySlug,
  extraText,
  listedAgents,
  requestedStackSlugs,
  sharedStack,
  sharedStackNoteText,
  sharedStackPath,
} from '@/lib/shared-stack';
import { MY_STACK_MAX, UNTITLED_STACK } from '@/lib/stack-link';
import { stackAccessMethods } from '@/lib/stacks';
import { joinList, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';
const EXAMPLE = '/stack?items=<slug>,<slug>&title=<title>';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function load(searchParams: Props['searchParams']) {
  const [query, catalog, retired] = await Promise.all([searchParams, getEveryAgent(), getRetiredListings()]);
  const stack = sharedStack(requestedStackSlugs(query.items), [query.title].flat()[0] ?? '', catalog, retired);
  const agents = listedAgents(stack);
  return { stack, agents, named: query.items !== undefined, path: stack.entries.length > 0 ? sharedStackPath(stack) : '/stack' };
}

export async function generateMetadata({ searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { stack, agents, path } = await load(searchParams);
  const title = stack.title || UNTITLED_STACK;
  return pageMetadata(
    {
      title,
      description:
        agents.length > 0
          ? `A stack of ${agents.length} ${pluralize(agents.length, 'tool')}, shared on Agent Switchboard: ${joinList(agents.map((a) => a.name))}.`
          : `A stack of AI tools shared on Agent Switchboard. Make your own on My stack.`,
      path,
      ...(agents.length > 0 && { image: sharedStackCardImage(stack.entries.map(entrySlug), stack.title, sharedStackCard(stack.title, agents)) }),
      // Anyone can make one of these links, so search engines skip them all.
      robots: { index: false, follow: true },
    },
    parent
  );
}

const inlineLink = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default async function SharedStackPage({ searchParams }: Props) {
  const { stack, agents, named, path } = await load(searchParams);
  const title = stack.title || UNTITLED_STACK;
  const url = `${BASE_URL}${path}`;
  const methods = stackAccessMethods(agents.map((agent) => ({ agent, why: '' })));
  const compared = agents.slice(0, COMPARE_MAX).map((a) => a.slug);
  const compareLabel = compared.length === agents.length ? (agents.length === 2 ? 'Compare both' : 'Compare all 3') : `Compare the first ${COMPARE_MAX}`;
  const items = agents.map((a) => ({ slug: a.slug, name: a.name, icon: a.iconUrl ? smallIconPath(a.iconUrl) : null }));
  const notes = [...stack.notes.map(sharedStackNoteText), ...(stack.extra > 0 ? [extraText(stack.extra)] : [])];
  const tools = `${agents.length} ${pluralize(agents.length, 'tool')}`;
  const bundle = agents.length > 0 ? connectBundle(agents) : null;
  const lead =
    stack.entries.length > 0
      ? 'Put together by whoever shared this link, from listings in the directory. The link holds the whole stack: Agent Switchboard keeps no copy, and didn’t pick these.'
      : named
        ? 'This link names no listing in the directory.'
        : `A shared stack’s link names its listings, up to ${MY_STACK_MAX}, in order. Make one on My stack, then share it.`;

  const listSchema = agents.length > 0 && {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    url,
    numberOfItems: agents.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: agents.map((agent, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: agent.name,
      url: `${BASE_URL}/agents/${agent.slug}`,
    })),
  };

  return (
    <>
      {listSchema && <JsonLd schema={listSchema} />}

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="mx-auto max-w-3xl">
          <header className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
            <p className="dir-label mb-2.5 text-[15px] font-bold uppercase tracking-[0.12em]">Shared stack</p>
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] wrap-break-word sm:text-5xl">{title}</h1>
            <p className="mb-3 text-lg text-[var(--dir-muted)]">{lead}</p>
            {agents.length > 0 && (
              <p className="text-[15px] font-bold tracking-[0.06em]">
                {tools} · {methods.map((m) => ACCESS_METHOD_LABELS[m]).join(' · ')}
              </p>
            )}
            {notes.length > 0 && (
              <ul className="mt-4 space-y-1 border-l-4 border-[var(--dir-yellow)]! pl-3 text-[16px] font-semibold">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </header>

          {stack.entries.length > 0 && (
            <section aria-labelledby="in-this-stack">
              <h2 id="in-this-stack" className="dir-bar">
                In this stack <span className="dir-bar-count">· {stack.entries.length}</span>
              </h2>
              <ol>
                {stack.entries.map((entry) =>
                  entry.agent ? (
                    <li key={entry.agent.slug}>
                      <AgentCard agent={entry.agent} />
                    </li>
                  ) : (
                    <li key={entry.retired.slug} className="border-b border-[var(--dir-rule)]! px-0.5 py-3">
                      <p className="text-[17px] font-bold leading-snug text-[var(--dir-muted)]">
                        <s>{entry.retired.name}</s>
                      </p>
                      <p className="mt-0.5 text-[15px] leading-snug text-[var(--dir-muted)]">
                        No longer listed in the directory. It stays in its place so the link still makes sense.
                      </p>
                    </li>
                  )
                )}
              </ol>
            </section>
          )}

          {agents.length > 0 && (
            <section aria-labelledby="use-this-stack" className="mt-10">
              <h2 id="use-this-stack" className="dir-bar">
                Use this stack
              </h2>
              {compared.length > 1 && (
                <Link href={compareHref(compared)} className="dir-row">
                  <span className="dir-row-name">{compareLabel}</span>
                  <span className="dir-row-leader" aria-hidden="true" />
                  <span className="dir-row-meta" aria-hidden="true">
                    Side by side →
                  </span>
                </Link>
              )}
              <SaveStack items={items} title={stack.title} from="stack" />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <code className="mono min-w-0 break-all text-[14px] font-bold">{url}</code>
                <CopyButton text={url} what="the link to this stack" event="stack_share" data={{ items: agents.length, from: 'stack' }} />
              </div>
            </section>
          )}

          {bundle && <ConnectStack bundle={bundle} from="stack" />}

          <nav
            aria-label="More stacks"
            className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold"
          >
            <Link href="/stacks" className="text-[var(--dir-ink)] no-underline hover:underline">
              <span aria-hidden="true">← </span>Curated stacks
            </Link>
            <Link href="/my-stack" className="text-[var(--dir-ink)] no-underline hover:underline">
              Make your own on My stack<span aria-hidden="true"> →</span>
            </Link>
          </nav>
          {stack.entries.length === 0 && (
            <p className="mt-4 text-[15px] text-[var(--dir-muted)]">
              The link&apos;s format is <code className="mono font-bold">{EXAMPLE}</code>; see{' '}
              <Link href="/for-agents" className={inlineLink}>
                For agents
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide max-w-4xl py-10">
          <div className="mb-6">
            <div className="agent-accent mb-1 break-all text-base font-bold">{path}</div>
            <div className="agent-dim text-xs">
              {agents.length > 0
                ? `${tools} · access ${methods.join('+')} · shared stack, made by a visitor, in their order`
                : `a shared stack: ${EXAMPLE}, up to ${MY_STACK_MAX} listings`}
            </div>
            <div className="agent-dim mt-1 text-xs">{title}</div>
          </div>

          {stack.entries.length > 0 && (
            <>
              <div className="agent-section-title">in this stack</div>
              {stack.entries.map((entry) =>
                entry.agent ? (
                  <Link key={entry.agent.slug} href={`/agents/${entry.agent.slug}`} className="agent-row no-underline hover:underline">
                    <span className="agent-accent">{entry.agent.slug}</span>
                    <span className="agent-dim">{entry.agent.accessMethods.join('+')}</span>
                    <span className="agent-dim">{entry.agent.name}</span>
                  </Link>
                ) : (
                  <div key={entry.retired.slug} className="agent-row">
                    <span className="agent-accent line-through">{entry.retired.slug}</span>
                    <span className="agent-dim">retired</span>
                    <span className="agent-dim">{entry.retired.name}, no longer listed</span>
                  </div>
                )
              )}
            </>
          )}

          {notes.length > 0 && (
            <>
              <div className="agent-section-title">left out</div>
              {notes.map((note) => (
                <div key={note} className="agent-row">
                  <span className="agent-dim">{note}</span>
                  <span className="agent-dim" />
                  <span className="agent-dim" />
                </div>
              ))}
            </>
          )}

          {bundle && <ConnectStackRows bundle={bundle} />}

          <div className="agent-section-title">more</div>
          {compared.length > 1 && (
            <Link href={compareHref(compared)} className="agent-row agent-row-stack no-underline hover:underline">
              <span className="agent-accent">{compareHref(compared)}</span>
              <span className="agent-dim">{compareLabel.toLowerCase()} side by side</span>
              <span className="agent-dim" />
            </Link>
          )}
          <Link href="/my-stack" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/my-stack</span>
            <span className="agent-dim">make and share your own</span>
            <span className="agent-dim" />
          </Link>
          <Link href="/stacks" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/stacks</span>
            <span className="agent-dim">curated stacks</span>
            <span className="agent-dim" />
          </Link>
        </div>
      </div>
    </>
  );
}
