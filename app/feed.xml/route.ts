import { getEveryAgent } from '@/lib/catalog';
import { getReleases } from '@/lib/changelog';
import { getDropSchedule } from '@/lib/drops';
import { feedEntries, rssFeed } from '@/lib/feeds';

export const dynamic = 'force-static';

export async function GET() {
  const entries = feedEntries(getReleases(), getDropSchedule().drops, await getEveryAgent());
  return new Response(rssFeed(entries), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
