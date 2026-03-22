import { getCategoryBySlug, getAllCategories } from '@/lib/contentful';
import { AgentCard } from '@/components/AgentCard';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 60;

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
  return {
    title: result.category.name,
    description: result.category.description || `A2A agents in ${result.category.name}`,
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

  return (
    <div className="container-wide section">
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
  );
}
