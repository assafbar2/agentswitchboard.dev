import Link from 'next/link';
import { InlineMarkdown } from '@/components/InlineMarkdown';
import { WhatsNewEvents } from '@/components/WhatsNewEvents';
import { releaseAnchor, type Release } from '@/lib/changelog';

/**
 * A release's highlights, one ruled row each: what you can do now, then its
 * Try it link, which names the highlight it belongs to for screen readers.
 * On phones the link ends the sentence; its vertical padding makes a 44px
 * tap target without adding a line.
 */
export function Highlights({ release, from }: { release: Release; from: 'home' | 'whats-new' }) {
  const anchor = releaseAnchor(release.version);
  return (
    <WhatsNewEvents from={from}>
      <ul>
        {release.highlights.map((h, i) => (
          <li key={i} className="border-b border-[var(--dir-rule)]! py-2.5 text-[16px] leading-snug sm:flex sm:items-baseline sm:gap-6">
            <span id={`${anchor}-${i + 1}`} className="sm:min-w-0 sm:flex-1">
              <InlineMarkdown text={h.text} />
            </span>{' '}
            <Link
              href={h.tryIt}
              data-try={release.version}
              aria-describedby={`${anchor}-${i + 1}`}
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
