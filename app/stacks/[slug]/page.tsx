import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentCard } from '@/components/AgentCard';
import { EndpointLink } from '@/components/EndpointLink';
import { JsonLd } from '@/components/JsonLd';
import { StackEvents } from '@/components/StackEvents';
import { getEveryAgent } from '@/lib/catalog';
import { pageMetadata } from '@/lib/metadata';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import { stackCard, stackCardImage } from '@/lib/share-cards';
import {
  getStack,
  getStacks,
  stackAccessMethods,
  stackEntries,
  stacksInOrder,
  type Stack,
  type StackEntry,
} from '@/lib/stacks';
import { formatDay, joinList, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export const dynamicParams = false;

export function generateStaticParams() {
  return getStacks().map((s) => ({ slug: s.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function load(slug: string): Promise<{ stack: Stack; entries: StackEntry[] } | null> {
  const stack = getStack(slug);
  return stack ? { stack, entries: stackEntries(stack, await getEveryAgent()) } : null;
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return { title: 'Stack Not Found' };
  const { stack, entries } = found;
  return pageMetadata(
    {
      title: stack.title,
      description: `${stack.promise} The stack: ${joinList(entries.map((e) => e.agent.name))}.`,
      path: `/stacks/${stack.slug}`,
      image: stackCardImage(stack.slug, stackCard(stack, entries)),
    },
    parent
  );
}

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default async function StackPage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  const { stack, entries } = found;
  const methods = stackAccessMethods(entries);
  const order = stacksInOrder(getStacks());
  const next = order.length > 1 ? order[(order.findIndex((s) => s.slug === stack.slug) + 1) % order.length] : null;
  const tools = `${entries.length} ${pluralize(entries.length, 'tool')}`;

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: stack.title,
    description: stack.promise,
    url: `${BASE_URL}/stacks/${stack.slug}`,
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: entries.map(({ agent }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: agent.name,
      url: `${BASE_URL}/agents/${agent.slug}`,
    })),
  };

  return (
    <>
      <JsonLd schema={listSchema} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
            <p className="dir-label mb-2.5 text-[15px] font-bold uppercase tracking-[0.12em]">
              <Link href="/stacks" className="text-[var(--dir-ink)] no-underline hover:underline">
                Stacks
              </Link>
            </p>
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] wrap-break-word sm:text-5xl">
              {stack.title}
            </h1>
            <p className="mb-3 text-lg text-[var(--dir-muted)]">{stack.promise}</p>
            <p className="text-[15px] font-bold tracking-[0.06em]">
              {tools} · {methods.map((m) => ACCESS_METHOD_LABELS[m]).join(' · ')}
            </p>
            {stack.week && (
              <p className="mt-1 text-[15px] text-[var(--dir-muted)]">
                Stack of the week for the{' '}
                <Link href={`/drops/${stack.week}`} className={inlineLink}>
                  {formatDay(stack.week)} drop
                </Link>
                .
              </p>
            )}
          </div>

          <section aria-labelledby="in-this-stack">
            <h2 id="in-this-stack" className="dir-bar">
              In this stack <span className="dir-bar-count">· {entries.length}</span>
            </h2>
            <StackEvents stack={stack.slug}>
              <ol>
                {entries.map(({ agent, why }) => (
                  <li key={agent.id}>
                    <AgentCard agent={agent} why={why} />
                  </li>
                ))}
              </ol>
            </StackEvents>
          </section>

          <nav
            aria-label="More stacks"
            className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold"
          >
            <Link href="/stacks" className="text-[var(--dir-ink)] no-underline hover:underline">
              <span aria-hidden="true">← </span>All stacks
            </Link>
            {next && (
              <Link href={`/stacks/${next.slug}`} className="text-[var(--dir-ink)] no-underline hover:underline">
                Next: {next.title}
                <span aria-hidden="true"> →</span>
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/stacks/{stack.slug}</div>
            <div className="agent-dim text-xs">
              {tools} · access {methods.join('+')} · {stack.week ? `stack of the week ${stack.week}` : 'in order'}
            </div>
            <div className="agent-dim text-xs mt-1">{stack.promise}</div>
          </div>

          <div className="agent-section-title">in this stack</div>
          {entries.map(({ agent, why }) => (
            <Link key={agent.id} href={`/agents/${agent.slug}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">{agent.slug}</span>
              <span className="agent-dim">{agent.accessMethods.join('+')}</span>
              <span className="agent-dim">{why}</span>
            </Link>
          ))}

          <div className="agent-section-title">more</div>
          {stack.week && (
            <Link href={`/drops/${stack.week}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">/drops/{stack.week}</span>
              <span className="agent-dim">the drop it is the stack of the week for</span>
              <span className="agent-dim" />
            </Link>
          )}
          <Link href="/stacks" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/stacks</span>
            <span className="agent-dim">every stack</span>
            <span className="agent-dim" />
          </Link>
          <EndpointLink href={`/api/stacks/${stack.slug}`} className="agent-row no-underline hover:underline">
            <span className="agent-accent">/api/stacks/{stack.slug}</span>
            <span className="agent-dim">this stack as JSON</span>
            <span className="agent-dim">GET · no auth</span>
          </EndpointLink>
        </div>
      </div>
    </>
  );
}
