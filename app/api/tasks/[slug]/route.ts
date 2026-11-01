/**
 * One task by slug, with every listing that fits it.
 *
 *   GET /api/tasks/<slug>
 *   → { the GET /api/tasks fields, agents: [ { the search-result fields,
 *       authType, why } ], relatedTasks: [slug], stacks: [slug] }
 *
 * `agents` is best fit first. `why` is the listing's skill that does the
 * task, or null when it fits by its name, description or tags. Read-only,
 * no auth, open CORS. 404 when the slug is unknown.
 */

import { getEveryAgent } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import { corsPreflight, detailTask, jsonResponse, unknownTaskMessage } from '@/lib/public-api';
import { taskMatches } from '@/lib/search';
import { getStacks, stacksInOrder } from '@/lib/stacks';
import { getTask, getTasks, relatedStacks, relatedTasks, whyItFits } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  logConsumer('/api/tasks/[slug]', req, { slug });

  const task = getTask(slug);
  if (!task) {
    return jsonResponse({ error: 'not_found', message: unknownTaskMessage(slug) }, 404);
  }

  const catalog = await getEveryAgent();
  const fits = taskMatches(catalog, task);
  return jsonResponse(
    detailTask(
      task,
      fits.map((agent) => ({ agent, why: whyItFits(agent, task) })),
      relatedTasks(task, getTasks(), catalog),
      relatedStacks(fits, stacksInOrder(getStacks())).map((s) => s.stack)
    )
  );
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
