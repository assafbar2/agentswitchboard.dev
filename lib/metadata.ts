import type { Metadata, ResolvingMetadata } from 'next';
import type { ShareImage } from './share-cards';

const SITE_NAME = 'Agent Switchboard';

/**
 * Metadata for a simple page: title, description and canonical path, plus
 * matching Open Graph and Twitter tags (og:url = the canonical).
 *
 * A page-level openGraph block replaces the root one wholesale, so a page
 * without its own `image` carries over the root's share card
 * (lib/share-cards.ts); twitter:image copies it.
 */
export async function pageMetadata(
  {
    title,
    description,
    path,
    image,
    ...rest
  }: Omit<Metadata, 'title' | 'description' | 'alternates'> & {
    title: string;
    description: string;
    path: string;
    image?: ShareImage;
  },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const images = image ? [image] : ((await parent).openGraph?.images ?? []);
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
