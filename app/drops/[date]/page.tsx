import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentCard } from '@/components/AgentCard';
import { JsonLd } from '@/components/JsonLd';
import { getEveryAgent } from '@/lib/catalog';
import {
  describeNotes,
  dropAdditions,
  dropHeadline,
  dropSummary,
  getDrop,
  getDropSchedule,
  type DropItem,
} from '@/lib/drops';
import { pageMetadata } from '@/lib/metadata';
import { dropCard, dropCardImage } from '@/lib/share-cards';
import { formatDay, joinList } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export const dynamicParams = false;

export function generateStaticParams() {
  return getDropSchedule().drops.map((d) => ({ date: d.date }));
}

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const found = getDrop((await params).date);
  if (!found) return { title: 'Drop Not Found' };
  const { drop } = found;
  const catalog = await getEveryAgent();
  return pageMetadata(
    {
      title: `${formatDay(drop.date)} drop: ${dropHeadline(drop)}`,
      description: drop.intro ?? dropSummary(drop, dropAdditions(drop, catalog).listed),
      path: `/drops/${drop.date}`,
      image: dropCardImage(drop.date, dropCard(drop, catalog)),
    },
    parent
  );
}

const nameLink =
  'min-w-0 wrap-break-word text-[17px] font-bold leading-snug text-[var(--dir-ink)] no-underline hover:underline';

export default async function DropPage({ params }: Props) {
  const found = getDrop((await params).date);
  if (!found) notFound();
  const { drop, newer, older } = found;
  const catalog = await getEveryAgent();
  const listedSlugs = new Set(catalog.map((a) => a.slug));
  const { listed, gone } = dropAdditions(drop, catalog);
  const official = listed.filter((a) => a.official);
  const vendors = [...new Set(official.map((a) => a.officialVendor?.name ?? a.providerName))];
  const title = `The ${formatDay(drop.date)} drop`;

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description: dropSummary(drop, listed),
    url: `${BASE_URL}/drops/${drop.date}`,
    numberOfItems: listed.length,
    itemListElement: listed.map((agent, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: agent.name,
      url: `${BASE_URL}/agents/${agent.slug}`,
    })),
  };

  const stats = [
    { value: drop.added.length, label: 'Added' },
    { value: official.length, label: 'Official' },
    { value: drop.updated.length, label: 'Updated' },
    { value: drop.removed.length, label: 'Removed' },
  ];

  return (
    <>
      <JsonLd schema={listSchema} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
          <p className="dir-label mb-2.5 text-[15px] font-bold uppercase tracking-[0.12em]">
            <Link href="/drops" className="text-[var(--dir-ink)] no-underline hover:underline">
              Weekly drops
            </Link>
          </p>
          <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">{title}</h1>
          {drop.intro && <p className="mb-3 max-w-3xl text-lg text-[var(--dir-muted)]">{drop.intro}</p>}
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="dir-label order-last font-semibold uppercase tracking-[0.1em] text-[var(--dir-muted)]">
                  {label}
                </dt>
                <dd className="text-[18px] font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
          {drop.days.length > 1 && (
            <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
              Changes from {formatDay(drop.days[0])} to {formatDay(drop.days[drop.days.length - 1])}.
            </p>
          )}
        </div>

        {drop.added.length > 0 && (
          <section aria-labelledby="added" className="mb-10">
            <h2 id="added" className="dir-bar">
              Added <span className="dir-bar-count">· {drop.added.length}</span>
            </h2>
            {official.length > 0 && (
              <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
                {official.length === 1 ? 'One is' : `${official.length} are`} Official, published by the company
                behind the product: {joinList(vendors)}. {official.length === 1 ? 'It is' : 'They are'} listed first.
              </p>
            )}
            <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2 lg:grid-cols-3">
              {listed.map((agent) => (
                <AgentCard key={agent.slug} agent={agent} />
              ))}
            </div>
            {gone.length > 0 && (
              <p className="mt-3 text-[15px] text-[var(--dir-muted)]">
                Since removed from the directory: {joinList(gone.map((g) => g.name))}.
              </p>
            )}
          </section>
        )}

        {drop.updated.length > 0 && (
          <ChangeList id="updated" heading="Updated" items={drop.updated} listedSlugs={listedSlugs} />
        )}
        {drop.removed.length > 0 && (
          <ChangeList id="removed" heading="Removed" items={drop.removed} listedSlugs={listedSlugs} />
        )}

        <nav
          aria-label="Other drops"
          className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold"
        >
          {older ? (
            <Link href={`/drops/${older.date}`} rel="prev" className="text-[var(--dir-ink)] no-underline hover:underline">
              <span aria-hidden="true">← </span>Older: {formatDay(older.date)}
            </Link>
          ) : (
            <span />
          )}
          <Link href="/drops" className="text-[var(--dir-ink)] no-underline hover:underline">
            All drops
          </Link>
          {newer ? (
            <Link href={`/drops/${newer.date}`} rel="next" className="text-[var(--dir-ink)] no-underline hover:underline">
              Newer: {formatDay(newer.date)}
              <span aria-hidden="true"> →</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/drops/{drop.date}</div>
            <div className="agent-dim text-xs">
              {drop.added.length} added · {official.length} official · {drop.updated.length} updated ·{' '}
              {drop.removed.length} removed · days {drop.days.join(', ')}
            </div>
            {drop.intro && <div className="agent-dim text-xs mt-1">{drop.intro}</div>}
          </div>

          {drop.added.length > 0 && (
            <>
              <div className="agent-section-title">added</div>
              {listed.map((agent) => (
                <Link key={agent.slug} href={`/agents/${agent.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">{agent.slug}</span>
                  <span className="agent-dim">
                    {agent.providerName}
                    {agent.official ? ' · official' : ''}
                  </span>
                  <span className="agent-dim">{agent.accessMethods.join('+') || '—'}</span>
                </Link>
              ))}
              {gone.map((item) => (
                <div key={item.slug} className="agent-row">
                  <span className="agent-dim">{item.slug}</span>
                  <span className="agent-dim">since removed</span>
                  <span className="agent-dim">{item.date}</span>
                </div>
              ))}
            </>
          )}

          {(['updated', 'removed'] as const).map(
            (kind) =>
              drop[kind].length > 0 && (
                <div key={kind}>
                  <div className="agent-section-title">{kind}</div>
                  {drop[kind].map((item) => (
                    <div key={item.slug} className="agent-row">
                      <span className="agent-accent">{item.slug}</span>
                      <span className="agent-dim">{describeNotes(item.notes) || '—'}</span>
                      <span className="agent-dim">{item.date}</span>
                    </div>
                  ))}
                </div>
              )
          )}

          <div className="agent-section-title">more drops</div>
          {older && (
            <Link href={`/drops/${older.date}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">/drops/{older.date}</span>
              <span className="agent-dim">older</span>
              <span className="agent-dim">{dropHeadline(older)}</span>
            </Link>
          )}
          {newer && (
            <Link href={`/drops/${newer.date}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">/drops/{newer.date}</span>
              <span className="agent-dim">newer</span>
              <span className="agent-dim">{dropHeadline(newer)}</span>
            </Link>
          )}
          <Link href="/drops" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/drops</span>
            <span className="agent-dim">every drop</span>
            <span className="agent-dim" />
          </Link>
        </div>
      </div>
    </>
  );
}

/** Updated or removed listings: name (linked while it is still listed), dotted leader, day; then what changed. */
function ChangeList({
  id,
  heading,
  items,
  listedSlugs,
}: {
  id: string;
  heading: string;
  items: DropItem[];
  listedSlugs: Set<string>;
}) {
  return (
    <section aria-labelledby={id} className="mb-10">
      <h2 id={id} className="dir-bar">
        {heading} <span className="dir-bar-count">· {items.length}</span>
      </h2>
      <ul>
        {items.map((item) => {
          const notes = describeNotes(item.notes);
          return (
            <li key={item.slug} className="border-b border-[var(--dir-rule)]! py-3">
              <div className="flex min-w-0 items-baseline gap-1.5">
                {listedSlugs.has(item.slug) ? (
                  <Link href={`/agents/${item.slug}`} className={nameLink}>
                    {item.name}
                  </Link>
                ) : (
                  <span className="min-w-0 wrap-break-word text-[17px] font-bold leading-snug">{item.name}</span>
                )}
                <span
                  aria-hidden="true"
                  className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
                />
                <time dateTime={item.date} className="shrink-0 whitespace-nowrap text-sm font-semibold text-[var(--dir-muted)]">
                  {formatDay(item.date)}
                </time>
              </div>
              {notes && <p className="mt-0.5 text-[15px] text-[var(--dir-muted)]">{notes}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
