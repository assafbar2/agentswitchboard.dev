import { getEveryAgent } from '@/lib/catalog';
import { renderStacksCard } from '@/lib/og';
import { stacksCard } from '@/lib/share-cards';
import { getStacks, stackEntries, stacksInOrder } from '@/lib/stacks';

export const dynamic = 'force-static';

export async function GET() {
  const catalog = await getEveryAgent();
  return renderStacksCard(stacksCard(stacksInOrder(getStacks()).map((s) => ({ entries: stackEntries(s, catalog) }))));
}
