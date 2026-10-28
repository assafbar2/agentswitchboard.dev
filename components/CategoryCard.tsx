import Link from 'next/link';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { Category } from '@/lib/types';

/**
 * One category as a directory listing: name, dotted leader, listing count.
 * `compact` is the single-line phone-book row used in the homepage directory;
 * the default entry adds the icon and the description underneath.
 */
export function CategoryCard({
  category,
  agentCount,
  compact = false,
}: {
  category: Category;
  /** Overrides category.agentCount (which getAllCategories fills in). */
  agentCount?: number;
  /** Kept for callers that still pass a position; the directory look has no stagger. */
  index?: number;
  compact?: boolean;
}) {
  const count = agentCount ?? category.agentCount;
  const countText =
    count !== undefined ? `${count} listing${count !== 1 ? 's' : ''}` : undefined;

  if (compact) {
    return (
      <Link
        href={`/categories/${category.slug}`}
        title={category.name}
        className="dir-row break-inside-avoid [font-family:var(--font-display)]"
      >
        <span className="dir-row-name">{category.name}</span>
        <span className="dir-row-leader" aria-hidden="true" />
        {count !== undefined && (
          <span className="dir-row-meta">
            {count}
            <span className="sr-only"> listing{count !== 1 ? 's' : ''}</span>
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group block border-b border-[var(--dir-rule)]! py-2.5 text-[var(--dir-ink)] no-underline [font-family:var(--font-display)]"
    >
      <span className="flex items-baseline gap-1.5">
        <span aria-hidden="true" className="shrink-0 self-center text-[var(--dir-ink)]">
          <CategoryIcon name={category.icon} className="w-4 h-4" />
        </span>
        <span className="dir-row-name min-w-0 group-hover:underline">{category.name}</span>
        <span className="dir-row-leader" aria-hidden="true" />
        {countText && <span className="dir-row-meta">{countText}</span>}
      </span>
      {category.description && (
        <span className="mt-0.5 block text-[15px] leading-snug text-[var(--dir-muted)]">
          {category.description}
        </span>
      )}
    </Link>
  );
}
