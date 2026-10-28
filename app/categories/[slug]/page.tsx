import Link from 'next/link';
import { CategoryRail } from '@/components/CategoryRail';
import { getCategoryBySlug, getAllCategories } from '@/lib/catalog';
import { AgentCard } from '@/components/AgentCard';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { JsonLd } from '@/components/JsonLd';
import { notFound } from 'next/navigation';
import { Building2 } from 'lucide-react';
import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategoryBySlug(slug);
  if (!result) return { title: 'Category Not Found' };

  const { category } = result;
  const url = `${BASE_URL}/categories/${slug}`;
  const title = `${category.name} AI Agents`;
  const description =
    category.description ||
    `Browse the best ${category.name} AI agents — compare features, access methods, and integrations.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | Agent Switchboard`,
      description,
      url,
      type: 'website',
      siteName: 'Agent Switchboard',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Agent Switchboard`,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, categories] = await Promise.all([getCategoryBySlug(slug), getAllCategories()]);
  if (!result) notFound();

  const { category, agents } = result;
  const officialCount = agents.filter((a) => a.official).length;
  const url = `${BASE_URL}/categories/${slug}`;

  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} AI Agents`,
    description: category.description,
    url,
    numberOfItems: agents.length,
    itemListElement: agents.map((agent, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: agent.name,
      url: `${BASE_URL}/agents/${agent.slug}`,
      description: agent.description,
    })),
  };

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      {/* .human-only sets display:block unlayered, so the flex row is its own element. */}
      <div className="human-only">
      <div className="lg:flex">
        <div className="container-wide section min-w-0 flex-1 font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <JsonLd schema={listSchema} />
        {/* Section header bar: yellow fill, ink text, the listing count beside the title */}
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-[var(--dir-yellow)] px-3 py-2 text-[var(--dir-on-yellow)]">
          <span className="hidden sm:block shrink-0 self-center" aria-hidden="true">
            <CategoryIcon name={category.icon} className="w-7 h-7" />
          </span>
          <h1 className="min-w-0 wrap-break-word text-3xl sm:text-4xl font-extrabold uppercase leading-none tracking-[0.02em]">
            {category.name}
          </h1>
          <span className="text-xl sm:text-2xl font-semibold leading-none">
            · {agents.length}
          </span>
        </div>

        <div className="mb-6 flex flex-wrap items-start gap-3 border-b-[3px] border-[var(--dir-ink)]! pb-4">
          {/* Grows on wide screens; on phones the official link wraps below */}
          {category.description && (
            <p className="min-w-0 flex-1 basis-60 text-lg text-[var(--dir-muted)]">{category.description}</p>
          )}
          {officialCount > 0 && (
            <Link
              href={`/browse?official=1&category=${category.slug}`}
              className="sm:ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-bold uppercase tracking-[0.06em] text-[var(--dir-ink)] no-underline hover:bg-[var(--dir-rule)] hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
            >
              <Building2 className="w-3.5 h-3.5" aria-hidden />
              {officialCount} official
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {agents.length === 0 && (
          <p className="text-[var(--dir-muted)] py-16">
            No agents in this category yet.
          </p>
        )}
      </div>

        <CategoryRail categories={categories} activeSlug={slug} />
      </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">

          {/* Header */}
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">{category.slug}</div>
            <div className="agent-dim text-xs">
              {category.name} · {agents.length} agent{agents.length !== 1 ? 's' : ''}
              {category.description && ` · ${category.description}`}
            </div>
          </div>

          {agents.length > 0 ? (
            <div>
              <div className="agent-section-title">agents</div>
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.slug}`}
                  className="agent-row no-underline hover:underline"
                >
                  <span className="agent-accent">{agent.slug}</span>
                  <span className="agent-dim">{agent.providerName}</span>
                  <span className="agent-dim">{agent.accessMethods.join('+') || '—'}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="agent-dim py-8 text-xs">no agents in this category yet</div>
          )}

        </div>
      </div>
    </>
  );
}
