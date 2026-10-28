'use client';

import { useActionState } from 'react';
import { Send } from 'lucide-react';
import { submitAgent, type SubmitState } from '@/app/submit/actions';

const initialState: SubmitState = { status: 'idle', message: '' };

export function SubmitForm() {
  const [state, formAction, pending] = useActionState(submitAgent, initialState);

  if (state.status === 'ok') {
    return (
      <div className="border-[3px] border-[var(--dir-ink)]! p-6" role="status">
        <p className="text-lg font-bold mb-1">✅ {state.message}</p>
        {state.issueUrl ? (
          <p className="text-[15px] text-[var(--dir-muted)]">
            The decision will be posted there:{' '}
            <a
              href={state.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2"
            >
              {state.issueUrl}
            </a>
          </p>
        ) : (
          <p className="text-[15px] text-[var(--dir-muted)]">
            The decision will be posted on that GitHub issue.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="text-left space-y-4">
      <div>
        <label htmlFor="ask" className="dir-label block mb-1.5">
          What should we list?
        </label>
        <textarea
          id="ask"
          name="ask"
          required
          minLength={20}
          rows={5}
          aria-describedby="submit-visibility"
          placeholder="Agent name, link, access methods (API/MCP/CLI/extension), and anything that helps us verify it."
          className="w-full rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-3 text-[17px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--dir-ink)]"
        />
      </div>

      <div>
        <label htmlFor="email" className="dir-label block mb-1.5">
          Your email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-describedby="submit-visibility"
          placeholder="you@company.com"
          className="w-full rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-3 text-[17px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--dir-ink)]"
        />
      </div>

      {/* Honeypot — hidden from humans */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <p id="submit-visibility" className="text-[15px] leading-relaxed text-[var(--dir-muted)]">
        Your description becomes a <strong>public GitHub issue</strong>, and that&apos;s where
        we post the decision. Your email stays private: it is never posted on the
        issue, and we only use it to contact you about this submission.
      </p>

      {state.status === 'error' && (
        <p role="alert" className="border-l-[3px] border-[var(--rose)]! pl-3 font-semibold text-[var(--rose)]">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-6 text-lg font-extrabold tracking-[0.02em] text-[var(--dir-on-yellow)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)] disabled:cursor-wait disabled:no-underline"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
        {pending ? 'Submitting…' : 'Submit for review'}
      </button>
    </form>
  );
}
