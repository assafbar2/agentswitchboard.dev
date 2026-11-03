'use client';

import NextLink from 'next/link';
import { useState, type ComponentProps } from 'react';

/**
 * next/link for every page link on the site. Next prefetches a link as soon as
 * it scrolls into view, so one look at a category page fetched some 800 pages
 * from the CDN, and each link with a query (/browse?task=…, /compare?a=…) ran
 * a function. This prefetches only once the pointer, a touch or focus reaches
 * a link, and never for an address with a query.
 */
export default function Link({ prefetch, onMouseEnter, onTouchStart, onFocus, ...props }: ComponentProps<typeof NextLink>) {
  const [intent, setIntent] = useState(false);
  const plain = typeof props.href === 'string' && !props.href.includes('?');
  const arm = () => {
    if (plain && !intent) setIntent(true);
  };
  return (
    <NextLink
      {...props}
      prefetch={prefetch ?? (intent ? null : false)}
      onMouseEnter={(e) => {
        arm();
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        arm();
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        arm();
        onFocus?.(e);
      }}
    />
  );
}
