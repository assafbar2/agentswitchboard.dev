/**
 * A task's answer, said first: the sentence a task page opens with and the
 * quick answers under it, for the page and its Markdown twin
 * (/tasks/<slug>.md). On the page (with `day`) the task's Featured and
 * Sponsored fits come first and are named with their label (lib/promoted.ts).
 * The Markdown twin is for assistants, so it gets the fits in organic order
 * (lib/organic.ts): no placement order, no placement label.
 */

import { getDropSchedule } from './drops';
import { organicOrder } from './organic';
import { labeledName, promotedFirst, promotion } from './promoted';
import { taskMatches } from './search';
import type { Task } from './tasks';
import type { Agent } from './types';
import { joinList, pluralize } from './utils';

/** Listings named in a task's answer and in each quick answer. */
export const ANSWER_NAMES = 3;

export interface QuickAnswer {
  question: string;
  answer: string;
  /** The listings the answer names, in order. */
  names: Agent[];
}

export interface TaskAnswer {
  /** The day the catalog last changed: the latest weekly drop (YYYY-MM-DD). */
  updated: string | null;
  /** "The best fits to query a database on Agent Switchboard, as of 13 Nov 2026: A, B and C, of 61 tools that do it." */
  lead: string;
  /** The listings the lead names, in order. */
  names: Agent[];
  quick: QuickAnswer[];
  /** Every listing that does the task, best fit first: promoted ones first with `day`, else in organic order. */
  fits: Agent[];
  /** True when the lead names a promoted listing. */
  promoted: boolean;
}

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "13 Nov 2026" */
export function answerDate(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

function quick(question: string, matching: Agent[], what: string, none: string, name: (a: Agent) => string): QuickAnswer {
  const names = matching.slice(0, ANSWER_NAMES);
  if (names.length === 0) return { question, answer: none, names };
  const more = matching.length > names.length ? `, among ${matching.length} that ${what}` : '';
  return {
    question,
    answer: `${joinList(names.map(name))}${more}.`,
    names,
  };
}

/**
 * The task's answer. With `day` (YYYY-MM-DD, for the website), Featured and
 * Sponsored fits live that day come first and are named with their label;
 * without it, the fits in organic order.
 */
export function taskAnswer(task: Task, catalog: readonly Agent[], day?: string): TaskAnswer {
  const organic = taskMatches(organicOrder(catalog), task);
  const fits = day ? promotedFirst(organic, day) : organic;
  const name = (a: Agent) => (day ? labeledName(a, day) : a.name);
  const updated = getDropSchedule().drops[0]?.date ?? null;
  const names = fits.slice(0, ANSWER_NAMES);
  const promoted = !!day && names.some((a) => promotion(a, day));
  const asOf = updated ? `, as of ${answerDate(updated)}` : '';
  const tools = `${fits.length} ${pluralize(fits.length, 'tool')}`;
  const first = promoted ? 'Featured and Sponsored first, then the best fits' : 'The best fits';
  const lead =
    names.length > 0
      ? `${first} to ${task.label} on Agent Switchboard${asOf}: ${joinList(names.map(name))}, of ${tools} that do it.`
      : `No tool in Agent Switchboard does this yet${asOf}.`;
  return {
    updated,
    lead,
    names,
    quick: [
      quick(
        `Which official tools ${task.label}?`,
        fits.filter((a) => a.official),
        'are official',
        `None of the ${tools} is published by the company behind the product yet.`,
        name
      ),
      quick(
        `Which have a hosted MCP server?`,
        fits.filter((a) => a.mcpEndpoint),
        'have one',
        `None of the ${tools} lists a hosted MCP server address.`,
        name
      ),
      quick(
        'Which need no API key or sign-in?',
        fits.filter((a) => a.authType === 'none'),
        'need none',
        `All ${tools} need an API key or a sign-in.`,
        name
      ),
    ],
    fits,
    promoted,
  };
}
