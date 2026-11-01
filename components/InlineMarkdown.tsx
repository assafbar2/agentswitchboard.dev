import Link from 'next/link';
import type { ReactNode } from 'react';
import { INLINE_TOKEN } from '@/lib/inline-markdown';

const SITE = 'https://agentswitchboard.dev';

const linkClass =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

/**
 * Renders one line of inline Markdown. Links to this site become client-side
 * links with relative paths; everything else opens in a new tab.
 */
export function InlineMarkdown({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) nodes.push(text.slice(last, at));
    const [, code, label, href, bold] = match;
    if (code !== undefined) {
      nodes.push(
        <code key={at} className="mono text-[0.9em]">
          {code}
        </code>
      );
    } else if (label !== undefined && href !== undefined) {
      const internal = href === SITE || href.startsWith(`${SITE}/`) || href.startsWith(`${SITE}#`);
      nodes.push(
        internal ? (
          <Link key={at} href={href.slice(SITE.length) || '/'} className={linkClass}>
            {label}
          </Link>
        ) : (
          <a key={at} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {label}
          </a>
        )
      );
    } else if (bold !== undefined) {
      nodes.push(<strong key={at}>{bold}</strong>);
    }
    last = at + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
