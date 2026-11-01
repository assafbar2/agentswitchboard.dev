import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentIcon } from '@/components/AgentIcon';
import { JsonLd } from '@/components/JsonLd';
import { getEveryAgent } from '@/lib/catalog';
import { pageMetadata } from '@/lib/metadata';
import { stacksCard, stacksCardImage } from '@/lib/share-cards';
import { getStacks, stackEntries, stackSections, stacksInOrder, type Stack, type StackEntry } from '@/lib/stacks';
import type { Agent } from '@/lib/types';
import { formatDay, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

interface Row {
  stack: Stack;
  entries: StackEntry[];
}

function withEntries(stacks: Stack[], catalog: Agent[]): Row[] {
  return stacks.map((stack) => ({ stack, entries: stackEntries(stack, catalog) }));
}

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const stacks = withEntries(stacksInOrder(getStacks()), await getEveryAgent());
  return pageMetadata(
    {
      title: 'Stacks',
      description: `${stacks.length} stacks of AI tools that work together, each picked for one job, with why every tool is in it.`,
      path: '/stacks',
      image: stacksCardImage(stacksCard(stacks)),
    },
    parent
  );
}

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default async function StacksPage() {
  const catalog = await getEveryAgent();
  const { week, standing, earlier } = stackSections(getStacks());
  const sections = [
    { id: 'stack-of-the-week', title: 'Stack of the week', rows: withEntries(week ? [week] : [], catalog) },
    { id: 'more-stacks', title: week ? 'More stacks' : 'Stacks', rows: withEntries(standing, catalog) },
    { id: 'earlier-stacks', title: 'Earlier stacks of the week', rows: withEntries(earlier, catalog) },
  ].filter((s) => s.rows.length > 0);
  const all = sections.flatMap((s) => s.rows);

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Stacks',
    url: `${BASE_URL}/stacks`,
    numberOfItems: all.length,
    itemListElement: all.map(({ stack }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: stack.title,
      url: `${BASE_URL}/stacks/${stack.slug}`,
    })),
  };

  return (
    <>
      <JsonLd schema={listSchema} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl">
          <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-6">
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">Stacks</h1>
            <p className="text-lg text-[var(--dir-muted)]">
              Tools from the directory that work together, each stack picked for one job, with why every tool is in
              it. The stack of the week is built around the new listings in a{' '}
              <Link href="/drops" className={inlineLink}>
                weekly drop
              </Link>
              .
            </p>
          </div>

          {sections.map(({ id, title, rows }) => (
            <section key={id} aria-labelledby={id} className="mb-10">
              <h2 id={id} className="dir-bar">
                {title} {rows.length > 1 && <span className="dir-bar-count">· {rows.length}</span>}
              </h2>
              <ul>
                {rows.map((row) => (
                  <StackRow key={row.stack.slug} {...row} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/stacks</div>
            <div className="agent-dim text-xs">
              {all.length} stacks · stack of the week first · as JSON: GET /api/stacks
            </div>
          </div>

          {sections.map(({ id, title, rows }) => (
            <div key={id}>
              <div className="agent-section-title">{title.toLowerCase()}</div>
              {rows.map(({ stack, entries }) => (
                <Link key={stack.slug} href={`/stacks/${stack.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">/stacks/{stack.slug}</span>
                  <span className="agent-dim">
                    {entries.length} tools{stack.week ? ` · week ${stack.week}` : ''}
                  </span>
                  <span className="agent-dim">{entries.map((e) => e.agent.slug).join('+')}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Title, dotted leader and tool count; the listings' icons; the promise. */
function StackRow({ stack, entries }: Row) {
  return (
    <li className="border-b border-[var(--dir-rule)]!">
      <Link href={`/stacks/${stack.slug}`} className="group block py-3 text-[var(--dir-ink)] no-underline">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 wrap-break-word text-[19px] font-extrabold leading-snug group-hover:underline">
            {stack.title}
          </span>
          <span
            aria-hidden="true"
            className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
          />
          <span className="shrink-0 whitespace-nowrap text-[15px] font-bold">
            {entries.length} {pluralize(entries.length, 'tool')}
          </span>
        </span>
        <span className="mt-1.5 flex gap-1">
          {entries.map(({ agent }) => (
            <AgentIcon key={agent.slug} name={agent.name} iconUrl={agent.iconUrl} />
          ))}
        </span>
        <span className="mt-1 block text-[15px] leading-snug text-[var(--dir-muted)]">{stack.promise}</span>
        {stack.week && (
          <span className="mt-0.5 block text-[14px] font-semibold text-[var(--dir-muted)]">
            For the {formatDay(stack.week)} drop
          </span>
        )}
      </Link>
    </li>
  );
}
