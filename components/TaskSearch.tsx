'use client';

/**
 * The homepage's "I need an agent to…" box. What is typed goes to the task
 * that names it (lib/task-match.ts), as a task chip would, or else runs as
 * a search. The line under the box says which before Go, with the closest
 * other tasks. Counts `task_search` for what Go does and `task_select` for a
 * task picked from that line, never with the text.
 */

import { Fragment, useId, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { count } from '@/lib/analytics';
import { browseHref } from '@/lib/search';
import { pickTask, rankTasks, type TaskTerms } from '@/lib/task-match';
import { pluralize } from '@/lib/utils';

export interface TaskChoice extends TaskTerms {
  /** Listings that fit it. */
  count: number;
}

/** Other tasks the line under the box offers. */
const CLOSE_TASKS = 2;

const taskHref = (slug: string) => `/browse?task=${encodeURIComponent(slug)}`;

const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export function TaskSearch({ tasks, headingId }: { tasks: TaskChoice[]; headingId: string }) {
  const router = useRouter();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const [value, setValue] = useState('');
  const text = value.trim();
  const ranked = useMemo(() => rankTasks(text, tasks), [text, tasks]);
  const match = pickTask(ranked);
  const others = ranked.filter(({ task }) => task !== match).slice(0, CLOSE_TASKS);
  const words = text.split(/\s+/).filter(Boolean).length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text) return router.push('/tasks');
    count('task_search', match ? { matched: true, task: match.slug, words } : { matched: false, words });
    router.push(match ? taskHref(match.slug) : browseHref(text));
  }

  return (
    // The action is for a browser without JavaScript: the words run as a search.
    <form onSubmit={submit} action="/browse" className="w-full">
      <h2 id={headingId} className="dir-label mb-1.5 text-[15px] font-bold uppercase tracking-[0.12em]">
        <label htmlFor={inputId}>I need an agent to…</label>
      </h2>
      <div className="flex border-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--dir-ink)]">
        <input
          id={inputId}
          name="q"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="read my email"
          autoComplete="off"
          enterKeyHint="go"
          aria-describedby={hintId}
          className="min-h-[50px] min-w-0 flex-1 rounded-none border-0 bg-transparent px-3.5 text-[19px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] outline-none"
        />
        <button
          type="submit"
          className="min-h-[50px] min-w-[64px] shrink-0 cursor-pointer rounded-none border-0 border-l-[3px] border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-5 text-[17px] font-extrabold text-[var(--dir-on-yellow)] hover:underline focus-visible:outline-2 focus-visible:-outline-offset-6 focus-visible:outline-[var(--dir-on-yellow)]"
        >
          Go
        </button>
      </div>
      <div id={hintId} aria-live="polite" className="mt-2 min-h-[2.75rem] text-[15px] leading-snug text-[var(--dir-muted)]">
        {!text ? (
          <p>Say it in your own words, or pick a task.</p>
        ) : (
          <>
            <p>
              <span aria-hidden="true">→ </span>
              {match ? (
                <>
                  Task: <strong className="text-[var(--dir-ink)]">{match.label}</strong> · {match.count}{' '}
                  {pluralize(match.count, 'tool')}
                </>
              ) : (
                <>Searches the directory for &ldquo;{text}&rdquo;</>
              )}
            </p>
            {(match || others.length > 0) && (
              <p className="mt-0.5">
                {match ? 'Not it? ' : 'Or a task: '}
                {others.map(({ task }, i) => (
                  <Fragment key={task.slug}>
                    {i > 0 && ' · '}
                    <Link
                      href={taskHref(task.slug)}
                      onClick={() => count('task_select', { task: task.slug, from: 'task-search' })}
                      className={LINK}
                    >
                      {task.label}
                    </Link>
                  </Fragment>
                ))}
                {match && (
                  <>
                    {others.length > 0 && ' · '}
                    <Link
                      href={browseHref(text)}
                      onClick={() => count('task_search', { matched: false, words, declined: match.slug })}
                      className={LINK}
                    >
                      search the directory instead
                    </Link>
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </form>
  );
}
