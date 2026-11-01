import Link from 'next/link';
import { X } from 'lucide-react';
import { AgentCard } from '@/components/AgentCard';
import { FILTER_BASE, FILTER_OFF } from '@/components/filter-chip';
import { RecoveryEvents } from '@/components/RecoveryEvents';
import { constraintLabel, type Preview, type Recovery } from '@/lib/recovery';
import { browseStateHref, narrowingWords, type BrowseState, type SortOrder } from '@/lib/search';

interface Props {
  state: BrowseState;
  recovery: Recovery;
  sort: SortOrder;
  /** Display names of the category and vendor filters. */
  names: { category?: string; vendor?: string };
}

/** “a” · “a” or “b” · “a”, “b” or “c” */
function wordList(words: string[]): string {
  const quoted = words.map((w) => `“${w}”`);
  return quoted.length > 1 ? `${quoted.slice(0, -1).join(', ')} or ${quoted[quoted.length - 1]}` : quoted[0];
}

const results = (n: number) => `${n} result${n === 1 ? '' : 's'}`;

function filterCount(state: BrowseState): number {
  return (
    state.access.length +
    Number(!!state.category) +
    Number(state.official || !!state.vendor) +
    Number(state.verified) +
    Number(state.auth.length > 0)
  );
}

function previewTitle(preview: Preview, names: Props['names']): string {
  switch (preview.kind) {
    case 'spelling':
      return `Results for “${preview.state.query}”`;
    case 'closest':
      return 'Closest matches';
    case 'unfiltered':
      return `Closest matches, without ${constraintLabel(preview.without, names)}`;
  }
}

/** The /browse empty state: why nothing matched, and the ways back from lib/recovery.ts. */
export function NoResults({ state, recovery, sort, names }: Props) {
  const { unknown, removals, preview, categories } = recovery;
  const href = (s: BrowseState) => browseStateHref(s, sort);
  return (
    <RecoveryEvents
      offer={preview?.kind ?? (removals.length > 0 ? 'removal' : 'categories')}
      words={narrowingWords(state.query).length}
      filters={filterCount(state)}
    >
      <div className="py-10 border-b border-[var(--dir-rule)]!">
        <p className="text-lg font-bold mb-2">
          No agents found{state.query && <> matching <span>&ldquo;{state.query}&rdquo;</span></>}
        </p>
        {unknown.length > 0 && (
          <p className="mb-4 text-[var(--dir-muted)]">Nothing in the directory mentions {wordList(unknown)}.</p>
        )}

        {preview?.kind === 'spelling' && (
          <p className="mb-6 text-lg" data-recovery="spelling">
            Did you mean{' '}
            <Link href={href(preview.state)} className="font-bold">
              {preview.state.query}
            </Link>
            ? <span className="text-[var(--dir-muted)]">{results(preview.total)}</span>
          </p>
        )}

        {removals.length > 0 && (
          <div className="mb-8">
            <p className="dir-label mb-2 text-[var(--dir-muted)]">Try without</p>
            <ul className="flex flex-wrap gap-2" data-recovery="removal">
              {removals.map((r) => (
                <li key={`${r.what}:${r.value}`}>
                  <Link href={href(r.state)} data-what={r.what} className={`${FILTER_BASE} ${FILTER_OFF} no-underline`}>
                    <X className="w-3.5 h-3.5" aria-hidden />
                    <span className="sr-only">Remove </span>
                    {constraintLabel(r, names)}{' '}
                    <span className="font-normal normal-case tracking-normal">· {results(r.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {preview && (
          <div className="mb-8" data-recovery={preview.kind === 'spelling' ? 'spelling' : 'closest'}>
            <p className="dir-label mb-1">{previewTitle(preview, names)}</p>
            {preview.kind === 'closest' && (
              <p className="text-[15px] text-[var(--dir-muted)]">Each has some of your words, none has all of them.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10">
              {preview.agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
            {preview.kind !== 'closest' && preview.total > preview.agents.length && (
              <Link href={href(preview.state)} className="dir-row mt-2">
                <span className="dir-row-name">See all {preview.total}</span>
                <span className="dir-row-leader" aria-hidden="true" />
                <span className="dir-row-meta" aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        )}

        <p className="mb-2" data-recovery="category">
          Or browse a category:{' '}
          {categories.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ' · '}
              <Link href={`/categories/${c.slug}`} className="font-bold">
                {c.name}
              </Link>{' '}
              <span className="text-[var(--dir-muted)]">({c.agentCount})</span>
            </span>
          ))}
        </p>
        <p className="text-[var(--dir-muted)]" data-recovery="submit">
          Know a tool that should be here?{' '}
          <Link href="/submit" className="font-bold text-[var(--dir-ink)]">
            Suggest a listing
          </Link>
          .
        </p>
      </div>
    </RecoveryEvents>
  );
}

/** The same ways back for the text-only view. */
export function NoResultsText({ state, recovery, sort }: Omit<Props, 'names'>) {
  const { unknown, removals, preview, categories } = recovery;
  const href = (s: BrowseState) => browseStateHref(s, sort);
  return (
    <div className="agent-dim py-8 text-xs">
      <div>{state.query ? `no agents matched "${state.query}"` : 'no agents found'}</div>
      {unknown.length > 0 && <div>not in the directory: {unknown.join(', ')}</div>}
      {preview?.kind === 'spelling' && (
        <div>
          did you mean: <Link href={href(preview.state)}>{href(preview.state)}</Link> ({preview.total})
        </div>
      )}
      {removals.map((r) => (
        <div key={`${r.what}:${r.value}`}>
          without {r.what}
          {r.value && ` ${r.value}`}: <Link href={href(r.state)}>{href(r.state)}</Link> ({r.count})
        </div>
      ))}
      {preview && preview.kind !== 'spelling' && (
        <div>closest: {preview.agents.map((a) => a.slug).join(', ')}</div>
      )}
      <div>
        categories:{' '}
        {categories.map((c, i) => (
          <span key={c.slug}>
            {i > 0 && ', '}
            <Link href={`/categories/${c.slug}`}>{c.slug}</Link>
          </span>
        ))}
      </div>
    </div>
  );
}
