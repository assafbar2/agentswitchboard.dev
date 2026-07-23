import * as fs from 'fs';
import * as path from 'path';
import Link from 'next/link';
import { PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Every addition, removal, and correction to the Agent Switchboard directory.',
  alternates: { canonical: '/changelog' },
};

interface ChangelogEntry {
  action: 'added' | 'removed' | 'updated';
  slug: string;
  name: string;
  note?: string;
  date?: string;
}

const ICONS = {
  added: <PlusCircle className="w-4 h-4 text-[var(--accent)]" />,
  removed: <MinusCircle className="w-4 h-4 text-[var(--rose)]" />,
  updated: <RefreshCw className="w-4 h-4 text-[var(--blue)]" />,
};

export default function ChangelogPage() {
  const raw = fs.readFileSync(path.join(process.cwd(), 'content', 'changelog.json'), 'utf8');
  const entries: ChangelogEntry[] = JSON.parse(raw);

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Changelog</h1>
            <p className="text-[var(--text-secondary)]">
              Every addition, removal, and correction — the directory is
              maintained in the open.
            </p>
          </div>

          <div className="space-y-3">
            {entries.map((e, i) => (
              <div key={`${e.slug}-${e.action}-${i}`} className="card p-4 flex items-start gap-3">
                <div className="mt-0.5">{ICONS[e.action]}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.action === 'removed' ? (
                      <span className="mono text-sm font-semibold">{e.name}</span>
                    ) : (
                      <Link href={`/agents/${e.slug}`} className="mono text-sm font-semibold hover:text-[var(--accent)] transition-colors">
                        {e.name}
                      </Link>
                    )}
                    <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{e.action}</span>
                    {e.date && <span className="mono text-xs text-[var(--text-muted)]">{e.date}</span>}
                  </div>
                  {e.note && <p className="text-sm text-[var(--text-secondary)] mt-1">{e.note}</p>}
                </div>
              </div>
            ))}
          </div>
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
