import { AgentViewButton } from '@/components/ViewModeToggle';

const fetchLinks = ['/llms.txt', '/index.md', '/api/mcp'];

// inline-flex + min-h-11 gives each fetch link a 44px touch target.
const linkClass =
  'inline-flex min-h-11 items-center text-[var(--dir-bar-fg)] underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-yellow)]';

/**
 * Full-width black bar at the top of every page telling AI agents where the
 * text-only view is. Shown in both human and agent view.
 *
 * Order: desktop (lg) is tag · sentence · button · links, as in the mock.
 * Below lg the tag and button share line one, and the sentence takes its own
 * line (after the links' line on tablet, before it on phones).
 */
export function AgentBar() {
  return (
    <aside
      aria-label="For AI agents"
      className="bg-[var(--dir-bar-bg)] text-[var(--dir-bar-fg)] font-[family-name:var(--font-display)]"
    >
      <div className="flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:gap-x-5 sm:px-6 lg:px-10">
        <span className="order-1 shrink-0 bg-[var(--dir-yellow)] px-2.5 py-1 text-[15px] font-extrabold leading-none tracking-[0.14em] text-[var(--dir-on-yellow)]">
          AGENTS
        </span>

        <span className="order-3 w-full text-[15px] font-semibold leading-snug sm:order-4 lg:order-2 lg:w-auto lg:text-lg">
          Skip the HTML. This whole directory has a text-only view.
        </span>

        <AgentViewButton variant="bar" className="order-2 lg:order-3" />

        <span className="order-4 w-full font-mono text-[13px] text-[var(--dir-bar-fg)] sm:order-3 sm:ml-auto sm:w-auto sm:text-[15px] lg:order-4">
          or fetch{' '}
          {fetchLinks.map((href, i) => (
            <span key={href}>
              {i > 0 ? <span aria-hidden="true"> · </span> : null}
              <a href={href} className={linkClass}>
                {href}
              </a>
            </span>
          ))}
        </span>
      </div>
    </aside>
  );
}
