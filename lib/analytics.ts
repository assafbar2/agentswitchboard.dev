import { track } from '@vercel/analytics';

/**
 * Counts a Vercel Analytics event, fire and forget: analytics never fails or
 * delays what the visitor did. Never pass search text; counts and slugs only.
 */
export function count(event: string, data?: Record<string, string | number | boolean>): void {
  try {
    track(event, data);
  } catch {
    // Analytics is optional.
  }
}

/** URL parameters that carry words people typed: searches and requests, and stack titles. */
const TYPED_PARAMS = ['q', 'title'];

/** A page view or event with the typed words taken out of its page URL; the page still counts. */
export function withoutTypedText<E extends { url: string }>(event: E): E {
  const url = new URL(event.url);
  if (!TYPED_PARAMS.some((name) => url.searchParams.has(name))) return event;
  for (const name of TYPED_PARAMS) url.searchParams.delete(name);
  return { ...event, url: url.toString() };
}
