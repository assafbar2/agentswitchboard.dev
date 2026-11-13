import { describe, expect, it } from 'vitest';
import { GET as taskMarkdown } from '@/app/tasks/[slug]/md/route';
import { getEveryAgent } from './catalog';
import { getDropSchedule } from './drops';
import { organicOrder } from './organic';
import { taskMatches } from './search';
import { ANSWER_NAMES, answerDate, taskAnswer } from './task-answers';
import { getTask, getTasks } from './tasks';
import type { Agent } from './types';

describe('taskAnswer', () => {
  it('names the best fits in organic order, dated by the latest drop', async () => {
    const catalog = await getEveryAgent();
    const task = getTask('query-a-database')!;
    const fits = taskMatches(organicOrder(catalog), task);
    const answer = taskAnswer(task, catalog);
    const latest = getDropSchedule().drops[0].date;
    expect(answer.updated).toBe(latest);
    expect(answer.names).toEqual(fits.slice(0, ANSWER_NAMES));
    expect(answer.lead).toMatch(
      new RegExp(`^The best fits to query a database on Agent Switchboard, as of ${answerDate(latest)}: .+, of ${fits.length} tools that do it\\.$`)
    );
    expect(answer.quick.map((q) => q.question)).toEqual([
      'Which official tools query a database?',
      'Which have a hosted MCP server?',
      'Which need no API key or sign-in?',
    ]);
    expect(answer.quick[0].names.every((a) => a.official)).toBe(true);
    expect(answer.quick[1].names.every((a) => a.mcpEndpoint)).toBe(true);
    expect(answer.quick[2].names.every((a) => a.authType === 'none')).toBe(true);
  });

  it('is the same whatever is featured or sponsored', async () => {
    const catalog = await getEveryAgent();
    const placed = catalog.map((a, i): Agent => (i % 2 ? { ...a, featured: true, sponsored: true } : a));
    for (const task of getTasks()) {
      const plain = taskAnswer(task, catalog);
      const withPlacement = taskAnswer(task, placed);
      expect(withPlacement.lead, task.slug).toBe(plain.lead);
      expect(withPlacement.quick.map((q) => q.answer), task.slug).toEqual(plain.quick.map((q) => q.answer));
    }
  });

  it('formats the day as it reads', () => {
    expect(answerDate('2026-11-13')).toBe('13 Nov 2026');
  });
});

describe('/tasks/<slug>.md', () => {
  it('is Markdown with the answer, the quick answers and the best fits, and names the page as canonical', async () => {
    const task = getTask('query-a-database')!;
    const res = await taskMarkdown(new Request('http://localhost/tasks/query-a-database/md'), {
      params: Promise.resolve({ slug: task.slug }),
    });
    expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(res.headers.get('link')).toBe('<https://agentswitchboard.dev/tasks/query-a-database>; rel="canonical"');
    const text = await res.text();
    const answer = taskAnswer(task, await getEveryAgent());
    expect(text).toMatch(/^# I need to query a database\n/);
    expect(text).toContain(answer.lead);
    for (const q of answer.quick) expect(text).toContain(`- **${q.question}** ${q.answer}`);
    expect(text).toContain(`1. [${answer.fits[0].name}](https://agentswitchboard.dev/agents/${answer.fits[0].slug})`);
    expect(text).not.toMatch(/featured|sponsor/i);
  });
});
