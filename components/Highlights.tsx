import Link from '@/components/Link';
import { InlineMarkdown } from '@/components/InlineMarkdown';
import { WhatsNewEvents } from '@/components/WhatsNewEvents';
import type { HighlightRow } from '@/lib/whats-new';

/**
 * Highlights of releases and drops, one ruled row each: what you can do now,
 * then its Try it link, which names the highlight it belongs to for screen
 * readers. On phones the link ends the sentence; its vertical padding makes a
 * 44px tap target without adding a line.
 */
export function Highlights({ rows, from }: { rows: HighlightRow[]; from: 'home' | 'whats-new' }) {
  return (
    <WhatsNewEvents from={from}>
      <ul>
        {rows.map(({ entry, highlight, id }) => (
          <li key={id} className="border-b border-[var(--dir-rule)]! py-2.5 text-[16px] leading-snug sm:flex sm:items-baseline sm:gap-6">
            <span id={id} className="sm:min-w-0 sm:flex-1">
              <InlineMarkdown text={highlight.text} />
            </span>{' '}
            <Link
              href={highlight.tryIt}
              data-try={entry.id}
              aria-describedby={id}
              className="whitespace-nowrap py-3.5 text-[15px] font-bold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2 sm:shrink-0 sm:py-0"
            >
              Try it<span aria-hidden="true">&nbsp;→</span>
            </Link>
          </li>
        ))}
      </ul>
    </WhatsNewEvents>
  );
}
