import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { AgentIcon } from '@/components/AgentIcon';
import { getEveryAgent } from '@/lib/catalog';
import {
  describeNotes,
  dropAdditions,
  dropHeadline,
  dropHighlights,
  dropSummary,
  getDropSchedule,
  type DropChanges,
  type DropItem,
} from '@/lib/drops';
import { pageMetadata } from '@/lib/metadata';
import { formatDay, formatNumber, pluralize } from '@/lib/utils';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Weekly drops',
      description:
        'Every batch of AI agents added to Agent Switchboard, newest first, with what changed and what left the directory.',
      path: '/drops',
    },
    parent
  );
}

const ROW_ICONS = 6;

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

type PendingItem = DropItem & { action: 'added' | 'updated' | 'removed' };

/** Changes since the newest drop, newest first. */
function pendingItems(pending: DropChanges | null): PendingItem[] {
  if (!pending) return [];
  return [
    ...pending.added.map((item) => ({ ...item, action: 'added' as const })),
    ...pending.updated.map((item) => ({ ...item, action: 'updated' as const })),
    ...pending.removed.map((item) => ({ ...item, action: 'removed' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

export default async function DropsPage() {
  const { drops, pending } = getDropSchedule();
  const catalog = await getEveryAgent();
  const listedSlugs = new Set(catalog.map((a) => a.slug));
  const rows = drops.map((drop) => ({ drop, listed: dropAdditions(drop, catalog).listed }));
  const since = pendingItems(pending);
  const latest = drops[0];

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-3xl">
          <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-6">
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">Weekly drops</h1>
            <p className="text-lg text-[var(--dir-muted)]">
              Every batch of listings added to the directory, newest first, with what changed and what left. Drops
              are built from the{' '}
              <Link href="/changelog#directory-changes" className={inlineLink}>
                directory change log
              </Link>
              , so a new batch gets its page the moment it lands.
            </p>
          </div>

          <section aria-labelledby="since-last-drop" className="mb-10">
            <h2 id="since-last-drop" className="dir-bar">
              Since the last drop <span className="dir-bar-count">· {since.length}</span>
            </h2>
            {since.length > 0 ? (
              <ul>
                {since.map((item) => (
                  <li key={`${item.action}-${item.slug}`} className="border-b border-[var(--dir-rule)]! py-3">
                    <div className="flex min-w-0 items-baseline gap-1.5">
                      {listedSlugs.has(item.slug) ? (
                        <Link
                          href={`/agents/${item.slug}`}
                          className="min-w-0 wrap-break-word text-[17px] font-bold leading-snug text-[var(--dir-ink)] no-underline hover:underline"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <span className="min-w-0 wrap-break-word text-[17px] font-bold leading-snug">{item.name}</span>
                      )}
                      <span
                        aria-hidden="true"
                        className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
                      />
                      <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
                        <span className="dir-label">{item.action}</span>
                        <time dateTime={item.date} className="text-sm font-semibold text-[var(--dir-muted)]">
                          {formatDay(item.date)}
                        </time>
                      </span>
                    </div>
                    {item.action !== 'added' && item.notes.length > 0 && (
                      <p className="mt-0.5 text-[15px] text-[var(--dir-muted)]">{describeNotes(item.notes)}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
                Nothing yet{latest ? `: no listing has changed since the ${formatDay(latest.date)} drop` : ''}.
              </p>
            )}
          </section>

          <section aria-labelledby="all-drops">
            <h2 id="all-drops" className="dir-bar">
              Drops <span className="dir-bar-count">· {drops.length}</span>
            </h2>
            <ul>
              {rows.map(({ drop, listed }) => (
                <li key={drop.date} className="border-b border-[var(--dir-rule)]!">
                  <Link href={`/drops/${drop.date}`} className="group block py-3 text-[var(--dir-ink)] no-underline">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className="text-[19px] font-extrabold leading-snug group-hover:underline">
                        {formatDay(drop.date)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="min-w-4 flex-1 -translate-y-1 border-b-2 border-dotted border-[var(--dir-leader)]!"
                      />
                      <span className="shrink-0 whitespace-nowrap text-[15px] font-bold">
                        {drop.added.length > 0
                          ? `+${formatNumber(drop.added.length)} ${pluralize(drop.added.length, 'agent')}`
                          : dropHeadline(drop)}
                      </span>
                    </span>
                    {listed.some((a) => a.iconUrl) && (
                      <span className="mt-1.5 flex gap-1">
                        {dropHighlights(
                          listed.filter((a) => a.iconUrl),
                          ROW_ICONS
                        ).map((agent) => (
                          <AgentIcon key={agent.slug} name={agent.name} iconUrl={agent.iconUrl} />
                        ))}
                      </span>
                    )}
                    <span className="mt-1 block text-[15px] leading-snug text-[var(--dir-muted)]">
                      {dropSummary(drop, listed)}
                    </span>
                  </Link>
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
            <div className="agent-accent text-base font-bold mb-1">/drops</div>
            <div className="agent-dim text-xs">
              {drops.length} drops · newest first · grouped from the directory entries on /changelog
            </div>
          </div>

          <div className="agent-section-title">since the last drop</div>
          {since.length > 0 ? (
            since.map((item) => (
              <div key={`${item.action}-${item.slug}`} className="agent-row">
                <span className="agent-accent">{item.slug}</span>
                <span className="agent-dim">{item.action}</span>
                <span className="agent-dim">{item.date}</span>
              </div>
            ))
          ) : (
            <div className="agent-dim text-xs">none</div>
          )}

          <div className="agent-section-title">drops</div>
          {drops.map((drop) => (
            <Link key={drop.date} href={`/drops/${drop.date}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">/drops/{drop.date}</span>
              <span className="agent-dim">
                +{drop.added.length} added · {drop.updated.length} updated · {drop.removed.length} removed
              </span>
              <span className="agent-dim">{drop.days.length > 1 ? `${drop.days[0]}..${drop.days[drop.days.length - 1]}` : drop.date}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
