import { AgentViewButton } from '@/components/ViewModeToggle';

const fetchLinks = ['/llms.txt', '/index.md', '/api/mcp'];

const linkClass =
  'text-[var(--dir-bar-fg)] underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-yellow)]';

/**
 * Full-width black bar at the top of every page telling AI agents where the
 * text-only view is. Shown in both human and agent view.
 */
export function AgentBar() {
  return (
    <aside
      aria-label="For AI agents"
      className="bg-[var(--dir-bar-bg)] text-[var(--dir-bar-fg)] font-[family-name:var(--font-display)]"
    >
      <div className="flex min-h-[60px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:gap-x-5 sm:px-6 lg:px-10">
        <span className="shrink-0 bg-[var(--dir-yellow)] px-2.5 py-1 text-[15px] font-extrabold leading-none tracking-[0.14em] text-[var(--dir-on-yellow)]">
          AGENTS
        </span>

        <span className="hidden text-lg font-semibold lg:inline">
          Skip the HTML.<span className="hidden xl:inline"> This whole directory has a text-only view.</span>
        </span>

        <AgentViewButton variant="bar" />

        <span className="w-full font-mono text-[13px] text-[var(--dir-bar-fg)] sm:ml-auto sm:w-auto sm:text-[15px]">
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
