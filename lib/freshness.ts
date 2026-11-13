/**
 * Freshness: which listings are new. A listing is new for NEW_DAYS days
 * from the UTC day it was added (its createdAt, the day the change log
 * records). "Today" is the day the deployment was built, so every page of
 * it agrees, prerendered or not; every deploy, the weekly drop's at least,
 * moves the window on.
 */

import { rankAdditions, type Drop } from './drops';
import type { Agent } from './types';

export const NEW_DAYS = 30;

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** When the deployment was built (next.config.ts inlines BUILD_TIME); now, in tests and scripts. */
const builtAt = () => Number(process.env.BUILD_TIME) || Date.now();

/** The first UTC day that still counts as new: today and the NEW_DAYS - 1 days before it. */
export function newSince(now: number = builtAt()): string {
  return new Date(now - (NEW_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Whether a listing added at `createdAt` is new; `since` is newSince(). */
export function isNew(createdAt: string | undefined, since: string = newSince()): boolean {
  return !!createdAt && ISO_DAY.test(createdAt) && createdAt.slice(0, 10) >= since;
}

export interface NewGroup {
  /** The drop that took the listings in, or null for those added since the latest drop. */
  drop: Drop | null;
  /** Ranked as a drop page ranks its additions. */
  agents: Agent[];
}

/**
 * The listings added since `since`, grouped by drop, newest first. A
 * listing belongs to the oldest drop whose last day is on or after the day
 * it was added: lib/drops.ts folds a quiet day into the next batch, so that
 * is the drop that took it in. One added after the latest drop is in the
 * group for the changes since then. `drops` is newest first, as
 * getDropSchedule() returns them.
 */
export function newListings(catalog: Agent[], drops: readonly Drop[], since: string): NewGroup[] {
  const oldestFirst = [...drops].reverse();
  const grouped = new Map<Drop | null, Agent[]>();
  for (const agent of catalog) {
    if (!isNew(agent.createdAt, since)) continue;
    const day = agent.createdAt!.slice(0, 10);
    const drop = oldestFirst.find((d) => d.days[d.days.length - 1] >= day) ?? null;
    grouped.set(drop, [...(grouped.get(drop) ?? []), agent]);
  }
  return [null, ...drops].flatMap((drop) => {
    const agents = grouped.get(drop);
    return agents ? [{ drop, agents: rankAdditions(agents, catalog) }] : [];
  });
}
