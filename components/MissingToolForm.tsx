'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send } from 'lucide-react';
import Link from '@/components/Link';
import { ACCESS_METHOD_LABELS, ALL_ACCESS_METHODS } from '@/lib/search';

interface CategoryOption {
  slug: string;
  name: string;
}

type FormStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'recorded'; message: string }
  | { kind: 'rate_limited'; message: string }
  | { kind: 'error'; message: string };

const NEED_MIN = 10;
const NEED_MAX = 500;
const TRIED_MAX = 200;

export function MissingToolForm({ categories }: { categories: CategoryOption[] }) {
  const searchParams = useSearchParams();
  const initialTried = (searchParams.get('tried') ?? '').slice(0, TRIED_MAX);
  const initialCategoryParam = searchParams.get('category') ?? '';
  const initialCategory = categories.some((c) => c.slug === initialCategoryParam) ? initialCategoryParam : '';

  const [need, setNeed] = useState('');
  const [tried, setTried] = useState(initialTried);
  const [category, setCategory] = useState(initialCategory);
  const [access, setAccess] = useState<string[]>([]);
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle' });

  function toggleAccess(method: string) {
    setAccess((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]));
  }

  function resetForm() {
    setNeed('');
    setTried('');
    setCategory('');
    setAccess([]);
    setStatus({ kind: 'idle' });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedNeed = need.trim();
    if (trimmedNeed.length < NEED_MIN) {
      setStatus({
        kind: 'error',
        message: `Please describe the job in at least ${NEED_MIN} characters.`,
      });
      return;
    }
    if (trimmedNeed.length > NEED_MAX) {
      setStatus({
        kind: 'error',
        message: `Please keep the description under ${NEED_MAX} characters.`,
      });
      return;
    }

    const payload: Record<string, unknown> = { need: trimmedNeed };
    const trimmedTried = tried.trim();
    if (trimmedTried) payload.tried = trimmedTried.slice(0, TRIED_MAX);
    if (category) payload.category = category;
    if (access.length > 0) payload.access = access;

    setStatus({ kind: 'submitting' });
    try {
      const res = await fetch('/api/missing-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { status?: string; message?: string } | null;

      if (res.status === 202 || data?.status === 'recorded') {
        setStatus({
          kind: 'recorded',
          message:
            data?.message ??
            'Recorded for the weekly review. Nothing was published and there is no reply; if a tool for this is added, it will show up in the directory.',
        });
        return;
      }

      if (res.status === 429) {
        const retryHeader = Number.parseInt(res.headers.get('Retry-After') ?? '', 10);
        const fallback =
          Number.isFinite(retryHeader) && retryHeader > 0
            ? `Too many requests right now. Try again in about ${Math.ceil(retryHeader / 60)} minutes.`
            : 'Too many requests right now. Please try again later.';
        setStatus({
          kind: 'rate_limited',
          message: data?.message ?? fallback,
        });
        return;
      }

      setStatus({
        kind: 'error',
        message: data?.message ?? `Could not record your request (HTTP ${res.status}). Please try again.`,
      });
    } catch {
      setStatus({
        kind: 'error',
        message: 'Network error while sending your request. Please try again.',
      });
    }
  }

  if (status.kind === 'recorded') {
    return (
      <div className="border-[3px] border-[var(--dir-ink)]! p-6" role="status">
        <p className="text-lg font-bold mb-2">Request recorded</p>
        <p className="text-[16px] leading-relaxed text-[var(--dir-muted)] mb-5">{status.message}</p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex min-h-10 items-center rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] px-4 text-sm font-extrabold uppercase tracking-[0.06em] text-[var(--dir-ink)] hover:bg-[var(--dir-yellow)] hover:text-[var(--dir-on-yellow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
          >
            Send another request
          </button>
          <Link href="/browse" className="inline-link">
            Browse directory
          </Link>
          <Link href="/tasks" className="inline-link">
            Browse tasks
          </Link>
        </div>
      </div>
    );
  }

  const pending = status.kind === 'submitting';

  return (
    <form onSubmit={handleSubmit} noValidate className="text-left space-y-5">
      <div>
        <label htmlFor="missing-need" className="dir-label block mb-1.5">
          What job do you need a tool for?
        </label>
        <textarea
          id="missing-need"
          name="need"
          required
          minLength={NEED_MIN}
          maxLength={NEED_MAX}
          rows={4}
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          aria-describedby="missing-need-hint"
          placeholder='e.g. "an MCP server that files expense reports in Expensify" or "a CLI to manage Cloudflare DNS records"'
          className="w-full rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-3 text-[17px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--dir-ink)]"
        />
        <p id="missing-need-hint" className="mt-1 text-[14px] text-[var(--dir-muted)]">
          {need.trim().length}/{NEED_MAX} characters (minimum {NEED_MIN}). Describe the job, not yourself.
        </p>
      </div>

      <div>
        <label htmlFor="missing-tried" className="dir-label block mb-1.5">
          What did you search for?{' '}
          <span className="font-semibold normal-case tracking-normal text-[var(--dir-muted)]">(optional)</span>
        </label>
        <input
          id="missing-tried"
          name="tried"
          type="text"
          maxLength={TRIED_MAX}
          value={tried}
          onChange={(e) => setTried(e.target.value)}
          placeholder="Search words or task that came up empty"
          className="w-full rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-3 text-[17px] text-[var(--dir-ink)] placeholder:text-[var(--dir-muted)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--dir-ink)]"
        />
      </div>

      <div>
        <label htmlFor="missing-category" className="dir-label block mb-1.5">
          Closest category{' '}
          <span className="font-semibold normal-case tracking-normal text-[var(--dir-muted)]">(optional)</span>
        </label>
        <select
          id="missing-category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-paper)] p-3 text-[17px] text-[var(--dir-ink)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--dir-ink)]"
        >
          <option value="">Not sure / any category</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="dir-label mb-2">
          Preferred access{' '}
          <span className="font-semibold normal-case tracking-normal text-[var(--dir-muted)]">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {ALL_ACCESS_METHODS.map((method) => {
            const checked = access.includes(method);
            return (
              <label
                key={method}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 border-2 px-3 text-sm font-bold uppercase tracking-[0.06em] ${
                  checked
                    ? 'border-[var(--dir-ink)]! bg-[var(--dir-yellow)] text-[var(--dir-on-yellow)]'
                    : 'border-[var(--dir-ink)]! bg-[var(--dir-paper)] text-[var(--dir-ink)]'
                }`}
              >
                <input
                  type="checkbox"
                  name="access"
                  value={method}
                  checked={checked}
                  onChange={() => toggleAccess(method)}
                  className="sr-only"
                />
                {ACCESS_METHOD_LABELS[method] ?? method}
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="text-[15px] leading-relaxed text-[var(--dir-muted)]">
        Requests are logged privately for the weekly curation review via{' '}
        <span className="mono font-semibold">POST /api/missing-tool</span>. Nothing is published publicly and there is
        no reply — please do not include names, email addresses, or private account details.
      </p>

      {(status.kind === 'error' || status.kind === 'rate_limited') && (
        <p role="alert" className="border-l-[3px] border-[var(--rose)]! pl-3 font-semibold text-[var(--rose)]">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-none border-2 border-[var(--dir-ink)]! bg-[var(--dir-yellow)] px-6 text-lg font-extrabold tracking-[0.02em] text-[var(--dir-on-yellow)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)] disabled:cursor-wait disabled:no-underline"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
        {pending ? 'Sending…' : 'Request missing tool'}
      </button>
    </form>
  );
}
