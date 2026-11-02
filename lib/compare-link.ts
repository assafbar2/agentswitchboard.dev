/**
 * The /compare address, shared by the compare tray (a client component) and
 * the server code in lib/compare.ts. No imports, so it adds nothing to the
 * tray's bundle.
 */

export const COMPARE_MAX = 3;

/** The query parameters, in column order. */
const COMPARE_KEYS = ['a', 'b', 'c'] as const;

/** "a=…&b=…&c=…" for these slugs, first COMPARE_MAX kept. */
export function compareQuery(slugs: readonly string[]): string {
  return slugs
    .slice(0, COMPARE_MAX)
    .map((slug, i) => `${COMPARE_KEYS[i]}=${encodeURIComponent(slug)}`)
    .join('&');
}

/** /compare for these slugs, first COMPARE_MAX kept. */
export function compareHref(slugs: readonly string[]): string {
  const query = compareQuery(slugs);
  return query ? `/compare?${query}` : '/compare';
}
