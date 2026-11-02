'use client';

/**
 * Counts `whats_new_try_click` when a highlight's Try it link is opened, with
 * the release and the page it leads to. One listener for the list keeps the
 * highlights server-rendered.
 */

import type { MouseEvent, ReactNode } from 'react';
import { count } from '@/lib/analytics';

export function WhatsNewEvents({ from, children }: { from: 'home' | 'whats-new'; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-try]');
    if (link) count('whats_new_try_click', { release: link.dataset.try ?? '', path: link.getAttribute('href') ?? '', from });
  }

  return <div onClick={onClick}>{children}</div>;
}
