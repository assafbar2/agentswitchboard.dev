import Link from 'next/link';
import { CategoryRail } from '@/components/CategoryRail';
import { getAllCategories } from '@/lib/catalog';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Categories',
      description: 'Browse AI agents, MCP servers and agent tools by category.',
      path: '/categories',
    },
    parent
  );
}

export default async function CategoriesPage() {
  const categories = await getAllCategories();

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      {/* .human-only sets display:block unlayered, so the flex row is its own element. */}
      <div className="human-only">
      <div className="lg:flex">
        <div className="container-wide section min-w-0 flex-1 font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="mb-8 pb-6 border-b-[3px] border-[var(--dir-ink)]!">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">Categories</h1>
          <p className="text-lg text-[var(--dir-muted)]">
            Find agents by what they do.
          </p>
        </div>

        {/* The directory's index: one ruled row per category, count on the right */}
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10">
          {categories.map((cat) => {
            const count = cat.agentCount;
            return (
              <li key={cat.id} className="min-w-0">
                <Link
                  href={`/categories/${cat.slug}`}
                  className="group flex min-h-11 min-w-0 flex-col justify-center border-b border-[var(--dir-rule)]! px-0.5 py-2.5 text-[var(--dir-ink)] no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
                >
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="flex min-w-0 items-center gap-2 text-[17px] font-bold leading-snug group-hover:underline">
                      <CategoryIcon name={cat.icon} className="w-4 h-4 shrink-0" />
                      <span className="min-w-0 wrap-break-word">{cat.name}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
                    />
                    {count !== undefined && (
                      <span className="shrink-0 whitespace-nowrap text-sm font-semibold tracking-[0.06em]">
                        {count} listing{count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                  {cat.description && (
                    <span className="mt-0.5 block truncate text-[15px] leading-snug text-[var(--dir-muted)]">
                      {cat.description}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

        <CategoryRail categories={categories} />
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
              className="agent-row no-underline hover:underline"
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
