/**
 * Every task: a job and the listings that fit it (content/tasks.json).
 *
 *   GET /api/tasks
 *   → { total, tasks: [ { slug, label, blurb, keywords, categories, access,
 *       count, official, url, browseUrl, agentsUrl } ] }
 *
 * In the order /tasks shows them. A task's listings, best fit first: GET
 * /api/tasks/{slug}, or GET /api/agents?task={slug} to filter and page
 * them. Read-only, no auth, open CORS.
 */

import { getEveryAgent } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import { corsPreflight, jsonResponse, summarizeTask } from '@/lib/public-api';
import { taskMatches } from '@/lib/search';
import { getTasks } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  logConsumer('/api/tasks', req);
  const tasks = getTasks();
  const catalog = await getEveryAgent();
  return jsonResponse({
    total: tasks.length,
    tasks: tasks.map((t) => summarizeTask(t, taskMatches(catalog, t))),
  });
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
