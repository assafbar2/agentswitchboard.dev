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
