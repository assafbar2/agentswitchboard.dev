'use client';

/**
 * Counts how task views are used, as Vercel Analytics events:
 * `task_to_listing_click` when a listing in `children` is opened from a
 * task, and `task_select` when a task is. One listener for the whole list
 * keeps the listings themselves server-rendered.
 */

import type { MouseEvent, ReactNode } from 'react';
import { count } from '@/lib/analytics';

const LISTING = /^\/agents\/([^/?#]+)$/;
const TASK = /^\/(?:tasks\/|browse\?task=)([^/?&#]+)$/;

export function TaskEvents({ task, from, children }: { task?: string; from: string; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLDivElement>) {
    const href = (event.target as Element).closest('a[href]')?.getAttribute('href') ?? '';
    const listing = LISTING.exec(href);
    if (task && listing) count('task_to_listing_click', { task, slug: listing[1], from });
    const picked = TASK.exec(href);
    if (picked && picked[1] !== task) count('task_select', { task: picked[1], from });
  }

  return <div onClick={onClick}>{children}</div>;
}
