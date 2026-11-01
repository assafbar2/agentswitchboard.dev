import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentCard } from '@/components/AgentCard';
import { AgentIcon } from '@/components/AgentIcon';
import { JsonLd } from '@/components/JsonLd';
import { getEveryAgent } from '@/lib/catalog';
import { pageMetadata } from '@/lib/metadata';
import { alternativesPage, type Alternative } from '@/lib/related';
import { ACCESS_METHOD_LABELS } from '@/lib/search';
import { alternativesCard, alternativesCardImage } from '@/lib/share-cards';
import type { Agent } from '@/lib/types';
import { joinList, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export const dynamicParams = false;

export async function generateStaticParams() {
  const agents = await getEveryAgent();
  return agents.filter((a) => alternativesPage(a, agents)).map((a) => ({ slug: a.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function load(slug: string): Promise<{ agent: Agent; alternatives: Alternative[] } | null> {
  const agents = await getEveryAgent();
  const agent = agents.find((a) => a.slug === slug);
  const alternatives = agent && alternativesPage(agent, agents);
  return agent && alternatives ? { agent, alternatives } : null;
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return { title: 'Alternatives Not Found' };
  const { agent, alternatives } = found;
  const count = alternatives.length;
  const category = agent.categories[0]?.name;
  const names = joinList(alternatives.slice(0, 3).map((a) => a.agent.name));
  return pageMetadata(
    {
      title: `Alternatives to ${agent.name} — ${count} similar ${pluralize(count, 'tool')}`,
      description: `${count} alternatives to ${agent.name}${category ? ` in ${category}` : ''}, including ${names}, each with what it has in common with ${agent.name}.`,
      path: `/agents/${agent.slug}/alternatives`,
      image: alternativesCardImage(agent.slug, alternativesCard(agent, alternatives)),
    },
    parent
  );
}

const label = (method: string) => ACCESS_METHOD_LABELS[method] ?? method;

/** The shared access methods and keywords: the category is the same for every row, so the intro says it once. */
function why({ access, keywords }: Alternative): string {
  return `Both offer ${joinList(access.map(label))}. In common: ${keywords.join(', ')}.`;
}

export default async function AlternativesPage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  const { agent, alternatives } = found;
  const category = agent.categories[0];
  const count = alternatives.length;
  const url = `${BASE_URL}/agents/${agent.slug}/alternatives`;

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Alternatives to ${agent.name}`,
    url,
    numberOfItems: count,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: alternatives.map(({ agent: alt }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: alt.name,
      url: `${BASE_URL}/agents/${alt.slug}`,
    })),
  };

  return (
    <>
      <JsonLd schema={listSchema} />

      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] wrap-break-word sm:text-5xl">
              Alternatives to {agent.name}
            </h1>
            <p className="mb-4 text-lg text-[var(--dir-muted)]">
              {count} {category.name} tools you could use instead. Each one shares a way to connect with {agent.name}{' '}
              and overlaps on what it does. Strongest match first.
            </p>
            {/* The listing itself, in one line. */}
            <Link
              href={`/agents/${agent.slug}`}
              className="group flex min-w-0 items-baseline gap-1.5 text-[var(--dir-ink)] no-underline"
            >
              <AgentIcon name={agent.name} iconUrl={agent.iconUrl} lazy={false} className="mr-0.5 self-center" />
              <span className="min-w-0 truncate text-[17px] font-bold group-hover:underline">{agent.name}</span>
              <span className="hidden shrink-0 text-[15px] text-[var(--dir-muted)] sm:inline">by {agent.providerName}</span>
              <span
                aria-hidden="true"
                className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
              />
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold tracking-[0.06em]">
                {agent.accessMethods.map(label).join(' · ')}
              </span>
            </Link>
          </div>

          <section aria-labelledby="alternatives">
            <h2 id="alternatives" className="dir-bar">
              Alternatives <span className="dir-bar-count">· {count}</span>
            </h2>
            <ol>
              {alternatives.map((alt) => (
                <li key={alt.agent.id}>
                  <AgentCard agent={alt.agent} why={why(alt)} />
                </li>
              ))}
            </ol>
          </section>

          <nav
            aria-label="More"
            className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold"
          >
            <Link href={`/agents/${agent.slug}`} className="text-[var(--dir-ink)] no-underline hover:underline">
              <span aria-hidden="true">← </span>Back to {agent.name}
            </Link>
            <Link href={`/categories/${category.slug}`} className="text-[var(--dir-ink)] no-underline hover:underline">
              Everything in {category.name}
              <span aria-hidden="true"> →</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/agents/{agent.slug}/alternatives</div>
            <div className="agent-dim text-xs">
              {count} alternatives · category {category.slug} · access {agent.accessMethods.join('+')} · strongest
              first
            </div>
          </div>

          <div className="agent-section-title">alternatives</div>
          {alternatives.map(({ agent: alt, access, keywords }) => (
            <Link key={alt.id} href={`/agents/${alt.slug}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">{alt.slug}</span>
              <span className="agent-dim">{access.join('+')}</span>
              <span className="agent-dim">{keywords.join(', ')}</span>
            </Link>
          ))}

          <div className="agent-section-title">listing</div>
          <Link href={`/agents/${agent.slug}`} className="agent-row no-underline hover:underline">
            <span className="agent-accent">/agents/{agent.slug}</span>
            <span className="agent-dim">{agent.providerName}</span>
            <span className="agent-dim">{agent.accessMethods.join('+')}</span>
          </Link>
        </div>
      </div>
    </>
  );
}
