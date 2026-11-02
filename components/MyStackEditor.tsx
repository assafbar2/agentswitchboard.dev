'use client';

/**
 * /my-stack: the listings kept in this browser (lib/my-stack.ts), to rename,
 * reorder, prune, compare and share as a /stack link. It reads localStorage,
 * so the server renders only a placeholder; `view` picks the human or the
 * text-only rendering.
 */

/* eslint-disable @next/next/no-img-element -- the small icon file the card itself shows. */

import Link from 'next/link';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AgentIcon } from '@/components/AgentIcon';
import { CopyButton } from '@/components/CopyButton';
import { COMPARE_MAX, compareHref } from '@/lib/compare-link';
import { EMPTY_STACK, readMyStack, useHydrated, useMyStack, withMoved, withoutItem, withTitle, writeMyStack } from '@/lib/my-stack';
import { cleanStackTitle, MY_STACK_MAX, STACK_TITLE_MAX, stackHref, UNTITLED_STACK } from '@/lib/stack-link';
import { joinList, pluralize } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';

const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';
const BUTTON =
  'inline-flex min-h-10 cursor-pointer items-center rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-3 text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--dir-ink)] no-underline hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';
const ICON_BUTTON =
  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--dir-ink)]';

export function MyStackEditor({ view }: { view: 'human' | 'agent' }) {
  const hydrated = useHydrated();
  const stack = useMyStack();
  const [said, setSaid] = useState('');
  const [clearing, setClearing] = useState(false);
  const focusNext = useRef<string | null>(null);

  // Keeps the keyboard where it was after a row moves or goes: a handler
  // names the element, and it takes focus once the change has rendered.
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });

  function setFocus(id: string) {
    focusNext.current = id;
  }

  const slugs = stack.items.map((i) => i.slug);
  const title = cleanStackTitle(stack.title);
  const href = stackHref(slugs, stack.title);
  const url = `${BASE_URL}${href}`;
  const compared = slugs.slice(0, COMPARE_MAX);

  if (view === 'agent') {
    return (
      <>
        <div className="agent-section-title">listings · {hydrated ? `${slugs.length} of ${MY_STACK_MAX}` : 'kept in this browser'}</div>
        {stack.items.map((item) => (
          <Link key={item.slug} href={`/agents/${item.slug}`} className="agent-row no-underline hover:underline">
            <span className="agent-accent">{item.slug}</span>
            <span className="agent-dim">{item.name}</span>
            <span className="agent-dim" />
          </Link>
        ))}
        {slugs.length > 0 && (
          <>
            <div className="agent-section-title">share</div>
            <Link href={href} className="agent-row agent-row-stack no-underline hover:underline">
              <span className="agent-accent">{href}</span>
              <span className="agent-dim">this stack as a page anyone can open</span>
              <span className="agent-dim" />
            </Link>
            {compared.length > 1 && (
              <Link href={compareHref(compared)} className="agent-row agent-row-stack no-underline hover:underline">
                <span className="agent-accent">{compareHref(compared)}</span>
                <span className="agent-dim">the first {compared.length} side by side</span>
                <span className="agent-dim" />
              </Link>
            )}
          </>
        )}
      </>
    );
  }

  if (!hydrated) {
    return (
      <p className="text-lg">
        Your stack is kept in this browser.
        <noscript> Turn on JavaScript to see and edit it.</noscript>
      </p>
    );
  }

  function move(slug: string, name: string, by: -1 | 1) {
    const next = withMoved(readMyStack(), slug, by);
    writeMyStack(next);
    const at = next.items.findIndex((i) => i.slug === slug);
    setSaid(`${name} moved ${by < 0 ? 'up' : 'down'}, to ${at + 1} of ${next.items.length}.`);
    // At either end the button just pressed is disabled, so the other one takes the keyboard.
    const [pressed, other] = by < 0 ? ['up', 'down'] : ['down', 'up'];
    const end = by < 0 ? at === 0 : at === next.items.length - 1;
    setFocus(`stk-${end ? other : pressed}-${slug}`);
  }

  function remove(slug: string, name: string) {
    const current = readMyStack();
    const at = current.items.findIndex((i) => i.slug === slug);
    const next = withoutItem(current, slug);
    writeMyStack(next);
    setSaid(`${name} removed from My stack.`);
    const neighbour = next.items[Math.min(at, next.items.length - 1)];
    setFocus(neighbour ? `stk-remove-${neighbour.slug}` : 'stk-empty');
  }

  function clear() {
    writeMyStack(EMPTY_STACK);
    setClearing(false);
    setSaid('My stack cleared.');
    setFocus('stk-empty');
  }

  return (
    <>
      <p role="status" className="sr-only">
        {said}
      </p>

      {stack.items.length === 0 ? (
        <section aria-labelledby="stk-empty" className="mb-10">
          <h2 id="stk-empty" tabIndex={-1} className="dir-bar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]">
            Nothing here yet
          </h2>
          <p className="mt-3 text-[17px]">
            Press the My stack button on a listing&apos;s card or page to keep it here: up to {MY_STACK_MAX}, in your order. Then share
            them all as one link.
          </p>
          <ul className="mt-4">
            {[
              ['/tasks', 'Start from a task', 'the tools that do a job, best fit first'],
              ['/stacks', 'Pick up a curated stack', 'add all of its tools at once'],
              ['/browse', 'Browse the directory', 'every listing, with filters'],
            ].map(([path, label, meta]) => (
              <li key={path}>
                <Link href={path} className="dir-row">
                  <span className="dir-row-name">{label}</span>
                  <span className="dir-row-leader" aria-hidden="true" />
                  <span className="dir-row-meta">{meta} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <div className="mb-8">
            <label htmlFor="stk-title" className="dir-label block text-[var(--dir-muted)]">
              Title
            </label>
            <input
              id="stk-title"
              type="text"
              value={stack.title}
              maxLength={STACK_TITLE_MAX}
              placeholder={UNTITLED_STACK}
              autoComplete="off"
              aria-describedby="stk-title-hint"
              onChange={(event) => writeMyStack(withTitle(readMyStack(), event.target.value))}
              className="mt-1 w-full rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-3 py-2 text-xl font-bold text-[var(--dir-ink)] placeholder:font-semibold placeholder:text-[var(--dir-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
            />
            <p id="stk-title-hint" className="mt-1 text-[15px] text-[var(--dir-muted)]">
              Shown on the shared page and its card. Leave it empty and it reads “{UNTITLED_STACK}”.
            </p>
          </div>

          <section aria-labelledby="stk-listings" className="mb-10">
            <h2 id="stk-listings" className="dir-bar">
              In my stack{' '}
              <span className="dir-bar-count">
                · {stack.items.length} of {MY_STACK_MAX}
              </span>
            </h2>
            <ol>
              {stack.items.map((item, i) => (
                <li key={item.slug} className="flex min-w-0 items-center gap-2 border-b border-[var(--dir-rule)]! py-2">
                  <span className="w-6 shrink-0 text-right text-[15px] font-bold text-[var(--dir-muted)]" aria-hidden="true">
                    {i + 1}
                  </span>
                  {item.icon ? (
                    <img src={item.icon} alt="" width={28} height={28} className="agent-icon shrink-0" style={{ width: 28, height: 28 }} />
                  ) : (
                    <AgentIcon name={item.name} size={28} />
                  )}
                  <Link
                    href={`/agents/${item.slug}`}
                    className="min-w-0 flex-1 wrap-break-word text-[17px] font-bold leading-snug text-[var(--dir-ink)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
                  >
                    {item.name}
                  </Link>
                  <button
                    type="button"
                    id={`stk-up-${item.slug}`}
                    onClick={() => move(item.slug, item.name, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${item.name} up`}
                    className={ICON_BUTTON}
                  >
                    <ChevronUp aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    id={`stk-down-${item.slug}`}
                    onClick={() => move(item.slug, item.name, 1)}
                    disabled={i === stack.items.length - 1}
                    aria-label={`Move ${item.name} down`}
                    className={ICON_BUTTON}
                  >
                    <ChevronDown aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    id={`stk-remove-${item.slug}`}
                    onClick={() => remove(item.slug, item.name)}
                    aria-label={`Remove ${item.name} from My stack`}
                    className={ICON_BUTTON}
                  >
                    <X aria-hidden="true" className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ol>
            {compared.length > 1 && (
              <Link href={compareHref(compared)} className="dir-row mt-2">
                <span className="dir-row-name">
                  Compare {compared.length === slugs.length ? (slugs.length === 2 ? 'both' : 'all 3') : `the first ${compared.length}`}
                </span>
                <span className="dir-row-leader" aria-hidden="true" />
                <span className="dir-row-meta" aria-hidden="true">
                  Side by side →
                </span>
              </Link>
            )}
          </section>

          <section aria-labelledby="stk-share" className="mb-10">
            <h2 id="stk-share" className="dir-bar">
              Share it
            </h2>
            <p className="mt-3 text-[17px]">
              The link is the stack: whoever opens it sees {title ? `“${title}”` : 'these listings'}, in this order, and can make their own copy.
              Nothing is stored on our servers, so a change here needs a new link.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <code className="mono min-w-0 break-all text-[14px] font-bold">{url}</code>
              <CopyButton text={url} what="the link to My stack" event="stack_share" data={{ items: slugs.length, from: 'my-stack' }} />
            </div>
            <p className="mt-3">
              <Link href={href} className={LINK}>
                Open the shared page<span aria-hidden="true"> →</span>
              </Link>
            </p>
          </section>

          <section aria-labelledby="stk-clear" className="mb-10">
            <h2 id="stk-clear" className="sr-only">
              Clear My stack
            </h2>
            {clearing ? (
              <div className="border-l-4 border-[var(--dir-yellow)]! pl-3">
                <p className="text-[16px] font-semibold">
                  Take all {stack.items.length} {pluralize(stack.items.length, 'listing')} out of My stack
                  {stack.items.length <= 3 ? ` (${joinList(stack.items.map((i) => i.name))})` : ''}? The links you shared keep working.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={clear} className={BUTTON}>
                    Yes, clear it
                  </button>
                  <button
                    type="button"
                    id="stk-clear-keep"
                    onClick={() => {
                      setClearing(false);
                      setFocus('stk-clear-start');
                    }}
                    className={BUTTON}
                  >
                    Keep them
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                id="stk-clear-start"
                onClick={() => {
                  setClearing(true);
                  setFocus('stk-clear-keep');
                }}
                className={BUTTON}
              >
                Clear My stack
              </button>
            )}
          </section>
        </>
      )}
    </>
  );
}
