'use client';

/**
 * Counts a /browse view that found nothing as `search_zero_results`, with
 * the best way back it offered, and each way back taken as
 * `recovery_click`: the kind of link (`data-recovery` on it or around it)
 * and, for a removal, what it removed (`data-what`). Counts only, never
 * the search text; fire and forget, like StackEvents.
 */

import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { count } from '@/lib/analytics';

export function RecoveryEvents({
  offer,
  words,
  filters,
  children,
}: {
  offer: string;
  words: number;
  filters: number;
  children: ReactNode;
}) {
  useEffect(() => {
    count('search_zero_results', { offer, words, filters });
  }, [offer, words, filters]);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest('a');
    const kind = link?.closest<HTMLElement>('[data-recovery]')?.dataset.recovery;
    if (!link || !kind) return;
    const what = link.dataset.what;
    count('recovery_click', what ? { kind, what } : { kind });
  }

  return <div onClick={onClick}>{children}</div>;
}
