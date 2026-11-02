/**
 * The address of a shared stack, /stack?items=<slug>,<slug>&title=<title>,
 * shared by My stack (lib/my-stack.ts, in the browser) and the /stack page
 * (lib/shared-stack.ts). The address is the whole stack: nothing is stored on
 * the server. No imports, so it adds nothing to the client bundle.
 */

/** Most listings in a stack, saved or shared. */
export const MY_STACK_MAX = 10;
export const STACK_TITLE_MAX = 70;

/** What a stack shared without a title is called. */
export const UNTITLED_STACK = 'A shared stack';

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

/** Control and text-direction characters, which have no place in a one-line title. */
const UNPRINTABLE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/** A web address in a title is dropped: the page and its card would show it as if the site had written it. */
const ADDRESS = /:\/\/|www\./i;

export function isListingSlug(value: string): boolean {
  return SLUG.test(value);
}

/**
 * The title as a stack shows it: one line of at most STACK_TITLE_MAX
 * characters, or '' when nothing printable is left or it holds a web address.
 */
export function cleanStackTitle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const line = raw.replace(/\s+/g, ' ').replace(UNPRINTABLE, '').trim();
  if (ADDRESS.test(line)) return '';
  return [...line].slice(0, STACK_TITLE_MAX).join('').trim();
}

/** "items=a,b&title=…" for these slugs, first MY_STACK_MAX kept. A title that cleans to nothing is left out. */
export function stackQuery(slugs: readonly string[], title = ''): string {
  const clean = cleanStackTitle(title);
  return `items=${slugs.slice(0, MY_STACK_MAX).join(',')}${clean ? `&title=${encodeURIComponent(clean)}` : ''}`;
}

/** The /stack address of these slugs, in order. */
export function stackHref(slugs: readonly string[], title = ''): string {
  return `/stack?${stackQuery(slugs, title)}`;
}
