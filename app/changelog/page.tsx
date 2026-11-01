import * as fs from 'fs';
import * as path from 'path';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { getReleases, releaseAnchor } from '@/lib/changelog';
import { inlineMarkdownToText } from '@/lib/inline-markdown';
import { InlineMarkdown } from '@/components/InlineMarkdown';
import { formatDay } from '@/lib/utils';
import type { ChangelogEntry } from '@/lib/types';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Changelog',
      description: 'Every Agent Switchboard release, and every addition, removal, and correction to the directory.',
      path: '/changelog',
    },
    parent
  );
}

const GITHUB_CHANGELOG = 'https://github.com/assafbar2/agentswitchboard.dev/blob/main/CHANGELOG.md';

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default function ChangelogPage() {
  const raw = fs.readFileSync(path.join(process.cwd(), 'content', 'changelog.json'), 'utf8');
  const entries: ChangelogEntry[] = JSON.parse(raw);
  const releases = getReleases();

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 pb-6 border-b-[3px] border-[var(--dir-ink)]!">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">Changelog</h1>
            <p className="text-lg text-[var(--dir-muted)]">
              Every release of the site, then every addition, removal, and correction to the directory —
              maintained in the open. The release notes are also on GitHub as{' '}
              <a href={GITHUB_CHANGELOG} target="_blank" rel="noopener noreferrer" className={inlineLink}>
                CHANGELOG.md
              </a>
              .
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] font-semibold">
              <a href="#releases" className={inlineLink}>
                Site releases
              </a>
              <a href="#directory-changes" className={inlineLink}>
                Directory changes
              </a>
              <Link href="/drops" className={inlineLink}>
                Weekly drops
              </Link>
            </p>
          </div>

          {/* Releases: version and title, dotted leader, date; then the notes by section */}
          <section aria-labelledby="releases" className="mb-14">
            <h2 id="releases" className="dir-bar scroll-mt-24">
              Site releases <span className="dir-bar-count">· {releases.length}</span>
            </h2>
            {releases.map((release) => (
              <article
                key={release.version}
                id={releaseAnchor(release.version)}
                className="scroll-mt-24 border-b border-[var(--dir-rule)]! py-5"
              >
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <h3 className="min-w-0 wrap-break-word text-[20px] font-extrabold leading-snug">
                    <a href={`#${releaseAnchor(release.version)}`} className="text-[var(--dir-ink)] no-underline hover:underline">
                      {release.version}
                    </a>
                    <span className="font-bold"> · {release.title}</span>
                  </h3>
                  <span
                    aria-hidden="true"
                    className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
                  />
                  <time dateTime={release.date} className="shrink-0 whitespace-nowrap text-sm font-semibold text-[var(--dir-muted)]">
                    {formatDay(release.date)}
                  </time>
                </div>
                {release.sections.map((section) => (
                  <div key={section.name} className="mt-3">
                    <h4 className="dir-label text-[var(--dir-muted)]">{section.name}</h4>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-[16px] leading-snug marker:text-[var(--dir-muted)]">
                      {section.items.map((item, i) => (
                        <li key={i}>
                          <InlineMarkdown text={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </article>
            ))}
          </section>

          {/* Directory changes: one ruled entry per change, name, dotted leader, action and date */}
          <section aria-labelledby="directory-changes">
            <h2 id="directory-changes" className="dir-bar scroll-mt-24">
              Directory changes <span className="dir-bar-count">· {entries.length}</span>
            </h2>
            <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
              The same changes, batch by batch with icons and one-liners, are on{' '}
              <Link href="/drops" className={inlineLink}>
                the weekly drops
              </Link>
              .
            </p>
            <ul>
              {entries.map((e, i) => (
                <li key={`${e.slug}-${e.action}-${i}`} className="border-b border-[var(--dir-rule)]! py-3">
                  <div className="flex min-w-0 items-baseline gap-1.5">
                    {e.action === 'removed' ? (
                      <span className="min-w-0 wrap-break-word text-[17px] font-bold leading-snug">
                        {e.name}
                      </span>
                    ) : (
                      <Link
                        href={`/agents/${e.slug}`}
                        className="min-w-0 wrap-break-word text-[17px] font-bold leading-snug text-[var(--dir-ink)] no-underline hover:underline"
                      >
                        {e.name}
                      </Link>
                    )}
                    <span
                      aria-hidden="true"
                      className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
                    />
                    <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
                      <span className="dir-label">{e.action}</span>
                      {e.date && <span className="text-sm font-semibold text-[var(--dir-muted)]">{e.date}</span>}
                    </span>
                  </div>
                  {e.note && <p className="text-[15px] text-[var(--dir-muted)] mt-0.5">{e.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/changelog</div>
            <div className="agent-dim text-xs">
              {releases.length} releases · {entries.length} directory entries · newest first · source: CHANGELOG.md
            </div>
          </div>
          <div className="agent-section-title">releases</div>
          {releases.map((release) => (
            <div key={release.version} className="mb-3">
              <div className="agent-row">
                <span className="agent-accent">{release.version}</span>
                <span className="agent-dim">{release.title}</span>
                <span className="agent-dim">{release.date}</span>
              </div>
              {release.sections.flatMap((section) =>
                section.items.map((item, i) => (
                  <div key={`${section.name}-${i}`} className="agent-dim text-xs leading-relaxed pl-4">
                    {section.name.toLowerCase()}: {inlineMarkdownToText(item)}
                  </div>
                ))
              )}
            </div>
          ))}
          <div className="agent-section-title">directory entries</div>
          {entries.map((e, i) => (
            <div key={`${e.slug}-${e.action}-${i}`} className="agent-row">
              <span className="agent-accent">{e.action}</span>
              <span className="agent-dim">{e.slug}</span>
              <span className="agent-dim">{e.date ?? ''} {e.note ?? ''}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
