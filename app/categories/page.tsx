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
    <div className="container-wide section">
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
  );
}
