/**
 * Stacks: published recipes of listings that together do one job, from
 * content/stacks.json. A stack lists its listings in order, each with why it
 * is there. A stack with a `week` is the stack of the week for that drop
 * (lib/drops.ts); the newest one is featured on the homepage and on its drop
 * page. scripts/validate-content.ts checks the file with stackProblems.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cache } from 'react';
import { ALL_ACCESS_METHODS } from './search';
import type { Agent } from './types';

export const STACK_TITLE_MAX = 70;
export const STACK_PROMISE_MAX = 160;
export const STACK_WHY_MAX = 160;
export const STACK_MIN_ITEMS = 2;
export const STACK_MAX_ITEMS = 8;

export interface StackItem {
  /** A published listing. */
  slug: string;
  /** What the listing does for the stack's job. */
  why: string;
}

export interface Stack {
  slug: string;
  title: string;
  /** One line on what the stack gets you done. */
  promise: string;
  /** The date of the drop this is the stack of the week for. */
  week?: string;
  items: StackItem[];
}

/** A stack item with its listing. */
export interface StackEntry {
  agent: Agent;
  why: string;
}

const FILE = path.join(process.cwd(), 'content', 'stacks.json');

/** Every stack, in the file's order. */
export const getStacks = cache((): Stack[] =>
  fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, 'utf8')) as Stack[]) : []
);

export function getStack(slug: string): Stack | null {
  return getStacks().find((s) => s.slug === slug) ?? null;
}

/** The stack of the newest drop that has one. */
export function stackOfTheWeek(stacks: Stack[]): Stack | null {
  let newest: Stack | null = null;
  for (const s of stacks) if (s.week && (!newest?.week || s.week > newest.week)) newest = s;
  return newest;
}

/** The stack of the week for the drop dated `date`. */
export function stackForDrop(stacks: Stack[], date: string): Stack | null {
  return stacks.find((s) => s.week === date) ?? null;
}

/**
 * The order /stacks shows them in: the stack of the week, then the stacks
 * that belong to no week in the file's order, then earlier stacks of the
 * week, newest first.
 */
export function stackSections(stacks: Stack[]): { week: Stack | null; standing: Stack[]; earlier: Stack[] } {
  const week = stackOfTheWeek(stacks);
  return {
    week,
    standing: stacks.filter((s) => !s.week),
    earlier: stacks.filter((s) => s.week && s !== week).sort((a, b) => b.week!.localeCompare(a.week!)),
  };
}

/** stackSections as one list. */
export function stacksInOrder(stacks: Stack[]): Stack[] {
  const { week, standing, earlier } = stackSections(stacks);
  return [...(week ? [week] : []), ...standing, ...earlier];
}

/** The stack's listings in its order. A slug that is no longer listed is left out. */
export function stackEntries(stack: Stack, catalog: Agent[]): StackEntry[] {
  const bySlug = new Map(catalog.map((a) => [a.slug, a]));
  return stack.items.flatMap(({ slug, why }) => {
    const agent = bySlug.get(slug);
    return agent ? [{ agent, why }] : [];
  });
}

/** The access methods the stack's listings offer between them, in the site's order. */
export function stackAccessMethods(entries: StackEntry[]): string[] {
  const methods = new Set<string>(entries.flatMap((e) => e.agent.accessMethods));
  return ALL_ACCESS_METHODS.filter((m) => methods.has(m));
}

/**
 * What is wrong with content/stacks.json beyond its shape: stack slugs are
 * unique, every item is a published listing at most once per stack, and a
 * `week` names a drop that has no other stack and added at least one of the
 * stack's listings.
 */
export function stackProblems(
  stacks: Stack[],
  published: Set<string>,
  drops: { date: string; added: { slug: string }[] }[]
): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();
  const weeks = new Map<string, string>();
  const added = new Map(drops.map((d) => [d.date, new Set(d.added.map((a) => a.slug))]));
  for (const stack of stacks) {
    if (slugs.has(stack.slug)) problems.push(`duplicate stack slug "${stack.slug}"`);
    slugs.add(stack.slug);

    const items = new Set<string>();
    for (const { slug } of stack.items) {
      if (!published.has(slug)) problems.push(`${stack.slug}: "${slug}" is not a published listing`);
      if (items.has(slug)) problems.push(`${stack.slug}: "${slug}" is listed twice`);
      items.add(slug);
    }

    if (stack.week) {
      const additions = added.get(stack.week);
      if (!additions) {
        problems.push(`${stack.slug}: week "${stack.week}" is not a drop; use a date from /drops (lib/drops.ts)`);
      } else if (!stack.items.some((item) => additions.has(item.slug))) {
        problems.push(`${stack.slug}: the ${stack.week} drop added none of its listings; a stack of the week needs at least one`);
      }
      const other = weeks.get(stack.week);
      if (other) problems.push(`${stack.slug}: the ${stack.week} drop already has a stack of the week, "${other}"`);
      else weeks.set(stack.week, stack.slug);
    }
  }
  return problems;
}
