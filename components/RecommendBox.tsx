'use client';

/**
 * The homepage's one box: "What do you need your agent to do?", answered in
 * place by /home/answer (lib/decide.ts recommendDecision, with the task's
 * Featured and Sponsored tools first and labeled): one pick per need, why,
 * the next step and two alternatives. Before anything is typed it
 * shows `example`, a real answer rendered on the server. Without JavaScript
 * the form's own GET opens the same request in the Operator. Counts
 * `recommend_submit` with how many picks came back, never the words.
 */

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from '@/components/Link';
import { RecommendAnswer } from '@/components/RecommendAnswer';
import { count } from '@/lib/analytics';
import type { RecommendBody } from '@/lib/decide';

type Nearest = { slug: string; label: string };
type State =
  | { kind: 'example' }
  | { kind: 'loading'; need: string }
  | { kind: 'answer'; need: string; body: RecommendBody }
  | { kind: 'none'; need: string; message: string; nearest: Nearest[] };

const INLINE_LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export function RecommendBox({
  example,
  exampleNeed,
  headingId,
  links,
}: {
  example: RecommendBody | null;
  exampleNeed: string;
  headingId: string;
  /** The secondary ways in, under the box. */
  links?: ReactNode;
}) {
  const inputId = useId();
  const [value, setValue] = useState('');
  const [state, setState] = useState<State>({ kind: 'example' });
  const latest = useRef(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const need = value.trim();
    if (!need) return setState({ kind: 'example' });
    const ticket = ++latest.current;
    setState({ kind: 'loading', need });
    try {
      const res = await fetch(`/home/answer?need=${encodeURIComponent(need)}`, { headers: { accept: 'application/json' } });
      const data = await res.json();
      if (ticket !== latest.current) return;
      if (res.ok) {
        const body = data as RecommendBody;
        count('recommend_submit', { from: 'home', picks: body.recommendations.length, unmatched: body.unmatched.length });
        setState({ kind: 'answer', need, body });
      } else {
        count('recommend_submit', { from: 'home', picks: 0, error: String(data?.error ?? res.status) });
        const nearest: Nearest[] = (data?.unmatched ?? []).flatMap((u: { nearestTasks?: Nearest[] }) => u.nearestTasks ?? []);
        setState({
          kind: 'none',
          need,
          message: res.status === 429 ? 'Too many requests just now. Try again in a minute.' : String(data?.message ?? 'No pick for that.'),
          nearest: [...new Map(nearest.map((t) => [t.slug, t])).values()].slice(0, 3),
        });
      }
    } catch {
      if (ticket !== latest.current) return;
      setState({ kind: 'none', need, message: 'Could not reach the switchboard. Check your connection and try again.', nearest: [] });
    }
  }

  const shown = state.kind === 'answer' ? state.body : state.kind === 'example' ? example : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <form onSubmit={submit} action="/operator" className="w-full max-w-[52rem]">
        <h2 id={headingId} className="mb-2 text-[22px] font-extrabold leading-tight sm:text-[26px]">
          <label htmlFor={inputId}>What do you need your agent to do?</label>
        </h2>
        <div className="flex flex-col border-[3px] border-[var(--dir-ink)]! bg-[var(--dir-paper)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--dir-ink)] sm:flex-row">
          <input
            id={inputId}
            name="q"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`e.g. ${exampleNeed}`}
            autoComplete="off"
            enterKeyHint="go"
            maxLength={300}
            className="min-h-[56px] w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3.5 text-[19px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] outline-none"
          />
          <button
            type="submit"
            className="min-h-[50px] shrink-0 cursor-pointer rounded-none border-0 border-t-[3px] border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-6 text-[17px] font-extrabold text-[var(--dir-on-yellow)] hover:underline focus-visible:outline-2 focus-visible:-outline-offset-6 focus-visible:outline-[var(--dir-on-yellow)] sm:border-t-0 sm:border-l-[3px]"
          >
            Get my pick
          </button>
        </div>
        {links}
      </form>

      <section aria-labelledby={`${inputId}-answer`} aria-live="polite" aria-busy={state.kind === 'loading'}>
        <h2 id={`${inputId}-answer`} className="dir-bar mb-3">
          {state.kind === 'example' ? (
            <>
              Example answer <span className="dir-bar-count">· &ldquo;{exampleNeed}&rdquo;</span>
            </>
          ) : (
            <>
              Your answer <span className="dir-bar-count">· &ldquo;{state.need}&rdquo;</span>
            </>
          )}
        </h2>
        {state.kind === 'example' && (
          <p className="mb-3 text-[15px] text-[var(--dir-muted)]">
            A real answer from the directory&apos;s matching rules. Type your own job above to get yours.
          </p>
        )}
        {state.kind === 'loading' && <p className="text-[16px] text-[var(--dir-muted)]">Putting it through…</p>}
        {state.kind === 'none' && (
          <div className="border-[3px] border-[var(--dir-ink)]! px-4 py-4 text-[16px]">
            <p>{state.message}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
              {state.nearest.map((t) => (
                <Link key={t.slug} href={`/tasks/${t.slug}`} className={INLINE_LINK}>
                  {t.label} →
                </Link>
              ))}
              <Link href={`/browse?q=${encodeURIComponent(state.need)}`} className={INLINE_LINK}>
                Search the catalog for it →
              </Link>
            </p>
          </div>
        )}
        {shown && <RecommendAnswer body={shown} from={state.kind === 'example' ? 'home_example' : 'home'} />}
      </section>
    </div>
  );
}
