/**
 * Shared stacks: /stack?items=<slug>,<slug>&title=<title>, made from My stack
 * (lib/my-stack.ts). The link is the whole stack, so this module decides what
 * any link shows, including a stale or hand-edited one: each listing once, in
 * the link's order; a listing that has left the directory stays in its place,
 * struck through, so an old link still explains itself.
 */

import { cleanStackTitle, isListingSlug, MY_STACK_MAX, stackHref } from './stack-link';
import type { Agent } from './types';
import { pluralize } from './utils';

/** Most slugs read from one link; the rest are ignored. */
const REQUESTED_MAX = 3 * MY_STACK_MAX;

/** A named slug the page leaves out, and why. */
export interface SharedStackNote {
  /** '' when the link's value is not shaped like a slug, so it is never echoed. */
  slug: string;
  kind: 'unknown' | 'duplicate';
  name?: string;
}

export type SharedStackEntry = { agent: Agent; retired?: never } | { agent?: never; retired: { slug: string; name: string } };

export interface SharedStack {
  /** The link's title, cleaned; '' when it has none. */
  title: string;
  entries: SharedStackEntry[];
  notes: SharedStackNote[];
  /** Listings named past MY_STACK_MAX, left out. */
  extra: number;
}

/** The slugs a /stack link names, in order, repeats included: its `items`, split on commas. */
export function requestedStackSlugs(items: string | string[] | null | undefined): string[] {
  return [items ?? []]
    .flat()
    .flatMap((value) => value.split(','))
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, REQUESTED_MAX);
}

/** The stack a link names. `retired` is lib/catalog.ts getRetiredListings: slug → name. */
export function sharedStack(
  requested: readonly string[],
  title: unknown,
  catalog: readonly Agent[],
  retired: ReadonlyMap<string, string>
): SharedStack {
  const bySlug = new Map(catalog.map((a) => [a.slug, a]));
  const entries: SharedStackEntry[] = [];
  const notes: SharedStackNote[] = [];
  const seen = new Set<string>();
  const kept = new Set<string>();
  let extra = 0;
  for (const slug of requested) {
    const agent = bySlug.get(slug);
    const retiredName = agent ? undefined : retired.get(slug);
    if (seen.has(slug)) {
      if (kept.has(slug)) notes.push({ slug, kind: 'duplicate', name: agent?.name ?? retiredName });
      continue;
    }
    seen.add(slug);
    if (!agent && !retiredName) {
      notes.push({ slug: isListingSlug(slug) ? slug : '', kind: 'unknown' });
    } else if (entries.length === MY_STACK_MAX) {
      extra++;
    } else {
      kept.add(slug);
      entries.push(agent ? { agent } : { retired: { slug, name: retiredName! } });
    }
  }
  return { title: cleanStackTitle(title), entries, notes, extra };
}

export function entrySlug(entry: SharedStackEntry): string {
  return entry.agent?.slug ?? entry.retired!.slug;
}

/** The stack's listings still in the directory, in order. */
export function listedAgents(stack: Pick<SharedStack, 'entries'>): Agent[] {
  return stack.entries.flatMap((e) => (e.agent ? [e.agent] : []));
}

/** The tidy address of what the page shows: kept listings in order, the cleaned title. */
export function sharedStackPath(stack: Pick<SharedStack, 'entries' | 'title'>): string {
  return stackHref(stack.entries.map(entrySlug), stack.title);
}

/** What the page says about a named slug it leaves out. */
export function sharedStackNoteText(note: SharedStackNote): string {
  if (note.kind === 'duplicate') return `${note.name ?? `“${note.slug}”`} was named twice; it is shown once.`;
  return note.slug ? `“${note.slug}” isn’t a listing in the directory, so it is left out.` : 'One item named no listing, so it is left out.';
}

/** What the page says about listings past MY_STACK_MAX. */
export function extraText(extra: number): string {
  return `${extra} more ${pluralize(extra, 'listing')} ${extra === 1 ? 'is' : 'are'} left out: a stack holds up to ${MY_STACK_MAX}.`;
}
