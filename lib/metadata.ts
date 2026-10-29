import type { Metadata, ResolvingMetadata } from 'next';

const SITE_NAME = 'Agent Switchboard';

/**
 * Metadata for a simple page: title, description and canonical path, plus
 * matching Open Graph and Twitter tags (og:url = the canonical).
 *
 * A page-level openGraph block replaces the root one wholesale, so this carries
 * over the root's content-hashed opengraph-image; twitter:image inherits it.
 */
export async function pageMetadata(
  {
    title,
    description,
    path,
    ...rest
  }: Omit<Metadata, 'title' | 'description' | 'alternates'> & {
    title: string;
    description: string;
    path: string;
  },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const images = (await parent).openGraph?.images ?? [];
  const shareTitle = `${title} | ${SITE_NAME}`;
  return {
    ...rest,
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, title: shareTitle, description, url: path, images },
    twitter: { card: 'summary_large_image', title: shareTitle, description },
  };
}
