import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentCard } from '@/components/AgentCard';
import { JsonLd } from '@/components/JsonLd';
import { getEveryAgent } from '@/lib/catalog';
import { getDropSchedule } from '@/lib/drops';
import { NEW_DAYS, newListings, newSince } from '@/lib/freshness';
import { pageMetadata } from '@/lib/metadata';
import { newCard, newCardImage } from '@/lib/share-cards';
import { formatDay, formatNumber, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

async function load() {
  const catalog = await getEveryAgent();
  const since = newSince();
  return { catalog, since, groups: newListings(catalog, getDropSchedule().drops, since) };
}

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const { catalog, since, groups } = await load();
  return pageMetadata(
    {
      title: 'New listings',
      description: `Every AI agent, MCP server and agent tool added to Agent Switchboard in the last ${NEW_DAYS} days, grouped by weekly drop, newest first.`,
      path: '/new',
      image: newCardImage(newCard(groups, since, catalog)),
    },
    parent
  );
}

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

const groupId = (date: string | undefined) => (date ? `drop-${date}` : 'since-last-drop');

export default async function NewPage() {
  const { since, groups } = await load();
  const fresh = groups.flatMap((g) => g.agents);
  const official = fresh.filter((a) => a.official).length;
  const drops = groups.filter((g) => g.drop).length;

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'New listings',
    description: `Listings added to Agent Switchboard since ${formatDay(since)}`,
    url: `${BASE_URL}/new`,
    numberOfItems: fresh.length,
    itemListElement: fresh.map((agent, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: agent.name,
      url: `${BASE_URL}/agents/${agent.slug}`,
    })),
  };

  const stats = [
    { value: fresh.length, label: 'Added' },
    { value: official, label: 'Official' },
    { value: drops, label: pluralize(drops, 'Drop') },
  ];

  return (
    <>
      <JsonLd schema={listSchema} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
          <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">New listings</h1>
          <p className="mb-3 max-w-3xl text-lg text-[var(--dir-muted)]">
            Every listing added to the directory in the last {NEW_DAYS} days, since{' '}
            <time dateTime={since}>{formatDay(since)}</time>, grouped by the weekly drop that brought it in, newest
            first. Elsewhere on the site, their cards carry a New tag. For updates and removals too, see the{' '}
            <Link href="/changelog#directory-changes" className={inlineLink}>
              directory change log
            </Link>
            .
          </p>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="dir-label order-last font-semibold uppercase tracking-[0.1em] text-[var(--dir-muted)]">
                  {label}
                </dt>
                <dd className="text-[18px] font-extrabold">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {groups.length === 0 && (
          <p className="mb-10 text-[17px] text-[var(--dir-muted)]">
            Nothing has been added since {formatDay(since)}. Earlier additions are on{' '}
            <Link href="/drops" className={inlineLink}>
              the weekly drops
            </Link>
            .
          </p>
        )}

        {groups.map(({ drop, agents }) => (
          <section key={groupId(drop?.date)} aria-labelledby={groupId(drop?.date)} className="mb-10">
            <h2 id={groupId(drop?.date)} className="dir-bar">
              {drop ? (
                <Link href={`/drops/${drop.date}`} className="hover:decoration-2">
                  The {formatDay(drop.date)} drop
                </Link>
              ) : (
                'Since the last drop'
              )}{' '}
              <span className="dir-bar-count">· {agents.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard key={agent.slug} agent={agent} markNew={false} />
              ))}
            </div>
          </section>
        ))}

        <p className="border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold">
          <Link href="/drops" className="text-[var(--dir-ink)] no-underline hover:underline">
            Every weekly drop<span aria-hidden="true"> →</span>
          </Link>
        </p>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/new</div>
            <div className="agent-dim text-xs">
              {fresh.length} {pluralize(fresh.length, 'listing')} added since {since} (the last {NEW_DAYS} days) ·{' '}
              {official} official · grouped by drop, newest first
            </div>
          </div>

          {groups.length === 0 && <div className="agent-dim text-xs">none since {since}</div>}

          {groups.map(({ drop, agents }) => (
            <div key={groupId(drop?.date)}>
              <div className="agent-section-title">
                {drop ? `drop ${drop.date}` : 'since the last drop'} · {agents.length}
              </div>
              {agents.map((agent) => (
                <Link key={agent.slug} href={`/agents/${agent.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">{agent.slug}</span>
                  <span className="agent-dim">
                    {agent.providerName}
                    {agent.official ? ' · official' : ''}
                    {agent.sponsored ? ' · sponsored' : ''}
                  </span>
                  <span className="agent-dim">{agent.createdAt?.slice(0, 10)}</span>
                </Link>
              ))}
            </div>
          ))}

          <div className="agent-section-title">more</div>
          <Link href="/drops" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/drops</span>
            <span className="agent-dim">every drop</span>
            <span className="agent-dim" />
          </Link>
          <Link href="/changelog#directory-changes" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/changelog</span>
            <span className="agent-dim">every addition, update and removal</span>
            <span className="agent-dim" />
          </Link>
        </div>
      </div>
    </>
  );
}
