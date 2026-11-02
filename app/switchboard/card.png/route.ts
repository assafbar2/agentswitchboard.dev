import { boardOf } from '@/lib/board';
import { getAllCategories, getEveryAgent } from '@/lib/catalog';
import { getDropSchedule } from '@/lib/drops';
import { renderBoardCard } from '@/lib/og';
import { boardCard } from '@/lib/share-cards';

export const dynamic = 'force-static';

export async function GET() {
  const [catalog, categories] = await Promise.all([getEveryAgent(), getAllCategories()]);
  return renderBoardCard(boardCard(boardOf(catalog, categories, getDropSchedule().drops[0] ?? null)));
}
