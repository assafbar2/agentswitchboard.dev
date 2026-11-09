/**
 * My stack: up to MY_STACK_MAX listings a visitor keeps, in their order, with
 * a title for when they share it. It lives in this browser's localStorage, so
 * it needs no account and shows in every tab; the server never stores it.
 * Sharing turns it into a /stack link (lib/stack-link.ts).
 *
 * The helpers that change a stack are pure and return a new one; read, write
 * and useMyStack connect them to localStorage.
 */

import { useSyncExternalStore } from 'react';
import { isListingSlug, MY_STACK_MAX, STACK_TITLE_MAX } from './stack-link';

export interface MyStackItem {
  slug: string;
  name: string;
  /** The small icon file the card shows, or null for the name's initial. */
  icon: string | null;
}

export interface MyStack {
  /** As typed: lib/stack-link.ts cleanStackTitle tidies it for the shared page. */
  title: string;
  items: MyStackItem[];
}

export const EMPTY_STACK: MyStack = { title: '', items: [] };

const KEY = 'my-stack';
const CHANGE = 'my-stack-change';
const NAME_MAX = 120;

/** A stored stack, or EMPTY_STACK. Anything unexpected in it is dropped rather than failing. */
export function parseMyStack(raw: string | null): MyStack {
  if (!raw) return EMPTY_STACK;
  let value: { title?: unknown; items?: unknown };
  try {
    value = JSON.parse(raw);
  } catch {
    return EMPTY_STACK;
  }
  if (!value || typeof value !== 'object') return EMPTY_STACK;
  const items: MyStackItem[] = [];
  for (const item of Array.isArray(value.items) ? value.items : []) {
    const { slug, name, icon } = (item ?? {}) as Record<string, unknown>;
    if (typeof slug !== 'string' || typeof name !== 'string' || !isListingSlug(slug)) continue;
    if (items.some((i) => i.slug === slug)) continue;
    items.push({
      slug,
      name: name.slice(0, NAME_MAX),
      icon: typeof icon === 'string' && icon.startsWith('/icons/') ? icon : null,
    });
    if (items.length === MY_STACK_MAX) break;
  }
  const title = typeof value.title === 'string' ? value.title.replace(/[\r\n\t]/g, ' ').slice(0, STACK_TITLE_MAX) : '';
  return { title, items };
}

export function inMyStack(stack: MyStack, slug: string): boolean {
  return stack.items.some((i) => i.slug === slug);
}

/** `item` added at the end, unless it is already there or the stack is full. */
export function withItem(stack: MyStack, item: MyStackItem): MyStack {
  if (inMyStack(stack, item.slug) || stack.items.length >= MY_STACK_MAX) return stack;
  return { ...stack, items: [...stack.items, item] };
}

export function withoutItem(stack: MyStack, slug: string): MyStack {
  return { ...stack, items: stack.items.filter((i) => i.slug !== slug) };
}

/** `slug` moved `by` places, -1 up or 1 down, unless that takes it past either end. */
export function withMoved(stack: MyStack, slug: string, by: -1 | 1): MyStack {
  const from = stack.items.findIndex((i) => i.slug === slug);
  const to = from + by;
  if (from < 0 || to < 0 || to >= stack.items.length) return stack;
  const items = [...stack.items];
  [items[from], items[to]] = [items[to], items[from]];
  return { ...stack, items };
}

export function withTitle(stack: MyStack, title: string): MyStack {
  return { ...stack, title: title.replace(/[\r\n\t]/g, ' ').slice(0, STACK_TITLE_MAX) };
}

/** What adding several listings at once did: how many went in, were there already, or didn't fit. */
export interface Merged {
  stack: MyStack;
  added: number;
  already: number;
  full: number;
}

/** `items` added at the end in order, skipping those already in the stack, until it is full. */
export function withItems(stack: MyStack, items: readonly MyStackItem[]): Merged {
  let next = stack;
  let already = 0;
  let full = 0;
  for (const item of items) {
    if (inMyStack(next, item.slug)) already++;
    else if (next.items.length >= MY_STACK_MAX) full++;
    else next = withItem(next, item);
  }
  return { stack: next, added: next.items.length - stack.items.length, already, full };
}

// ── localStorage ────────────────────────────────────────────────────

/** Used when localStorage is unavailable, so My stack still works on this page. */
let memory: MyStack = EMPTY_STACK;
let cached: { raw: string | null; stack: MyStack } = { raw: null, stack: EMPTY_STACK };

/** The stack: the same object until it changes, as useSyncExternalStore needs. */
export function readMyStack(): MyStack {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return memory;
  }
  if (raw !== cached.raw) cached = { raw, stack: parseMyStack(raw) };
  return cached.stack;
}

export function writeMyStack(stack: MyStack): void {
  memory = stack;
  try {
    if (stack.items.length > 0 || stack.title) localStorage.setItem(KEY, JSON.stringify(stack));
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

/** My stack, kept up to date across tabs. EMPTY_STACK on the server and until hydration. */
export function useMyStack(): MyStack {
  return useSyncExternalStore(subscribe, readMyStack, () => EMPTY_STACK);
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration, so a page can hold back what only the browser knows. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}
