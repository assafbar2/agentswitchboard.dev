'use client';

import { useActionState } from 'react';
import { Send } from 'lucide-react';
import { submitAgent, type SubmitState } from '@/app/submit/actions';

const initialState: SubmitState = { status: 'idle', message: '' };

export function SubmitForm() {
  const [state, formAction, pending] = useActionState(submitAgent, initialState);

  if (state.status === 'ok') {
    return (
      <div className="card p-6 text-center" role="status">
        <p className="text-[var(--text-primary)] font-medium mb-1">✅ {state.message}</p>
        {state.issueUrl ? (
          <p className="text-sm text-[var(--text-muted)]">
            The decision will be posted there:{' '}
            <a
              href={state.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline break-all"
            >
              {state.issueUrl}
            </a>
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            The decision will be posted on that GitHub issue.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="text-left space-y-4">
      <div>
        <label htmlFor="ask" className="block text-sm font-medium mb-1.5">
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
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Your email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-describedby="submit-visibility"
          placeholder="you@company.com"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-accent)] focus:outline-none"
        />
      </div>

      {/* Honeypot — hidden from humans */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <p id="submit-visibility" className="text-sm text-[var(--text-secondary)]">
        Your description becomes a <strong>public GitHub issue</strong>, and that&apos;s where
        we post the decision. Your email stays private: it is never posted on the
        issue, and we only use it to contact you about this submission.
      </p>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-[var(--rose)]">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
        {pending ? 'Submitting…' : 'Submit for review'}
      </button>
    </form>
  );
}
