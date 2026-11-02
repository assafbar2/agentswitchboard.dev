'use client';

/**
 * Counts how the Use it now panel's links are used, as Vercel Analytics
 * events: `useit_deeplink` for an "Add to" link and `useit_docs_click` for a
 * setup or docs link. One listener for the panel keeps it server-rendered.
 */

import type { MouseEvent, ReactNode } from 'react';
import { count } from '@/lib/analytics';

export function UseItEvents({ slug, children }: { slug: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-useit]');
    if (!link) return;
    const { useit, client, method } = link.dataset;
    if (useit === 'deeplink' && client) count('useit_deeplink', { slug, client });
    if (useit === 'docs' && method) count('useit_docs_click', { slug, method });
  }

  return <div onClick={onClick}>{children}</div>;
}
