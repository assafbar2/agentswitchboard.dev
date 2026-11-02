'use client';

/**
 * Runs the My stack toggles (lib/my-stack.ts): one listener handles every
 * [data-stk] button, so the cards stay server-rendered. A toggle on a card
 * reads the listing's name and icon from the card; one elsewhere carries them
 * as data-stk-name and data-stk-icon.
 *
 * Each change is announced to screen readers and shown for a moment at the
 * bottom of the window, above the compare tray. Without JavaScript the toggles
 * stay hidden (app/globals.css).
 */

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { count } from '@/lib/analytics';
import { inMyStack, readMyStack, useMyStack, withItem, withoutItem, writeMyStack } from '@/lib/my-stack';
import { pageKind } from '@/lib/page-kind';
import { MY_STACK_MAX } from '@/lib/stack-link';

const SHOWN_MS = 3500;

export function MyStackClient() {
  const stack = useMyStack();
  const pathname = usePathname();
  const [said, setSaid] = useState('');
  const [shown, setShown] = useState('');
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-stk-ready', '');
    return () => {
      root.removeAttribute('data-stk-ready');
      clearTimeout(hide.current);
    };
  }, []);

  // Each toggle shows whether its listing is in the stack, including cards that render later.
  useEffect(() => {
    const kept = new Set(stack.items.map((i) => i.slug));
    const sync = () => {
      for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-stk]')) {
        const pressed = String(kept.has(button.dataset.stk ?? ''));
        if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [stack, pathname]);

  useEffect(() => {
    function say(text: string) {
      setSaid(text);
      setShown(text);
      clearTimeout(hide.current);
      hide.current = setTimeout(() => setShown(''), SHOWN_MS);
    }

    function onClick(event: MouseEvent) {
      const button = (event.target as Element | null)?.closest?.('button[data-stk]');
      if (!(button instanceof HTMLButtonElement)) return;
      const slug = button.dataset.stk ?? '';
      const current = readMyStack();
      const card = button.closest('.cmp-card');
      const name = button.dataset.stkName ?? card?.querySelector('h3')?.textContent?.trim() ?? slug;
      if (inMyStack(current, slug)) {
        writeMyStack(withoutItem(current, slug));
        say(`${name} removed from My stack.`);
        return;
      }
      if (current.items.length >= MY_STACK_MAX) {
        say(`My stack holds ${MY_STACK_MAX}. Remove one on the My stack page to add ${name}.`);
        return;
      }
      const icon = button.dataset.stkIcon ?? card?.querySelector('img')?.getAttribute('src') ?? null;
      const next = withItem(current, { slug, name, icon });
      writeMyStack(next);
      say(`${name} added to My stack (${next.items.length} of ${MY_STACK_MAX}).`);
      count('stack_add', { slug, from: button.dataset.stkFrom ?? pageKind(window.location.pathname) });
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <p role="status" className="sr-only">
        {said}
      </p>
      {shown && (
        <p aria-hidden="true" className="stk-note">
          {shown}
        </p>
      )}
    </>
  );
}
