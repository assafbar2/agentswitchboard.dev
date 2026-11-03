'use client';

/**
 * The compare tray: up to COMPARE_MAX listings picked with "+ Compare", kept
 * in localStorage so they survive a reload and show in every tab. It also runs
 * the toggles: one listener handles every [data-cmp] button, so the cards stay
 * server-rendered. A toggle on a card reads the listing's name and icon from
 * the card; one elsewhere carries them as data-cmp-name and data-cmp-icon.
 *
 * The tray only builds the /compare link, and the page is server-rendered
 * from it. Without JavaScript the toggles stay hidden (app/globals.css), and
 * the "Compare with …" links still work.
 */

/* eslint-disable @next/next/no-img-element -- the small icon file the card itself shows. */

import Link from '@/components/Link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AgentIcon } from '@/components/AgentIcon';
import { count } from '@/lib/analytics';
import { COMPARE_MAX, compareHref } from '@/lib/compare-link';
import { pageKind } from '@/lib/page-kind';

interface Picked {
  slug: string;
  name: string;
  /** The small icon file the card shows, or null for the name's initial. */
  icon: string | null;
}

/** A pick made while the tray was full, waiting for a free place. */
type Waiting = Picked & { from: string };

const KEY = 'compare';
const CHANGE = 'compare-change';
const EMPTY: Picked[] = [];

/** Used when localStorage is unavailable, so the tray still works on this page. */
let memory: Picked[] = EMPTY;
let cached: { raw: string | null; picks: Picked[] } = { raw: null, picks: EMPTY };

function parse(raw: string | null): Picked[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    return value
      .filter((p): p is Picked => typeof p?.slug === 'string' && typeof p?.name === 'string')
      .map(({ slug, name, icon }) => ({ slug, name, icon: typeof icon === 'string' ? icon : null }))
      .slice(0, COMPARE_MAX);
  } catch {
    return EMPTY;
  }
}

/** The picks: the same array until they change, as useSyncExternalStore needs. */
function read(): Picked[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return memory;
  }
  if (raw !== cached.raw) cached = { raw, picks: parse(raw) };
  return cached.picks;
}

function write(picks: Picked[]) {
  memory = picks;
  try {
    if (picks.length) localStorage.setItem(KEY, JSON.stringify(picks));
    else localStorage.removeItem(KEY);
  } catch {
    // Kept in memory for this page only.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE, onChange);
  };
}

const onComparePage = (pathname: string) => pathname === '/compare' || pathname.startsWith('/compare/');

const BUTTON =
  'inline-flex min-h-10 cursor-pointer items-center rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-extrabold uppercase tracking-[0.06em] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';

export function CompareTray() {
  const picks = useSyncExternalStore(subscribe, read, () => EMPTY);
  const pathname = usePathname();
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const waitingRef = useRef(waiting);
  const [said, setSaid] = useState('');
  const tray = useRef<HTMLElement>(null);

  useEffect(() => {
    waitingRef.current = waiting;
  }, [waiting]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-cmp-ready', '');
    return () => root.removeAttribute('data-cmp-ready');
  }, []);

  // Each toggle shows whether its listing is picked, including cards that render later.
  useEffect(() => {
    const picked = new Set(picks.map((p) => p.slug));
    const sync = () => {
      for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-cmp]')) {
        const pressed = String(picked.has(button.dataset.cmp ?? ''));
        if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [picks, pathname]);

  // One listener for the toggles and the tray's own buttons.
  useEffect(() => {
    function add(current: Picked[], { from, ...pick }: Waiting, removed?: string) {
      write([...current, pick]);
      setWaiting(null);
      setSaid(removed ? `${removed} removed; ${pick.name} added to compare.` : `${pick.name} added to compare.`);
      count('compare_add', { slug: pick.slug, from });
    }

    function remove(slug: string) {
      const current = read();
      const name = current.find((p) => p.slug === slug)?.name ?? slug;
      const rest = current.filter((p) => p.slug !== slug);
      const next = waitingRef.current;
      if (next && next.slug !== slug) return add(rest, next, name);
      write(rest);
      setWaiting(null);
      setSaid(`${name} removed from compare.`);
    }

    function onClick(event: MouseEvent) {
      const button = (event.target as Element | null)?.closest?.('button[data-cmp], button[data-cmp-remove], button[data-cmp-clear]');
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.hasAttribute('data-cmp-clear')) {
        write(EMPTY);
        setWaiting(null);
        setSaid('Compare cleared.');
        return;
      }
      const slug = button.dataset.cmp ?? button.dataset.cmpRemove ?? '';
      const current = read();
      if (button.dataset.cmpRemove !== undefined || current.some((p) => p.slug === slug)) return remove(slug);

      const card = button.closest('.cmp-card');
      const pick: Waiting = {
        slug,
        name: button.dataset.cmpName ?? card?.querySelector('h3')?.textContent?.trim() ?? slug,
        icon: button.dataset.cmpIcon ?? card?.querySelector('img')?.getAttribute('src') ?? null,
        from: button.dataset.cmpFrom ?? pageKind(window.location.pathname),
      };
      if (current.length < COMPARE_MAX) return add(current, pick);
      setWaiting(pick);
      setSaid(`You can compare ${COMPARE_MAX} at a time. Remove one to add ${pick.name}.`);
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const show = picks.length > 0 && !onComparePage(pathname);

  // Room at the bottom of the page for the tray while it shows.
  useEffect(() => {
    const element = tray.current;
    if (!show || !element) return;
    const root = document.documentElement;
    const resize = new ResizeObserver(() => root.style.setProperty('--cmp-tray-h', `${element.offsetHeight}px`));
    resize.observe(element);
    return () => {
      resize.disconnect();
      root.style.removeProperty('--cmp-tray-h');
    };
  }, [show]);

  return (
    <>
      <p role="status" className="sr-only">
        {said}
      </p>
      {show && (
        <aside
          ref={tray}
          aria-label="Compare"
          className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] font-[family-name:var(--font-display)] text-[var(--dir-ink)]"
        >
          <div className="container-wide flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
            <p className="dir-label shrink-0">
              Compare <span className="tracking-normal text-[var(--dir-muted)]">{picks.length} of {COMPARE_MAX}</span>
            </p>
            <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {picks.map((p) => (
                <li key={p.slug} className="flex min-w-0 max-w-full items-center gap-1.5 border-2 border-[var(--dir-ink)]! py-0.5 pl-1.5">
                  {p.icon ? (
                    <img src={p.icon} alt="" width={20} height={20} className="agent-icon" style={{ width: 20, height: 20 }} />
                  ) : (
                    <AgentIcon name={p.name} size={20} />
                  )}
                  <Link
                    href={`/agents/${p.slug}`}
                    className="min-w-0 truncate text-[15px] font-bold text-[var(--dir-ink)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
                  >
                    {p.name}
                  </Link>
                  <button
                    type="button"
                    data-cmp-remove={p.slug}
                    aria-label={`Remove ${p.name} from compare`}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                data-cmp-clear=""
                className={`${BUTTON} bg-[var(--dir-paper)] text-[var(--dir-ink)] hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)]`}
              >
                Clear
              </button>
              <Link href={compareHref(picks.map((p) => p.slug))} className={`${BUTTON} bg-[var(--dir-yellow)] text-[var(--dir-on-yellow)] hover:underline`}>
                {picks.length > 1 ? `Compare ${picks.length}` : 'Compare with…'}
                <span aria-hidden="true">&nbsp;→</span>
              </Link>
            </div>
          </div>
          {waiting && (
            <p className="container-wide pb-2.5 text-[15px] font-semibold">
              You can compare {COMPARE_MAX} at a time. Remove one to add {waiting.name}.
            </p>
          )}
        </aside>
      )}
    </>
  );
}
