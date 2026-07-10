'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surfaces in Vercel logs; picked up by Sentry when a DSN is configured
    console.error('[app-error]', error);
  }, [error]);

  return (
    <div className="container-wide section">
      <div className="max-w-xl mx-auto text-center py-20">
        <AlertTriangle className="w-10 h-10 text-[var(--amber)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Something went wrong
        </h1>
        <p className="text-[var(--text-secondary)] mb-6">
          The switchboard hit a snag loading this page. It&apos;s usually
          temporary — try again in a moment.
        </p>
        {error.digest && (
          <p className="mono text-xs text-[var(--text-muted)] mb-6">
            error digest: {error.digest}
          </p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
