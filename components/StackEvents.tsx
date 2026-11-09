'use client';

/**
 * Counts how a stack page is used, as Vercel Analytics events: `stack_view`
 * once the page has loaded, and `stack_item_click` when a listing in
 * `children` is opened. One listener for the whole list keeps the listings
 * themselves server-rendered. Fire and forget, like CopyButton: analytics
 * never gets in the way of a click.
 */

import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { track } from '@vercel/analytics';

function send(event: string, data: Record<string, string>) {
  try {
    track(event, data);
  } catch {
    // Analytics is optional.
  }
}

export function StackEvents({ stack, children }: { stack: string; children: ReactNode }) {
  useEffect(() => {
    send('stack_view', { stack });
  }, [stack]);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const href = (event.target as Element).closest('a[href^="/agents/"]')?.getAttribute('href');
    if (href) send('stack_item_click', { stack, slug: href.split('/')[2] });
  }

  return <div onClick={onClick}>{children}</div>;
}
