'use client';

/**
 * Puts a whole stack into My stack (lib/my-stack.ts). On a curated stack page
 * or the Operator's, it adds the stack's listings to whatever My stack holds.
 * On a shared stack it makes the visitor's own copy to edit, so the link they
 * opened stays as it was; when My stack already holds other listings, it
 * first asks whether to replace them or add to them. Hidden without
 * JavaScript, like the toggles.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { count } from '@/lib/analytics';
import { inMyStack, readMyStack, useMyStack, withItems, writeMyStack, type MyStack, type MyStackItem } from '@/lib/my-stack';
import { MY_STACK_MAX } from '@/lib/stack-link';
import { pluralize } from '@/lib/utils';

const BUTTON =
  'inline-flex min-h-10 cursor-pointer items-center rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-extrabold uppercase tracking-[0.06em] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';
const PLAIN = `${BUTTON} bg-[var(--dir-paper)] text-[var(--dir-ink)] hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)]`;
const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

const sameItems = (a: readonly MyStackItem[], b: readonly MyStackItem[]) =>
  a.length === b.length && a.every((item, i) => item.slug === b[i].slug);

/** What adding did, in a sentence. */
function addedText(added: number, already: number, full: number): string {
  if (added === 0 && full === 0) return `${already === 1 ? 'It is' : `All ${already} are`} already in My stack.`;
  if (added === 0) return `My stack is full: it holds up to ${MY_STACK_MAX}. Remove some there to add these.`;
  const parts = [`Added ${added} to My stack.`];
  if (already > 0) parts.push(`${already} ${already === 1 ? 'was' : 'were'} already there.`);
  if (full > 0) parts.push(`It holds up to ${MY_STACK_MAX}, so ${full} didn’t fit.`);
  return parts.join(' ');
}

/** The question before a copy lands in a My stack that holds `held` other listings, `fresh` of this stack's not among them. */
function replaceOrAdd(held: number, fresh: number): string {
  if (held >= MY_STACK_MAX) return `My stack is full: it holds ${held} listings. Replace them with this stack?`;
  const them = held === 1 ? 'it' : 'them';
  const ask = `My stack already holds ${held} ${pluralize(held, 'listing')}. Replace ${them} with this stack, or add this stack’s listings after ${them}?`;
  if (fresh === 0) return `${ask} This stack’s listings are all in it already.`;
  const room = MY_STACK_MAX - held;
  return fresh > room ? `${ask} Only ${room} more ${room === 1 ? 'fits' : 'fit'}.` : ask;
}

export function SaveStack({ items, title, from }: { items: MyStackItem[]; title: string; from: 'stacks' | 'stack' | 'operator' }) {
  const router = useRouter();
  const current = useMyStack();
  const [said, setSaid] = useState('');
  const [asking, setAsking] = useState(false);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  const asked = useRef(false);

  // The choices take the keyboard when they appear, and give it back on Cancel.
  useEffect(() => {
    if (asking) firstChoice.current?.focus();
    else if (asked.current) copyButton.current?.focus();
    asked.current = asking;
  }, [asking]);

  function addAll() {
    const stack = readMyStack();
    const merged = withItems(stack, items);
    writeMyStack(stack.items.length === 0 && !stack.title ? { ...merged.stack, title } : merged.stack);
    setSaid(addedText(merged.added, merged.already, merged.full));
    if (merged.added > 0) count('stack_add', { from, items: merged.added });
  }

  function open(next: MyStack, added: number) {
    writeMyStack(next);
    if (added > 0) count('stack_add', { from, items: added });
    router.push('/my-stack');
  }

  function copy() {
    const stack = readMyStack();
    if (stack.items.length === 0) return open({ title, items }, items.length);
    if (sameItems(stack.items, items)) return open({ title, items }, 0);
    setAsking(true);
  }

  if (from !== 'stack') {
    return (
      <div className="stk-needs-js mt-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" onClick={addAll} className={PLAIN}>
            Add all to My stack
          </button>
          <p role="status" className="min-w-0 text-[15px] font-semibold">
            {said}
            {said && (
              <>
                {' '}
                <Link href="/my-stack" className={LINK}>
                  Open My stack<span aria-hidden="true"> →</span>
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  const held = current.items.length;
  const fresh = items.filter((item) => !inMyStack(current, item.slug)).length;

  return (
    <div className="stk-needs-js mt-4">
      {asking && held > 0 ? (
        <div role="group" aria-labelledby="stk-replace-or-add" className="border-l-4 border-[var(--dir-yellow)]! pl-3">
          <p id="stk-replace-or-add" className="text-[16px] font-semibold">
            {replaceOrAdd(held, fresh)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" ref={firstChoice} onClick={() => open({ title, items }, items.length)} className={PLAIN}>
              Replace
            </button>
            {held < MY_STACK_MAX && (
              <button
                type="button"
                onClick={() => {
                  const merged = withItems(readMyStack(), items);
                  open(merged.stack, merged.added);
                }}
                className={PLAIN}
              >
                Add to it
              </button>
            )}
            <button type="button" onClick={() => setAsking(false)} className={PLAIN}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" ref={copyButton} onClick={copy} className={PLAIN}>
            Edit a copy
          </button>
          <p className="min-w-0 grow basis-64 text-[15px] text-[var(--dir-muted)]">
            Opens it in My stack, where you can reorder it, rename it and share your own link. This link stays as it is.
          </p>
        </div>
      )}
    </div>
  );
}
