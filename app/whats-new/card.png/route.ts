import { getReleases, highlightedReleases } from '@/lib/changelog';
import { renderWhatsNewCard } from '@/lib/og';
import { whatsNewCard } from '@/lib/share-cards';

export const dynamic = 'force-static';

export async function GET() {
  const [latest] = highlightedReleases(getReleases());
  if (!latest) return new Response('No release has highlights yet', { status: 404 });
  return renderWhatsNewCard(whatsNewCard(latest));
}
