/**
 * Markdown twin of a task page, at /tasks/<slug>.md (next.config.ts rewrites
 * it here): the answer, the quick answers and the best fits as plain text,
 * for assistants that read Markdown. Prerendered like /index.md; its Link
 * header names the HTML page as canonical.
 */

import { getEveryAgent } from '@/lib/catalog';
import { BASE_URL } from '@/lib/env';
import { answerDate, taskAnswer } from '@/lib/task-answers';
import { getTask, getTasks, TASK_PAGE_SIZE, taskTitle, whyItFits } from '@/lib/tasks';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return getTasks().map((t) => ({ slug: t.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const task = getTask((await params).slug);
  if (!task) return new Response('Not found', { status: 404 });
  const answer = taskAnswer(task, await getEveryAgent());
  const page = `${BASE_URL}/tasks/${task.slug}`;
  const line = (s: string) => s.replace(/\s+/g, ' ').trim();

  const best = answer.fits.slice(0, TASK_PAGE_SIZE).map((a, i) => {
    const facts = [a.accessMethods.join(', '), a.official ? 'Official' : '', a.mcpEndpoint ? 'hosted MCP server' : '']
      .filter(Boolean)
      .join(' · ');
    return `${i + 1}. [${a.name}](${BASE_URL}/agents/${a.slug}) (${facts}): ${line(whyItFits(a, task) ?? a.description)}`;
  });

  const body = `# ${taskTitle(task)}

> ${task.blurb}

${answer.lead}

## Quick answers

${answer.quick.map((q) => `- **${q.question}** ${q.answer}`).join('\n')}

## Best fits

${best.join('\n')}

${answer.fits.length > best.length ? `All ${answer.fits.length}, with filters: ${BASE_URL}/browse?task=${task.slug}\n\n` : ''}## For agents

- This task as JSON: ${BASE_URL}/api/tasks/${task.slug}
- One pick for your user's need, with the next step: ${BASE_URL}/api/recommend?need=${encodeURIComponent(task.label)} (or the \`recommend\` MCP tool at ${BASE_URL}/api/mcp)
- Every task: ${BASE_URL}/tasks · the whole site: ${BASE_URL}/llms.txt

${answer.updated ? `Updated ${answerDate(answer.updated)} with the weekly drop. ` : ''}Ranked by how well each listing matches the task, never by payment. Page: ${page}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${page}>; rel="canonical"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
