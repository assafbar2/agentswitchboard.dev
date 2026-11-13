/**
 * A task's answer, said first: the sentence a task page opens with and the
 * quick answers under it, for the page and its Markdown twin
 * (/tasks/<slug>.md). Assistants quote these as advice, so they come from
 * the task's fits in organic order (lib/organic.ts): no placement order, no
 * placement label.
 */

import { getDropSchedule } from './drops';
import { organicOrder } from './organic';
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
  /** Every listing that does the task, best fit first, in organic order. */
  fits: Agent[];
}

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "13 Nov 2026" */
export function answerDate(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

function quick(question: string, matching: Agent[], what: string, none: string): QuickAnswer {
  const names = matching.slice(0, ANSWER_NAMES);
  if (names.length === 0) return { question, answer: none, names };
  const more = matching.length > names.length ? `, among ${matching.length} that ${what}` : '';
  return {
    question,
    answer: `${joinList(names.map((a) => a.name))}${more}.`,
    names,
  };
}

/** The task's answer, from the catalog in organic order. */
export function taskAnswer(task: Task, catalog: readonly Agent[]): TaskAnswer {
  const fits = taskMatches(organicOrder(catalog), task);
  const updated = getDropSchedule().drops[0]?.date ?? null;
  const names = fits.slice(0, ANSWER_NAMES);
  const asOf = updated ? `, as of ${answerDate(updated)}` : '';
  const tools = `${fits.length} ${pluralize(fits.length, 'tool')}`;
  const lead =
    names.length > 0
      ? `The best fits to ${task.label} on Agent Switchboard${asOf}: ${joinList(names.map((a) => a.name))}, of ${tools} that do it.`
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
        `None of the ${tools} is published by the company behind the product yet.`
      ),
      quick(
        `Which have a hosted MCP server?`,
        fits.filter((a) => a.mcpEndpoint),
        'have one',
        `None of the ${tools} lists a hosted MCP server address.`
      ),
      quick(
        'Which need no API key or sign-in?',
        fits.filter((a) => a.authType === 'none'),
        'need none',
        `All ${tools} need an API key or a sign-in.`
      ),
    ],
    fits,
  };
}
