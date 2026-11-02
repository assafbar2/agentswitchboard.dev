import Link from 'next/link';
import { AgentIcon } from '@/components/AgentIcon';
import { CompareEvents } from '@/components/CompareEvents';
import { CopyButton } from '@/components/CopyButton';
import {
  compareRows,
  compareTitle,
  factLines,
  noteText,
  type CompareNote,
  type CompareValue,
  type CuratedComparison,
} from '@/lib/compare';
import { COMPARE_MAX, compareHref } from '@/lib/compare-link';
import type { Agent } from '@/lib/types';
import { howToUse } from '@/lib/use-it-now';
import { pluralize } from '@/lib/utils';

const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';
const ADD =
  'inline-flex min-h-10 items-center rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-3 text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--dir-ink)] no-underline hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';

/** Longest list a cell shows; the listing's page has the rest. */
const LIST_MAX = 8;

export interface CompareViewProps {
  agents: Agent[];
  /** Requested listings left out, and why. */
  notes: CompareNote[];
  /** The curated comparison these listings make, if they make one. */
  curated: CuratedComparison | null;
  /** Listings to add while there is room: lib/compare.ts compareSuggestions. */
  suggestions: Agent[];
  /** Every curated comparison, listed at the foot of the page. */
  comparisons: CuratedComparison[];
  /** This page's path: the curated page's, or the /compare link's. */
  path: string;
  /** The absolute address to share. */
  url: string;
}

function Value({ value }: { value: CompareValue }) {
  if (typeof value === 'string') return <>{value}</>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[var(--dir-muted)]">None listed</span>;
    const more = value.length - LIST_MAX;
    return (
      <>
        {value.slice(0, LIST_MAX).join(', ')}
        {more > 0 && `, and ${more} more`}
      </>
    );
  }
  return (
    <>
      {value.note && <span className="dir-label block text-[12px] text-[var(--dir-muted)]">{value.note}</span>}
      <code className="mono text-[13px] font-bold break-all">{value.code}</code>
    </>
  );
}

function valueText(value: CompareValue): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ') || '—';
  return value.note ? `${value.note}: ${value.code}` : value.code;
}

function UseCell({ agent }: { agent: Agent }) {
  const cursor = howToUse(agent).mcp?.cursorInstallUrl;
  return (
    <div className="flex flex-col items-start gap-2">
      {cursor && (
        <a href={cursor} data-useit="deeplink" data-client="cursor" data-slug={agent.slug} aria-label={`Add ${agent.name} to Cursor`} className={ADD}>
          Add to Cursor
        </a>
      )}
      <Link href={`/agents/${agent.slug}#use-it-now`} className={LINK}>
        Set it up<span className="sr-only">: {agent.name}</span>
        <span aria-hidden="true"> →</span>
      </Link>
    </div>
  );
}

function CompareTable({ agents }: { agents: Agent[] }) {
  const rows = compareRows(agents);
  const facts = factLines(agents);
  const without = (slug: string) => compareHref(agents.filter((a) => a.slug !== slug).map((a) => a.slug));
  return (
    <div className="mb-10 overflow-x-auto">
      <table className="cmp-table" data-cols={agents.length}>
        <caption className="sr-only">{compareTitle(agents)}, side by side</caption>
        <thead>
          <tr>
            <td />
            {agents.map((a) => (
              <th key={a.slug} scope="col">
                <Link href={`/agents/${a.slug}`} className="group flex min-w-0 items-start gap-2 text-[var(--dir-ink)] no-underline">
                  <AgentIcon name={a.name} iconUrl={a.iconUrl} lazy={false} className="mt-0.5" />
                  <span className="min-w-0 text-[19px] font-extrabold leading-tight wrap-break-word group-hover:underline">{a.name}</span>
                </Link>
                <span className="mt-1 block text-[15px] font-semibold text-[var(--dir-muted)]">by {a.providerName}</span>
                <Link href={without(a.slug)} className={`${LINK} mt-1 inline-block text-[14px]`}>
                  Remove<span className="sr-only"> {a.name} from this comparison</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {facts.some((lines) => lines.length > 0) && (
            <tr>
              <th scope="row">Sets it apart</th>
              {facts.map((lines, i) => (
                <td key={agents[i].slug}>
                  {lines.length > 0 ? (
                    <ul className="space-y-1 font-semibold">
                      {lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[var(--dir-muted)]">—</span>
                  )}
                </td>
              ))}
            </tr>
          )}
          {rows.map((row) =>
            row.same ? (
              <tr key={row.key} className="cmp-same">
                <th scope="row">{row.label}</th>
                <td colSpan={agents.length}>
                  <Value value={row.values[0]} />
                  <span className="dir-label ml-2 text-[12px]">Same for all</span>
                </td>
              </tr>
            ) : (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, i) => (
                  <td key={agents[i].slug}>
                    <Value value={value} />
                  </td>
                ))}
              </tr>
            )
          )}
          <tr>
            <th scope="row">Use it now</th>
            {agents.map((a) => (
              <td key={a.slug}>
                <UseCell agent={a} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Suggestions({ agents, suggestions }: { agents: Agent[]; suggestions: Agent[] }) {
  const slugs = agents.map((a) => a.slug);
  const heading = agents.length === 1 ? `Compare ${agents[0].name} with` : 'Add a third';
  return (
    <section aria-labelledby="compare-add" className="mb-10">
      <h2 id="compare-add" className="dir-bar">
        {heading}
      </h2>
      <ul>
        {suggestions.map((s) => (
          <li key={s.slug}>
            <Link href={compareHref([...slugs, s.slug])} className="dir-row">
              <AgentIcon name={s.name} iconUrl={s.iconUrl} className="self-center" />
              <span className="dir-row-name">{s.name}</span>
              <span className="dir-row-leader" aria-hidden="true" />
              <span className="dir-row-meta" aria-hidden="true">
                Compare →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[15px] text-[var(--dir-muted)]">
        {agents.length === 1 ? 'Its closest alternatives, strongest match first.' : `The closest alternatives to ${agents[0].name} not shown yet.`}
      </p>
    </section>
  );
}

function Share({ url, n }: { url: string; n: number }) {
  return (
    <section aria-labelledby="compare-share" className="mb-10">
      <h2 id="compare-share" className="dir-bar">
        Share this comparison
      </h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <code className="mono min-w-0 break-all text-[14px] font-bold">{url}</code>
        <CopyButton text={url} what="the link to this comparison" event="compare_share" data={{ n }} />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="compare-how" className="mb-10">
      <h2 id="compare-how" className="dir-bar">
        How it works
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-[17px]">
        <li>
          Press <span className="font-bold">Compare</span> on any listing&apos;s card or page. Up to {COMPARE_MAX} wait in the tray at the
          bottom of the window, on every page.
        </li>
        <li>Open them from the tray, side by side. Rows where they differ say how; rows where they agree are shown once.</li>
        <li>
          Or start from a listing&apos;s page: <span className="font-bold">Compare with</span> puts it beside its closest alternatives.
        </li>
      </ol>
      <p className="mt-4">
        <Link href="/browse" className={LINK}>
          Browse the directory<span aria-hidden="true"> →</span>
        </Link>
      </p>
    </section>
  );
}

function CuratedList({ comparisons, heading }: { comparisons: CuratedComparison[]; heading: string }) {
  return (
    <section aria-labelledby="compare-curated" className="mb-10">
      <h2 id="compare-curated" className="dir-bar">
        {heading} <span className="dir-bar-count">· {comparisons.length}</span>
      </h2>
      <ul>
        {comparisons.map((c) => (
          <li key={c.slug} className="border-b border-[var(--dir-rule)]! py-3">
            <Link href={`/compare/${c.slug}`} className="group flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[var(--dir-ink)] no-underline">
              <span className="flex shrink-0 gap-1" aria-hidden="true">
                {c.agents.map((a) => (
                  <AgentIcon key={a.slug} name={a.name} iconUrl={a.iconUrl} />
                ))}
              </span>
              <span className="min-w-0 text-[17px] font-bold leading-snug group-hover:underline">{compareTitle(c.agents)}</span>
            </Link>
            <p className="mt-1 text-[15px] leading-snug text-[var(--dir-muted)]">{c.intro}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The compare page: /compare?a=&b=&c= and the curated /compare/<a>-vs-<b>, from lib/compare.ts. */
export function CompareView({ agents, notes, curated, suggestions, comparisons, path, url }: CompareViewProps) {
  const slugs = agents.map((a) => a.slug);
  const compared = agents.length >= 2;
  const others = comparisons.filter((c) => c.slug !== curated?.slug);
  const title = compared ? compareTitle(agents) : agents.length === 1 ? `Compare ${agents[0].name}` : 'Compare';
  const lead = curated
    ? curated.intro
    : compared
      ? 'Side by side, from each listing’s own data. A row where every column says the same is shown once, dimmed.'
      : agents.length === 1
        ? `Pick one or two listings to put beside ${agents[0].name}: its closest alternatives are below, or press Compare on any card.`
        : `Put up to ${COMPARE_MAX} listings side by side: what each does, how you connect it, the sign-in it needs and its skills, from each listing’s own data.`;
  const rows = compared ? compareRows(agents) : [];
  const facts = compared ? factLines(agents) : [];

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <CompareEvents slugs={compared ? slugs : []} curated={!!curated}>
          <div className="mx-auto max-w-5xl">
            <header className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
              {curated && <p className="dir-label mb-2 text-[var(--dir-muted)]">Comparison</p>}
              <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] wrap-break-word sm:text-5xl">{title}</h1>
              <p className="max-w-3xl text-lg text-[var(--dir-muted)]">{lead}</p>
              {notes.length > 0 && (
                <ul className="mt-4 space-y-1 border-l-4 border-[var(--dir-yellow)]! pl-3 text-[16px] font-semibold">
                  {notes.map((note, i) => (
                    <li key={i}>{noteText(note)}</li>
                  ))}
                </ul>
              )}
            </header>

            {compared && <CompareTable agents={agents} />}
            {suggestions.length > 0 && <Suggestions agents={agents} suggestions={suggestions} />}
            {compared && <Share url={url} n={agents.length} />}
            {agents.length === 0 && <HowItWorks />}
            {others.length > 0 && <CuratedList comparisons={others} heading={agents.length > 0 ? 'More comparisons' : 'Comparisons'} />}
          </div>
        </CompareEvents>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">{path}</div>
            <div className="agent-dim text-xs">
              {compared
                ? `${agents.length} listings side by side${curated ? ' · curated' : ''} · "same" marks a row every column shares`
                : `up to ${COMPARE_MAX} listings side by side: /compare?a=<slug>&b=<slug>&c=<slug>`}
            </div>
          </div>

          {notes.length > 0 && (
            <>
              <div className="agent-section-title">left out</div>
              {notes.map((note, i) => (
                <div key={i} className="agent-row">
                  <span className="agent-accent">{note.slug || '—'}</span>
                  <span className="agent-dim">{note.kind}</span>
                  <span className="agent-dim">{noteText(note)}</span>
                </div>
              ))}
            </>
          )}

          {compared && (
            <>
              <div className="agent-section-title">listings</div>
              {agents.map((a, i) => (
                <Link key={a.slug} href={`/agents/${a.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">{a.slug}</span>
                  <span className="agent-dim">{a.accessMethods.join('+')}</span>
                  <span className="agent-dim">{facts[i].join('; ') || '—'}</span>
                </Link>
              ))}

              <div className="agent-section-title">rows</div>
              {rows.map((row) => (
                <div key={row.key} className="agent-row">
                  <span className="agent-dim">
                    {row.key}
                    {row.same ? ' (same)' : ''}
                  </span>
                  <span className="agent-accent break-all">
                    {row.same ? valueText(row.values[0]) : row.values.map(valueText).join(' | ')}
                  </span>
                  <span />
                </div>
              ))}
            </>
          )}

          {suggestions.length > 0 && (
            <>
              <div className="agent-section-title">{agents.length === 1 ? 'compare with' : 'add a third'}</div>
              {suggestions.map((s) => (
                <Link key={s.slug} href={compareHref([...slugs, s.slug])} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">{compareHref([...slugs, s.slug])}</span>
                  <span className="agent-dim">{s.name}</span>
                  <span />
                </Link>
              ))}
            </>
          )}

          {others.length > 0 && (
            <>
              <div className="agent-section-title">comparisons</div>
              {others.map((c) => (
                <Link key={c.slug} href={`/compare/${c.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">/compare/{c.slug}</span>
                  <span className="agent-dim">
                    {c.agents.length} {pluralize(c.agents.length, 'listing')}
                  </span>
                  <span />
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
