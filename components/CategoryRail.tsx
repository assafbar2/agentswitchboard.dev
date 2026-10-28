import Link from 'next/link';
import { AgentViewButton } from '@/components/ViewModeToggle';
import type { Category } from '@/lib/types';

/** Thumb-tab abbreviations for first words too long for the 88px rail. */
const RAIL_SHORT: Record<string, string> = {
  infrastructure: 'Infra',
  // Each stays a prefix of the full name, so the visible text is part of the accessible name.
  communication: 'Comm.',
  orchestration: 'Orch.',
};

/**
 * Short thumb-tab text: the first word of the category name ("Data & Analytics"
 * -> "Data"), abbreviated when it would not fit the rail. The tab's accessible
 * name is still the full category name.
 */
function railLabel(name: string): string {
  const word = name.split(/\s*&\s*|\s+/)[0] || name;
  return RAIL_SHORT[word.toLowerCase()] ?? (word.length > 12 ? `${word.slice(0, 5)}.` : word);
}

/**
 * Thumb-index rail (lg+ only): the agents' text-only tab first, then one tab per
 * category. The tab for `activeSlug` is marked as the current page, the way a
 * printed directory's thumb index shows which section you are in.
 */
export function CategoryRail({
  categories,
  activeSlug,
  className,
}: {
  categories: Pick<Category, 'id' | 'slug' | 'name'>[];
  activeSlug?: string;
  className?: string;
}) {
  return (
    <div className={`hidden w-[88px] flex-none flex-col lg:flex ${className ?? ''}`}>
      <AgentViewButton variant="tab" className="w-full" />
      <nav aria-label="Categories">
        <ul className="m-0 list-none p-0">
          {categories.map((cat) => {
            const active = cat.slug === activeSlug;
            return (
              <li key={cat.id}>
                <Link
                  href={`/categories/${cat.slug}`}
                  aria-label={cat.name}
                  aria-current={active ? 'page' : undefined}
                  title={cat.name}
                  className={`flex min-h-[56px] items-center justify-center border-b border-l-[3px] border-[var(--dir-ink)]! px-1 text-center text-[12px] font-extrabold uppercase leading-[1.05] tracking-[0.02em] no-underline hyphens-auto [overflow-wrap:anywhere] hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:bg-[var(--dir-yellow)] focus-visible:text-[var(--dir-on-yellow)] ${
                    active
                      ? 'bg-[var(--dir-yellow)] text-[var(--dir-on-yellow)]'
                      : 'bg-[var(--dir-paper)] text-[var(--dir-ink)]'
                  }`}
                >
                  {railLabel(cat.name)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
