import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { Category } from '@/lib/types';

export function CategoryCard({
  category,
  agentCount,
  index = 0,
}: {
  category: Category;
  agentCount?: number;
  index?: number;
}) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="card flex items-center gap-4 p-4 group animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span className="flex-shrink-0 text-[var(--text-secondary)]">
        <CategoryIcon name={category.icon} className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
          {category.name}
        </h3>
        {(category.description || agentCount !== undefined) && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
            {agentCount !== undefined
              ? `${agentCount} agent${agentCount !== 1 ? 's' : ''}`
              : category.description}
          </p>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] flex-shrink-0 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
