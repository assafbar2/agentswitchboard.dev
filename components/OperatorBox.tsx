'use client';

/**
 * The Operator's request box, on the homepage and /operator. As you type,
 * the line under it says which parts it will put through and the task each
 * names (lib/request-parts.ts); "Put me through" opens /operator with the
 * request, which a browser without JavaScript does with the form's own GET.
 * Counts `operator_submit` with how many parts there are and how many name a
 * task, never the words.
 */

import { Fragment, useId, useMemo, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { count } from '@/lib/analytics';
import { OPERATOR_EXAMPLES, operatorHref, PARTS_MAX, REQUEST_MAX, requestParts } from '@/lib/request-parts';
import type { TaskTerms } from '@/lib/task-match';
import { pluralize } from '@/lib/utils';

const LABEL = 'dir-label mb-1.5 text-[15px] font-bold uppercase tracking-[0.12em]';

export function OperatorBox({
  tasks,
  label,
  headingId,
  initial = '',
  from,
}: {
  tasks: TaskTerms[];
  /** The box's label; with `headingId`, the section's heading too. */
  label: string;
  headingId?: string;
  initial?: string;
  from: 'home' | 'operator';
}) {
  const router = useRouter();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const [value, setValue] = useState(initial);
  const { text, parts, extra, cut } = useMemo(() => requestParts(value, tasks), [value, tasks]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text) return router.push('/operator');
    count('operator_submit', { from, parts: parts.length, tasks: parts.filter((p) => p.task).length });
    router.push(operatorHref(text));
  }

  // Enter sends the request, as in a chat box; Shift+Enter starts a new line, which ends a part.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const labelled = <label htmlFor={inputId}>{label}</label>;
  return (
    <form onSubmit={submit} action="/operator" className="w-full">
      {headingId ? (
        <h2 id={headingId} className={LABEL}>
          {labelled}
        </h2>
      ) : (
        <p className={LABEL}>{labelled}</p>
      )}
      <div className="flex flex-col border-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--dir-ink)] sm:flex-row">
        <textarea
          id={inputId}
          name="q"
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={OPERATOR_EXAMPLES[0]}
          autoComplete="off"
          enterKeyHint="go"
          aria-describedby={hintId}
          className="min-h-[64px] w-full min-w-0 flex-1 resize-none rounded-none border-0 bg-transparent px-3.5 py-2.5 text-[19px] leading-snug text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] outline-none"
        />
        <button
          type="submit"
          className="min-h-[46px] shrink-0 cursor-pointer rounded-none border-0 border-t-[3px] border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-5 text-[17px] font-extrabold text-[var(--dir-on-yellow)] hover:underline focus-visible:outline-2 focus-visible:-outline-offset-6 focus-visible:outline-[var(--dir-on-yellow)] sm:border-t-0 sm:border-l-[3px]"
        >
          Put me through
        </button>
      </div>
      <div id={hintId} aria-live="polite" className="mt-2 min-h-[2.75rem] text-[15px] leading-snug text-[var(--dir-muted)]">
        {!text ? (
          <p>Say the whole job in your own words. Commas, “then” and “and” split it into parts.</p>
        ) : parts.length === 0 ? (
          <p>Say what to do: “query Postgres”, “ping me on Slack”.</p>
        ) : (
          <p>
            <span aria-hidden="true">→ </span>
            {parts.length} {pluralize(parts.length, 'part')}:{' '}
            {parts.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && ' · '}
                {part.task ? (
                  <strong className="text-[var(--dir-ink)]">{part.task.label}</strong>
                ) : (
                  <>&ldquo;{part.text}&rdquo;, no task yet</>
                )}
              </Fragment>
            ))}
            {extra > 0 && ` · ${extra} more left out: it takes up to ${PARTS_MAX}`}
            {cut && ` · it reads the first ${REQUEST_MAX} characters`}
          </p>
        )}
      </div>
    </form>
  );
}

/**
 * Counts what is opened from the Operator's results and examples, with one
 * listener: `operator_fallback_task_click` for a task offered to a part that
 * named none (a link with data-fallback-task), and `operator_submit` for an
 * example request (data-example).
 */
export function OperatorEvents({ from, children }: { from: 'home' | 'operator'; children: ReactNode }) {
  function onClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as Element).closest('a[href]');
    const task = link?.getAttribute('data-fallback-task');
    if (task) count('operator_fallback_task_click', { task, from });
    const example = link?.getAttribute('data-example');
    if (example) count('operator_submit', { from, example: Number(example) });
  }

  return <div onClick={onClick}>{children}</div>;
}
