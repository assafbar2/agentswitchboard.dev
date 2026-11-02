import { getEveryAgent } from '@/lib/catalog';
import { getDropSchedule } from '@/lib/drops';
import { newListings, newSince } from '@/lib/freshness';
import { renderNewCard } from '@/lib/og';
import { newCard } from '@/lib/share-cards';

export const dynamic = 'force-static';

export async function GET() {
  const catalog = await getEveryAgent();
  const since = newSince();
  return renderNewCard(newCard(newListings(catalog, getDropSchedule().drops, since), since, catalog));
}
