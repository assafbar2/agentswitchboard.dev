/**
 * The Verified label's date, said beside the badge: "Verified: link and access
 * path checked, Nov 2026".
 *
 * There is no separate log of rechecks, so the date is the listing's own
 * updatedAt: the weekly run sets a listing Verified only after it has checked
 * its links and access path, and a listing is re-dated each time it is
 * reviewed and changed (scripts/validate-content.ts keeps updatedAt no older
 * than its last changelog entry). Imports only types: the homepage answer
 * renders this in the browser.
 */

import type { Agent } from './types';

/** What the label means, in a few words. The full definition is VERIFIED_DEFINITION. */
export const VERIFIED_MEANING = 'link and access path checked';

export const VERIFIED_ABOUT = '/about#verification';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** YYYY-MM-DD the listing was last checked, or null when it is not Verified or has no date. */
export function lastChecked(agent: Pick<Agent, 'verified' | 'updatedAt' | 'createdAt'>): string | null {
  if (!agent.verified) return null;
  const at = agent.updatedAt ?? agent.createdAt;
  return at && /^\d{4}-\d{2}-\d{2}/.test(at) ? at.slice(0, 10) : null;
}

/** "2026-11-13" → "Nov 2026", read as written with no timezone shift. */
export function checkedMonth(date: string): string {
  const [y, m] = date.slice(0, 7).split('-').map(Number);
  return y && m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : date;
}

/** "link and access path checked, Nov 2026", without the date when there is none. */
export function verifiedDetail(checked: string | null | undefined): string {
  return checked ? `${VERIFIED_MEANING}, ${checkedMonth(checked)}` : VERIFIED_MEANING;
}

/** "Verified: link and access path checked, Nov 2026". */
export function verifiedNote(checked: string | null | undefined): string {
  return `Verified: ${verifiedDetail(checked)}`;
}
