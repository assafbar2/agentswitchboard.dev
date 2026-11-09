import { getEveryAgent } from '@/lib/catalog';
import { getDrop, getDropSchedule } from '@/lib/drops';
import { renderDropCard } from '@/lib/og';
import { dropCard } from '@/lib/share-cards';

export const dynamicParams = false;

export function generateStaticParams() {
  return getDropSchedule().drops.map((d) => ({ date: d.date }));
}

export async function GET(_request: Request, context: { params: Promise<{ date: string }> }) {
  const found = getDrop((await context.params).date);
  if (!found) return new Response('Not found', { status: 404 });
  return renderDropCard(dropCard(found.drop, await getEveryAgent()));
}
