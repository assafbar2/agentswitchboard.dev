import type { Metadata, ResolvingMetadata } from 'next';
import ComparePage, { generateMetadata as pageMetadata } from '../page';

/**
 * /compare with no query, prerendered once per deploy. proxy.ts rewrites a /compare
 * request that carries none of the keys the page reads (lib/query-pages.ts)
 * here, so it is served from the CDN instead of rendering per visit.
 */
export const dynamic = 'force-static';

const NO_QUERY = Promise.resolve({});

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata({ searchParams: NO_QUERY }, parent);
}

export default function ComparePageAll() {
  return <ComparePage searchParams={NO_QUERY} />;
}
