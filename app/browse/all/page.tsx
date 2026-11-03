import type { Metadata, ResolvingMetadata } from 'next';
import BrowsePage, { generateMetadata as browseMetadata } from '../page';

/**
 * The unfiltered /browse, prerendered once per deploy. proxy.ts rewrites a bare
 * /browse (no query) here, so the full listing (the heaviest page on the site)
 * is served from the CDN instead of rendering on every visit. Filtered and
 * search views still render per request at /browse. Its canonical is /browse.
 */
export const dynamic = 'force-static';

const NO_QUERY = Promise.resolve({});

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return browseMetadata({ searchParams: NO_QUERY }, parent);
}

export default function BrowseAllPage() {
  return <BrowsePage searchParams={NO_QUERY} />;
}
