/**
 * Next.js server instrumentation. Sentry activates only when SENTRY_DSN is
 * set (in Vercel env) — without it this is a no-op, so local dev and forks
 * work with zero observability config.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || 'development',
  });
}

export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  // @ts-expect-error — passthrough to Sentry's request error hook
  return Sentry.captureRequestError(...args);
}
