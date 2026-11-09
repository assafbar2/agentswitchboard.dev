'use client';

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';

export type ViewMode = 'human' | 'agent';

const STORAGE_KEY = 'viewMode';
const SYNC_EVENT = 'asb:viewmode';

/* ── Shared view-mode store ──────────────────────────────────────────
   One value per page, read from localStorage once and kept in memory, so
   every control (header toggle, agent bar, rail tab) shows the same state.
   Instances on the page sync through a window CustomEvent; other tabs sync
   through the 'storage' event. */

let current: ViewMode | null = null;

function readStored(): ViewMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'agent' ? 'agent' : 'human';
  } catch {
    return 'human';
  }
}

function getSnapshot(): ViewMode {
  if (current === null) current = readStored();
  return current;
}

function getServerSnapshot(): ViewMode {
  return 'human';
}

function applyMode(m: ViewMode) {
  const html = document.documentElement;
  if (m === 'agent') {
    html.setAttribute('data-view', 'agent');
  } else {
    html.removeAttribute('data-view');
  }
}

function subscribe(onChange: () => void) {
  function onStorage(e: StorageEvent) {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    current = readStored();
    applyMode(current);
    onChange();
  }
  window.addEventListener(SYNC_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(SYNC_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function writeMode(next: ViewMode) {
  current = next;
  applyMode(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage: the choice still applies to this page.
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
}

const noopSubscribe = () => () => {};

/** The page's human/agent view mode, shared by every control that uses it. */
export function useViewMode(): { mode: ViewMode; mounted: boolean; setMode(m: ViewMode): void } {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Keep html[data-view] in line with the stored mode after hydration.
  useEffect(() => {
    if (mounted) applyMode(mode);
  }, [mode, mounted]);

  const setMode = useCallback((m: ViewMode) => writeMode(m), []);
  return { mode, mounted, setMode };
}

/* ── Agent entry button ──────────────────────────────────────────── */

const focusRing =
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-yellow)]';

const barClass =
  'inline-flex min-h-[44px] shrink-0 items-center gap-2.5 bg-[var(--dir-yellow)] px-4 text-base font-extrabold tracking-[0.02em] text-[var(--dir-on-yellow)] whitespace-nowrap no-underline hover:underline sm:px-5 sm:text-lg ' +
  focusRing;

// The rail sits on paper, so the tab's focus ring goes inside its black fill.
const tabClass =
  'flex h-[88px] w-full flex-col items-center justify-center border-b-[3px] border-l-[3px] border-b-[var(--dir-yellow)] border-l-[var(--dir-ink)] bg-[var(--dir-bar-bg)] px-1.5 text-center text-sm font-extrabold leading-[1.1] tracking-[0.06em] text-[var(--dir-yellow)] no-underline hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[7px] focus-visible:outline-[var(--dir-yellow)]';

const tabSubClass = 'mt-1 text-xs font-semibold tracking-normal text-[var(--dir-bar-fg)]';

/* Does the current page have an agent (text-only) view? A page with no
   .agent-only block looks the same in agent view, so there the agent button
   links to the text version (/index.md) instead of doing nothing. Watched
   with a MutationObserver so client-side navigation keeps it right. */
function subscribeAgentView(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function pageHasAgentView(): boolean {
  return document.querySelector('.agent-only') !== null;
}

/** Both labels render; CSS picks one from html[data-view], so it never flips on hydration. */
function ModeLabel({ human, agent }: { human: ReactNode; agent: ReactNode }) {
  return (
    <>
      <span className="avb-when-human">{human}</span>
      <span className="avb-when-agent">{agent}</span>
    </>
  );
}

const switchLabel = (
  <>
    Switch to text-only view <span aria-hidden="true">→</span>
  </>
);
const backLabel = (
  <>
    <span aria-hidden="true">←</span> Back to the human view
  </>
);
const tabSwitchLabel = (
  <>
    text only <span aria-hidden="true">→</span>
  </>
);
const tabBackLabel = (
  <>
    <span aria-hidden="true">←</span> human view
  </>
);

/**
 * The obvious "give me the text version" control for AI agents. Switches the
 * page to the existing agent (text-only) view; in agent view it switches back.
 * Before hydration it is a plain link to /index.md, so an agent without JS
 * still reaches the text version. On a page with no agent view it stays that
 * link, so a click is never a no-op.
 *
 * A plain action button, deliberately without aria-pressed: its label says
 * what it will do, and a toggle button's label must not change with state.
 * The header ViewModeToggle exposes the pressed state.
 */
export function AgentViewButton({
  className,
  variant = 'bar',
}: {
  className?: string;
  variant?: 'bar' | 'tab';
}) {
  const { mode, mounted, setMode } = useViewMode();
  const hasAgentView = useSyncExternalStore(subscribeAgentView, pageHasAgentView, () => true);
  const isAgent = mode === 'agent';
  const base = `${variant === 'tab' ? tabClass : barClass} font-[family-name:var(--font-display)] ${className ?? ''}`;

  if (!mounted || !hasAgentView) {
    // Before mount only CSS knows the saved mode (the head script sets
    // html[data-view]), so both labels render. After mount, on a page with
    // no agent view, the link always offers the text version.
    const dual = !mounted;
    return (
      <a href="/index.md" className={base}>
        {variant === 'tab' ? (
          <>
            AGENTS
            <span className={tabSubClass}>
              {dual ? <ModeLabel human={tabSwitchLabel} agent={tabBackLabel} /> : tabSwitchLabel}
            </span>
          </>
        ) : dual ? (
          <ModeLabel human={switchLabel} agent={backLabel} />
        ) : (
          switchLabel
        )}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setMode(isAgent ? 'human' : 'agent')}
      className={`${base} cursor-pointer`}
    >
      {variant === 'tab' ? (
        <>
          AGENTS
          <span className={tabSubClass}>
            <ModeLabel human={tabSwitchLabel} agent={tabBackLabel} />
          </span>
        </>
      ) : (
        <ModeLabel human={switchLabel} agent={backLabel} />
      )}
    </button>
  );
}

/* ── Header segmented control ────────────────────────────────────── */

export function ViewModeToggle({ className }: { className?: string }) {
  const { mode, mounted, setMode } = useViewMode();

  const segment =
    'inline-flex min-h-[44px] items-center px-3.5 text-[15px] font-bold tracking-[0.02em] whitespace-nowrap cursor-pointer focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[5px] focus-visible:outline-[var(--dir-ink)]';

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={`inline-flex h-[50px] min-w-[208px] border-[3px] border-[var(--dir-ink)] ${className ?? ''}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-stretch border-[3px] border-[var(--dir-ink)] bg-[var(--dir-paper)] font-[family-name:var(--font-display)] ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={() => setMode('human')}
        aria-pressed={mode === 'human'}
        className={`${segment} ${
          mode === 'human'
            ? 'bg-[var(--dir-ink)] text-[var(--dir-paper)]'
            : 'text-[var(--dir-ink)] hover:underline'
        }`}
      >
        For Humans
      </button>
      <button
        type="button"
        onClick={() => setMode('agent')}
        aria-pressed={mode === 'agent'}
        className={`${segment} border-l-[3px] border-[var(--dir-ink)] ${
          mode === 'agent'
            ? 'bg-[var(--dir-yellow)] text-[var(--dir-on-yellow)]'
            : 'text-[var(--dir-ink)] hover:underline'
        }`}
      >
        For Agents
      </button>
    </div>
  );
}
