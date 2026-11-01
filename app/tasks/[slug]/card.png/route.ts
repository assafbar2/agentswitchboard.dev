import { getEveryAgent } from '@/lib/catalog';
import { renderTaskCard } from '@/lib/og';
import { taskMatches } from '@/lib/search';
import { taskCard } from '@/lib/share-cards';
import { getTask, getTasks } from '@/lib/tasks';

export const dynamicParams = false;

export function generateStaticParams() {
  return getTasks().map((t) => ({ slug: t.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const task = getTask((await context.params).slug);
  if (!task) return new Response('Not found', { status: 404 });
  return renderTaskCard(taskCard(task, taskMatches(await getEveryAgent(), task)));
}
