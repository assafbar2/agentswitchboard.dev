/**
 * The /compare address, shared by the compare tray (a client component) and
 * the server code in lib/compare.ts. No imports, so it adds nothing to the
 * tray's bundle.
 */

export const COMPARE_MAX = 3;

/** The query parameters, in column order: a, b and c are the columns; d to f are read too, so a longer link can say what it left out. */
export const COMPARE_QUERY_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

/** "a=…&b=…&c=…" for these slugs, first `max` kept. */
export function compareQuery(slugs: readonly string[], max: number = COMPARE_MAX): string {
  return slugs
    .slice(0, Math.min(max, COMPARE_QUERY_KEYS.length))
    .map((slug, i) => `${COMPARE_QUERY_KEYS[i]}=${encodeURIComponent(slug)}`)
    .join('&');
}

/** /compare for these slugs, first COMPARE_MAX kept. */
export function compareHref(slugs: readonly string[]): string {
  const query = compareQuery(slugs);
  return query ? `/compare?${query}` : '/compare';
}
