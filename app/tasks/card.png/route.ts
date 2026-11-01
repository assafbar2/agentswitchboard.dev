import { getEveryAgent } from '@/lib/catalog';
import { renderTasksCard } from '@/lib/og';
import { taskMatches } from '@/lib/search';
import { tasksCard } from '@/lib/share-cards';
import { getTasks } from '@/lib/tasks';

export const dynamic = 'force-static';

export async function GET() {
  const catalog = await getEveryAgent();
  return renderTasksCard(tasksCard(getTasks().map((task) => ({ fits: taskMatches(catalog, task) }))));
}
