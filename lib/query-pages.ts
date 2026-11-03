import { COMPARE_QUERY_KEYS } from './compare-link';

/**
 * The pages that render per request from their query, and the keys each one
 * reads. Without one of those keys the page renders exactly as it does bare,
 * so proxy.ts serves its prerendered copy at `<page>/all` instead: a link
 * carrying only tracking tags (utm_*, fbclid, ref) comes from the CDN too.
 * Kept free of imports beyond compare-link so the proxy stays small.
 */
export const QUERY_PAGE_KEYS = {
  '/browse': ['q', 'task', 'category', 'access', 'official', 'vendor', 'verified', 'auth', 'sort'],
  '/compare': COMPARE_QUERY_KEYS,
  '/stack': ['items', 'title'],
  '/operator': ['q'],
} as const satisfies Record<string, readonly string[]>;

export type QueryPage = keyof typeof QUERY_PAGE_KEYS;

export function isQueryPage(pathname: string): pathname is QueryPage {
  return Object.hasOwn(QUERY_PAGE_KEYS, pathname);
}

/** True when the request carries a key the page reads (even with an empty value). */
export function readsQuery(page: QueryPage, params: URLSearchParams): boolean {
  return QUERY_PAGE_KEYS[page].some((key) => params.has(key));
}
