import Link from '@/components/Link';
import { CopyBlock } from '@/components/CopyBlock';
import { badgeSnippets } from '@/lib/badges';
import type { Agent } from '@/lib/types';

export function EmbedBadge({
  agent,
}: {
  agent: Pick<Agent, 'slug' | 'official' | 'verified'>;
}) {
  const snippets = badgeSnippets(agent);

  return (
    <details className="mt-8 border-t border-b border-[var(--dir-rule)]! py-3 text-[var(--dir-ink)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none [&::-webkit-details-marker]:hidden">
        <span className="dir-label text-[var(--dir-muted)]">
          Embed badge · {snippets.label}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={snippets.path}
          alt={snippets.alt}
          width={snippets.width}
          height={snippets.height}
          loading="lazy"
          decoding="async"
          className="block h-6 w-auto shrink-0"
        />
      </summary>

      <div className="pt-4 pb-1 space-y-2">
        <p className="text-[15px] text-[var(--dir-muted)] leading-snug">
          Drop this static SVG badge into your README or docs to link straight to this listing. Served
          from CDN with no tracking.{' '}
          <Link href="/stats#badges" className="inline-link">
            See all badge tiers
          </Link>
          .
        </p>
        <CopyBlock
          label="Markdown"
          text={snippets.markdown}
          what="the Markdown badge snippet"
          event="badge_copy"
          data={{ slug: agent.slug, tier: snippets.tier, format: 'markdown' }}
        />
        <CopyBlock
          label="HTML"
          text={snippets.html}
          what="the HTML badge snippet"
          event="badge_copy"
          data={{ slug: agent.slug, tier: snippets.tier, format: 'html' }}
        />
      </div>
    </details>
  );
}
