import { type ReactNode } from 'react';

type Variant = 'default' | 'accent' | 'blue' | 'amber' | 'sponsor' | 'rose' | 'outline';

/**
 * Square directory tags: small uppercase labels with a 1px rule, no tints or
 * glows. Yellow is a fill only (amber = featured), always with --dir-on-yellow
 * text, so it reads in both themes. Only paid placements get the solid ink
 * `sponsor` tag (components/SponsoredBadge.tsx), so the disclosure never blends
 * into the editorial labels. The styles are .tag and .tag-<variant> in
 * globals.css.
 */
export function Badge({
  children,
  variant = 'default',
  className = '',
  title,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={className ? `tag tag-${variant} ${className}` : `tag tag-${variant}`}>
      {children}
    </span>
  );
}
