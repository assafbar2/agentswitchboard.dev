import Link from 'next/link';
import { getAllCategories } from '@/lib/contentful';
import { CategoryCard } from '@/components/CategoryCard';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse A2A agents by category.',
};

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Categories</h1>
          <p className="text-[var(--text-secondary)]">
            Find agents by what they do.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.id} category={cat} index={i} />
          ))}
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">

          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/categories</div>
            <div className="agent-dim text-xs">{categories.length} categories indexed</div>
          </div>

          <div className="agent-section-title">categories</div>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="agent-row hover:opacity-80 transition-opacity no-underline"
            >
              <span className="agent-accent">{cat.slug}</span>
              <span className="agent-dim">{cat.name}</span>
              <span className="agent-dim">{cat.agentCount != null ? `${cat.agentCount} agents` : ''}</span>
            </Link>
          ))}

        </div>
      </div>
    </>
  );
}
