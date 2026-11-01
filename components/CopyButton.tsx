'use client';

/**
 * Copies a piece of text and confirms it for a moment. Each copy is counted as
 * a Vercel Analytics event, fire and forget: analytics can never fail a copy.
 *
 * Progressive enhancement: the button appears once the page is hydrated in a
 * browser with a clipboard to write to. Whatever it copies must also be on the
 * page as plain text, so without JavaScript nothing is lost.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { track } from '@vercel/analytics';
import { Check, Copy } from 'lucide-react';

const CONFIRM_MS = 2000;

const noopSubscribe = () => () => {};
const hasClipboard = () => typeof navigator.clipboard?.writeText === 'function';

const LABELS = { idle: 'Copy', copied: 'Copied', failed: 'Copy failed' } as const;
const ANNOUNCEMENTS = { idle: '', copied: 'Copied to the clipboard', failed: 'Could not copy. Select the text to copy it instead.' } as const;

export function CopyButton({
  text,
  what,
  event,
  data,
}: {
  text: string;
  /** Completes the button's name for screen readers: "Copy" + " the Search files prompt". */
  what: string;
  /** Analytics event counted on each copy. */
  event: string;
  data?: Record<string, string>;
}) {
  const available = useSyncExternalStore(noopSubscribe, hasClipboard, () => false);
  const [state, setState] = useState<keyof typeof LABELS>('idle');
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reset.current), []);

  async function copy() {
    clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      try {
        track(event, data);
      } catch {
        // The text is already copied.
      }
    } catch {
      setState('failed');
    }
    reset.current = setTimeout(() => setState('idle'), CONFIRM_MS);
  }

  const Icon = state === 'copied' ? Check : Copy;
  const fill = state === 'copied' ? 'bg-[var(--dir-yellow)] text-[var(--dir-on-yellow)]' : 'bg-[var(--dir-paper)] text-[var(--dir-ink)]';
  return (
    <>
      <button
        type="button"
        onClick={copy}
        hidden={!available}
        className={`${fill} inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-none border-2 border-[var(--dir-ink)]! px-3 font-[family-name:var(--font-display)] text-sm font-extrabold uppercase tracking-[0.06em] transition-colors hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]`}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
        {LABELS[state]}
        <span className="sr-only"> {what}</span>
      </button>
      <span role="status" className="sr-only">
        {ANNOUNCEMENTS[state]}
      </span>
    </>
  );
}
