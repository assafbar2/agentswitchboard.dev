/**
 * Where on the site a pick was made, for the compare_add and stack_add events:
 * the kind of page, never its query. On a listing page the cards are its
 * related listings.
 */
export function pageKind(pathname: string): string {
  if (pathname === '/') return 'home';
  const [first, slug, sub] = pathname.split('/').slice(1);
  if (first === 'agents' && slug) return sub === 'alternatives' ? 'alternatives' : 'related';
  return ['browse', 'categories', 'stacks', 'stack', 'tasks', 'drops'].includes(first) ? first : 'other';
}
