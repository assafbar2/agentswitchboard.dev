import Link from '@/components/Link';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { CopyButton } from '@/components/CopyButton';
import { EndpointLink } from '@/components/EndpointLink';
import { Highlights } from '@/components/Highlights';
import { getEveryAgent } from '@/lib/catalog';
import { getReleases, highlightedReleases } from '@/lib/changelog';
import { getDropSchedule } from '@/lib/drops';
import { inlineMarkdownToText } from '@/lib/inline-markdown';
import { pageMetadata } from '@/lib/metadata';
import { whatsNewCard, whatsNewCardImage } from '@/lib/share-cards';
import { getStacks } from '@/lib/stacks';
import { formatDay } from '@/lib/utils';
import { highlightRows, whatsNewEntries } from '@/lib/whats-new';

const SITE = 'https://agentswitchboard.dev';

const FEEDS = [
  { path: '/feed.xml', format: 'RSS' },
  { path: '/atom.xml', format: 'Atom' },
] as const;

const DESCRIPTION =
  "What you can do on Agent Switchboard that you couldn't before, release by release and drop by drop, each with a link to try it.";

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const [latest] = highlightedReleases(getReleases());
  return pageMetadata(
    {
      title: "What's new",
      description: DESCRIPTION,
      path: '/whats-new',
      image: latest ? whatsNewCardImage(whatsNewCard(latest)) : undefined,
    },
    parent
  );
}

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default async function WhatsNewPage() {
  const releases = highlightedReleases(getReleases());
  if (releases.length === 0) notFound();
  const oldest = releases[releases.length - 1];
  const entries = whatsNewEntries(releases, getDropSchedule().drops, getStacks(), await getEveryAgent());

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl">
          <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">
              What&apos;s new
            </h1>
            <p className="text-lg text-[var(--dir-muted)]">
              What you can do on the site that you couldn&apos;t before, and what each weekly drop added, newest
              first, each with a link to try it. The listings added lately are on{' '}
              <Link href="/new" className={inlineLink}>
                New listings
              </Link>
              , and every detail of every release is in the{' '}
              <Link href="/changelog#releases" className={inlineLink}>
                changelog
              </Link>
              .
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-semibold">
              {entries.map((e) => (
                <a key={e.id} href={`#${e.anchor}`} className={inlineLink}>
                  {e.kind === 'release' ? e.label : formatDay(e.date).replace(/, \d{4}$/, '')}
                </a>
              ))}
              <a href="#follow" className={inlineLink}>
                Follow along
              </a>
            </p>
          </div>

          {entries.map((entry) => (
            <section key={entry.id} aria-labelledby={entry.anchor} className="mb-10">
              <h2 id={entry.anchor} className="dir-bar scroll-mt-24">
                {entry.label} · {entry.title}{' '}
                <span className="dir-bar-count">
                  · <time dateTime={entry.date}>{formatDay(entry.date)}</time>
                </span>
              </h2>
              <Highlights rows={highlightRows([entry])} from="whats-new" />
              <p className="mt-2 text-[15px]">
                <Link href={entry.more.href} className={inlineLink}>
                  {entry.more.label}
                </Link>
              </p>
            </section>
          ))}

          <section aria-labelledby="follow" className="mb-10">
            <h2 id="follow" className="dir-bar scroll-mt-24">
              Follow along
            </h2>
            <p className="mt-2 text-[16px] leading-snug">
              Get each release and each weekly drop in your feed reader: paste one of these addresses into it.
            </p>
            <ul className="mt-1">
              {FEEDS.map(({ path, format }) => (
                <li
                  key={path}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--dir-rule)]! py-2.5"
                >
                  <span className="w-12 text-[15px] font-bold">{format}</span>
                  <EndpointLink href={path} className={`mono min-w-0 text-[14px] break-all ${inlineLink}`}>
                    {SITE}
                    {path}
                  </EndpointLink>
                  <CopyButton text={`${SITE}${path}`} what={`the ${format} feed address`} event="feed_copy" data={{ format }} />
                </li>
              ))}
            </ul>
          </section>

          <p className="border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold">
            <Link href="/changelog#releases" className="text-[var(--dir-ink)] no-underline hover:underline">
              Every release, including those before {oldest.version}
              <span aria-hidden="true"> →</span>
            </Link>
          </p>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/whats-new</div>
            <div className="agent-dim text-xs">
              what you can do on the site that you couldn&apos;t before, release by release since {oldest.version},
              and each weekly drop · each line is a feature and the page to try it
            </div>
          </div>

          {entries.map((entry) => (
            <div key={entry.id}>
              <div className="agent-section-title">
                {entry.label} · {entry.title} · {entry.date}
              </div>
              {entry.highlights.map((h, i) => (
                <Link key={i} href={h.tryIt} className="agent-row agent-row-stack no-underline hover:underline">
                  <span className="agent-accent">{h.tryIt}</span>
                  <span className="agent-dim">{inlineMarkdownToText(h.text)}</span>
                  <span className="agent-dim" />
                </Link>
              ))}
            </div>
          ))}

          <div className="agent-section-title">feeds</div>
          {FEEDS.map(({ path, format }) => (
            <EndpointLink key={path} href={path} className="agent-row no-underline hover:underline">
              <span className="agent-accent">{path}</span>
              <span className="agent-dim">{format}: every release and weekly drop, newest first</span>
              <span className="agent-dim" />
            </EndpointLink>
          ))}

          <div className="agent-section-title">more</div>
          <Link href="/changelog#releases" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/changelog</span>
            <span className="agent-dim">every release in full, then every directory change</span>
            <span className="agent-dim" />
          </Link>
          <Link href="/new" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/new</span>
            <span className="agent-dim">the listings added lately</span>
            <span className="agent-dim" />
          </Link>
        </div>
      </div>
    </>
  );
}
