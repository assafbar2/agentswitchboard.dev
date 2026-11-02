'use client';

/**
 * The board's readout and counts. Pointing at a jack, or reaching one with
 * the keyboard, shows its name, provider, access methods and a link above the
 * board; on a touch screen the first tap on a jack shows them and a second
 * opens the listing. Counts `board_view` once the page has loaded and
 * `board_jack_click` when a listing is opened from the board. One set of
 * listeners for the whole board keeps the jacks server-rendered.
 */

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { count } from '@/lib/analytics';
import { ACCESS_METHOD_LABELS } from '@/lib/search';

interface Jack {
  slug: string;
  name: string;
  provider: string;
  access: string[];
  official: boolean;
  lit: boolean;
  sponsored: boolean;
}

const noopSubscribe = () => () => {};

function jackAt(target: EventTarget | null): SVGAElement | null {
  return target instanceof Element ? target.closest<SVGAElement>('a[data-m]') : null;
}

function read(a: SVGAElement): Jack {
  return {
    slug: a.getAttribute('href')?.split('/')[2] ?? '',
    name: a.querySelector('title')?.textContent ?? '',
    provider: a.dataset.p ?? '',
    access: (a.dataset.m ?? '').split(' ').filter(Boolean),
    official: a.classList.contains('o'),
    lit: a.classList.contains('l'),
    sponsored: a.hasAttribute('data-s'),
  };
}

export function BoardEvents({
  listings,
  lit,
  dropName,
  children,
}: {
  listings: number;
  lit: number;
  /** "the Oct 31, 2026 drop", whose additions are lit. */
  dropName: string;
  children: ReactNode;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [jack, setJack] = useState<Jack | null>(null);
  const shown = useRef<SVGAElement | null>(null);
  const pointer = useRef('mouse');

  useEffect(() => {
    count('board_view', { listings, lit });
  }, [listings, lit]);

  function show(a: SVGAElement) {
    if (shown.current === a) return;
    shown.current?.removeAttribute('data-on');
    a.setAttribute('data-on', '');
    shown.current = a;
    setJack(read(a));
  }

  function onPointerOver(event: PointerEvent<HTMLDivElement>) {
    const a = jackAt(event.target);
    if (a && event.pointerType === 'mouse') show(a);
  }

  function onFocus(event: FocusEvent<HTMLDivElement>) {
    const a = jackAt(event.target);
    if (a?.matches(':focus-visible')) show(a);
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const a = jackAt(event.target);
    if (!a) return;
    if (pointer.current !== 'mouse' && shown.current !== a) {
      event.preventDefault();
      show(a);
      return;
    }
    const { slug, official, lit: isLit } = read(a);
    count('board_jack_click', { slug, official, lit: isLit, from: 'board' });
  }

  return (
    <div
      onPointerOver={onPointerOver}
      onPointerDown={(event) => {
        pointer.current = event.pointerType;
      }}
      onFocus={onFocus}
      onClick={onClick}
    >
      <div className="board-readout">
        {!mounted ? (
          <p className="text-[var(--dir-muted)]">Each jack opens its listing.</p>
        ) : jack ? (
          <>
            <p className="line-clamp-2 min-w-0 flex-1 wrap-break-word">
              <strong className="font-extrabold">{jack.name}</strong> by {jack.provider}
              {jack.access.length > 0 && ` · ${jack.access.map((m) => ACCESS_METHOD_LABELS[m] ?? m).join(' · ')}`}
              {jack.official && ' · Official'}
              {jack.sponsored && ' · Sponsored'}
              {jack.lit && ` · in ${dropName}`}
            </p>
            <a
              href={`/agents/${jack.slug}`}
              onClick={() => count('board_jack_click', { slug: jack.slug, official: jack.official, lit: jack.lit, from: 'readout' })}
              className="inline-flex min-h-11 shrink-0 items-center font-bold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
            >
              Open<span className="sr-only"> {jack.name}</span>
              <span aria-hidden="true">&nbsp;→</span>
            </a>
          </>
        ) : (
          <p className="text-[var(--dir-muted)]">Point at a jack, or tap one, to see what it is.</p>
        )}
      </div>
      {children}
    </div>
  );
}
