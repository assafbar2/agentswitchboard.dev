import Link from 'next/link';
import { getCategoryBySlug, getAllCategories } from '@/lib/contentful';
import { AgentCard } from '@/components/AgentCard';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { JsonLd } from '@/components/JsonLd';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 60;

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
  const result = await getCategoryBySlug(slug);
  if (!result) notFound();

  const { category, agents } = result;
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
      <div className="human-only container-wide section">
        <JsonLd schema={listSchema} />
        <div className="mb-10 flex items-center gap-3">
          <span className="text-[var(--text-secondary)]">
            <CategoryIcon name={category.icon} className="w-7 h-7" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
            {category.description && (
              <p className="text-[var(--text-secondary)] mt-1">{category.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {agents.length === 0 && (
          <p className="text-center text-[var(--text-muted)] py-20">
            No agents in this category yet.
          </p>
        )}
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
                  className="agent-row hover:opacity-80 transition-opacity no-underline"
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
