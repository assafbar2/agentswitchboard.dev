import * as fs from 'fs';
import * as path from 'path';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Changelog',
      description: 'Every addition, removal, and correction to the Agent Switchboard directory.',
      path: '/changelog',
    },
    parent
  );
}

interface ChangelogEntry {
  action: 'added' | 'removed' | 'updated';
  slug: string;
  name: string;
  note?: string;
  date?: string;
}

export default function ChangelogPage() {
  const raw = fs.readFileSync(path.join(process.cwd(), 'content', 'changelog.json'), 'utf8');
  const entries: ChangelogEntry[] = JSON.parse(raw);

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 pb-6 border-b-[3px] border-[var(--dir-ink)]!">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">Changelog</h1>
            <p className="text-lg text-[var(--dir-muted)]">
              Every addition, removal, and correction — the directory is
              maintained in the open.
            </p>
          </div>

          {/* One ruled entry per change: name, dotted leader, action and date */}
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
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/changelog</div>
            <div className="agent-dim text-xs">{entries.length} entries · newest first</div>
          </div>
          <div className="agent-section-title">entries</div>
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
