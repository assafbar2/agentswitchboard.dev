'use client';

import { useState, useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { AgentIcon } from '@/components/AgentIcon';
import { count } from '@/lib/analytics';
import { isSuggestIndex, suggest, type Suggestion, type SuggestionKind, type SuggestIndex } from '@/lib/autocomplete';
import { browseHref } from '@/lib/search';
import { pluralize } from '@/lib/utils';

const GROUP_LABELS: Record<SuggestionKind, string> = {
  agent: 'Agents',
  category: 'Categories',
  vendor: 'Official vendors',
};

let loadedIndex: SuggestIndex | null = null;
let indexRequest: Promise<SuggestIndex | null> | undefined;

/** The suggestion index, fetched once per page load. A failed fetch is retried on the next focus. */
function loadIndex(): Promise<SuggestIndex | null> {
  indexRequest ??= fetch('/search-index.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((data: unknown) => {
      if (!isSuggestIndex(data)) throw new Error('bad search index');
      return (loadedIndex = data);
    })
    .catch(() => {
      indexRequest = undefined;
      return null;
    });
  return indexRequest;
}

/** Consecutive suggestions of one kind, with the position of the first. */
function groupsOf(suggestions: Suggestion[]): { kind: SuggestionKind; start: number; items: Suggestion[] }[] {
  const groups: { kind: SuggestionKind; start: number; items: Suggestion[] }[] = [];
  suggestions.forEach((s, i) => {
    const last = groups[groups.length - 1];
    if (last?.kind === s.kind) last.items.push(s);
    else groups.push({ kind: s.kind, start: i, items: [s] });
  });
  return groups;
}

/** Space the sticky header takes, as scroll-mt-20 leaves it for anchors elsewhere. */
const HEADER_CLEARANCE = 80;

// 44px rows on touch screens; a mouse gets 36px, so a full list fits without scrolling.
const OPTION =
  'group flex min-h-11 cursor-pointer items-center gap-3 px-3.5 py-1.5 text-[17px] pointer-fine:min-h-9 pointer-fine:py-1 aria-selected:bg-[var(--dir-yellow)] aria-selected:text-[var(--dir-on-yellow)]';

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search agents, skills, categories...',
  autoFocus = false,
  label,
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Visible label above the box (e.g. "Look it up"). Without one the box keeps its aria-label. */
  label?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const [value, setValue] = useState(defaultValue);
  const [index, setIndex] = useState(loadedIndex);
  const [open, setOpen] = useState(false);
  /** Highlighted option, or -1. The last option, after the suggestions, runs the full search. */
  const [active, setActive] = useState(-1);

  // Follow the URL's query when it changes under a mounted bar (back/forward
  // between searches), so the box never shows a different query than the results.
  const [syncedDefault, setSyncedDefault] = useState(defaultValue);
  if (defaultValue !== syncedDefault) {
    setSyncedDefault(defaultValue);
    setValue(defaultValue);
    setOpen(false);
  }

  const suggestions = useMemo(() => (index ? suggest(index, value) : []), [index, value]);
  const expanded = open && suggestions.length > 0;
  const optionCount = suggestions.length + 1;

  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [expanded, active, listId]);

  // On a phone the box sits mid-screen with the keyboard over the lower half, so
  // scroll just enough to show the list, never taking the box under the header.
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!expanded || !formRef.current || !listRef.current) return;
    const view = window.visualViewport;
    const visibleBottom = view ? view.offsetTop + view.height : window.innerHeight;
    const hidden = listRef.current.getBoundingClientRect().bottom - visibleBottom;
    const room = formRef.current.getBoundingClientRect().top - HEADER_CLEARANCE;
    // The browser rounds a scroll to whole pixels, which could leave a sliver of the list hidden.
    if (hidden > 0 && room > 0) window.scrollBy({ top: Math.min(Math.ceil(hidden), Math.floor(room)) });
  }, [expanded]);

  const submit = useCallback(() => {
    // On /browse, keep the active category/access/official/vendor filters;
    // elsewhere (the homepage hero) start a fresh search. Read at submit time
    // rather than with useSearchParams, which would need a Suspense boundary
    // on the statically rendered homepage.
    const current = window.location.pathname === '/browse' ? window.location.search : '';
    const words = value.trim().split(/\s+/).filter(Boolean).length;
    count('search_submit', { page: window.location.pathname, words });
    setOpen(false);
    router.push(browseHref(value, current));
  }, [value, router]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submit();
    },
    [submit]
  );

  function choose(position: number) {
    const picked = suggestions[position];
    count('autocomplete_select', {
      kind: picked?.kind ?? 'search',
      position: position + 1,
      chars: value.trim().length,
      page: window.location.pathname,
    });
    setActive(-1);
    if (!picked) return submit();
    setOpen(false);
    // A category or vendor view has no search text, so the box must not keep any.
    if (picked.kind !== 'agent') setValue('');
    router.push(picked.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      const down = e.key === 'ArrowDown';
      if (!expanded) {
        setOpen(true);
        setActive(down ? 0 : optionCount - 1);
      } else {
        setActive(down ? (active + 1) % optionCount : active <= 0 ? optionCount - 1 : active - 1);
      }
    } else if (e.key === 'Enter' && expanded && active >= 0) {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape' && expanded) {
      // Only closes the list: the browser's own Esc would also clear the box.
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const optionProps = (position: number) => ({
    id: `${listId}-${position}`,
    role: 'option',
    'aria-selected': position === active,
    onClick: () => choose(position),
    onMouseMove: () => setActive(position),
  });

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      role="search"
      className="relative w-full [font-family:var(--font-display)]"
    >
      {label && (
        <label
          htmlFor={inputId}
          className="dir-label mb-1.5 block text-[14px] font-bold uppercase tracking-[0.1em] text-[var(--dir-ink)]"
        >
          {label}
        </label>
      )}
      <div className="flex border-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--dir-ink)]">
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            void loadIndex().then((loaded) => loaded && setIndex(loaded));
          }}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label ? undefined : 'Search the directory'}
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="min-h-[50px] min-w-0 flex-1 rounded-none border-0 bg-transparent px-3.5 text-[19px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] outline-none"
        />
        <button
          type="submit"
          className="min-h-[50px] min-w-[64px] shrink-0 cursor-pointer rounded-none border-0 border-l-[3px] border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-5 text-[17px] font-extrabold text-[var(--dir-on-yellow)] hover:underline focus-visible:outline-2 focus-visible:-outline-offset-6 focus-visible:outline-[var(--dir-on-yellow)]"
        >
          Find
        </button>
      </div>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!expanded}
        // Keeps focus in the box, so picking an option does not close the list first.
        onMouseDown={(e) => e.preventDefault()}
        className="absolute inset-x-0 top-full z-30 max-h-[min(36rem,70vh)] overflow-y-auto border-[3px] border-t-0 border-[var(--dir-ink)]! bg-[var(--dir-paper)] pb-1 text-[var(--dir-ink)]"
      >
        {expanded && (
          <>
            {groupsOf(suggestions).map(({ kind, start, items }) => (
              <div key={kind} role="group" aria-labelledby={`${listId}-${kind}`}>
                <div
                  id={`${listId}-${kind}`}
                  role="presentation"
                  className="px-3.5 pt-2.5 pb-1 text-[13px] font-bold uppercase tracking-[0.1em] text-[var(--dir-muted)]"
                >
                  {GROUP_LABELS[kind]}
                </div>
                {items.map((s, i) => (
                  <div key={s.href} {...optionProps(start + i)} className={OPTION}>
                    {s.kind === 'agent' && <AgentIcon name={s.name} iconUrl={s.iconUrl} lazy={false} />}
                    <span className="min-w-0 truncate">{s.name}</span>
                    {s.count !== undefined && (
                      <>
                        {' '}
                        <span className="ml-auto shrink-0 pl-3 text-[15px] tabular-nums text-[var(--dir-muted)] group-aria-selected:text-[var(--dir-on-yellow)]">
                          {s.count}
                          <span className="sr-only"> {pluralize(s.count, 'agent')}</span>
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div {...optionProps(suggestions.length)} className={`${OPTION} mt-1 border-t border-[var(--dir-rule)]`}>
              <Search aria-hidden="true" size={18} className="shrink-0" />
              <span className="min-w-0 truncate">Search for &ldquo;{value.trim()}&rdquo;</span>
            </div>
          </>
        )}
      </div>
    </form>
  );
}
