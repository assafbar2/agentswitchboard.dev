'use client';

/**
 * Counts a compare page as Vercel Analytics events: `compare_view` once per
 * comparison shown, and `useit_deeplink` for its "Add to Cursor" links. One
 * listener for the page keeps the table server-rendered.
 */

import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { count } from '@/lib/analytics';

export function CompareEvents({ slugs, curated, children }: { slugs: string[]; curated: boolean; children: ReactNode }) {
  const key = slugs.join(',');

  useEffect(() => {
    if (key) count('compare_view', { n: key.split(',').length, curated });
  }, [key, curated]);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-useit="deeplink"]');
    const { slug, client } = link?.dataset ?? {};
    if (slug && client) count('useit_deeplink', { slug, client, from: 'compare' });
  }

  return <div onClick={onClick}>{children}</div>;
}
