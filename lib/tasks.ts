/**
 * Tasks: the jobs visitors come with ("query a database"), from
 * content/tasks.json. A task names the keywords, categories and access
 * methods the ranker (lib/search.ts taskMatches) picks its listings by.
 * /browse?task=<slug> shows them with every filter; /tasks/<slug> shows the
 * best fits, each with why it fits. scripts/validate-content.ts checks the
 * file with taskProblems.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cache } from 'react';
import { keywordMatcher, taskMatches, taskScore, type TaskQuery } from './search';
import type { Stack } from './stacks';
import type { Agent, AgentSkill } from './types';
import { joinList, truncate } from './utils';

export const TASK_LABEL_MAX = 40;
export const TASK_BLURB_MAX = 120;
export const TASK_MIN_KEYWORDS = 3;
export const TASK_MAX_KEYWORDS = 5;
/** A task that fits fewer listings is cut. */
export const TASK_MIN_LISTINGS = 3;
/** Best fits a task page shows. */
export const TASK_PAGE_SIZE = 12;
/** Official listings a task page shows. */
export const TASK_OFFICIAL_SIZE = 8;
export const RELATED_TASKS = 4;
export const RELATED_STACKS = 3;
export const WHY_MAX = 150;

export interface Task extends TaskQuery {
  slug: string;
  /** The job, as it reads after "I need to": "query a database". */
  label: string;
  /** One plain line on what its listings do. */
  blurb: string;
  categories: string[];
  access: string[];
  keywords: string[];
}

const FILE = path.join(process.cwd(), 'content', 'tasks.json');

/** Every task, in the file's order, which is the order /tasks shows them in. */
export const getTasks = cache((): Task[] =>
  fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, 'utf8')) as Task[]) : []
);

export function getTask(slug: string): Task | null {
  return getTasks().find((t) => t.slug === slug) ?? null;
}

/** "I need to query a database" */
export function taskTitle(task: Pick<Task, 'label'>): string {
  return `I need to ${task.label}`;
}

/**
 * Why `agent` fits `task`, from its own skills: the skill that mentions the
 * most of the task's keywords, a mention in its name counting double, as
 * "Skill name: what it does". Null when no skill mentions one: the listing
 * then fits by its name, description or tags, which its card shows anyway.
 */
export function whyItFits(agent: Agent, task: Task): string | null {
  const matchers = task.keywords.map(keywordMatcher);
  let best: AgentSkill | null = null;
  let bestScore = 0;
  for (const skill of agent.skills ?? []) {
    // Guard against legacy string-form skills, as search does.
    if (!skill || typeof skill !== 'object' || !skill.name || !skill.description) continue;
    const name = skill.name.toLowerCase();
    const description = skill.description.toLowerCase();
    const score = matchers.reduce((sum, m) => sum + (m.anywhere(name) ? 2 : 0) + (m.phrase(description) ? 1 : 0), 0);
    if (score > bestScore) {
      best = skill;
      bestScore = score;
    }
  }
  if (!best) return null;
  const name = best.name.trim();
  const description = best.description.trim();
  // Some skills are named with the opening of their own description.
  const repeats = description.toLowerCase().startsWith(name.toLowerCase());
  return truncate(repeats ? description : `${name}: ${description}`, WHY_MAX);
}

const ACCESS_WORDS: Record<string, string> = {
  api: 'API',
  mcp: 'MCP',
  cli: 'CLI',
  'browser-extension': 'browser extension',
};

/**
 * How the task's listings are picked, in plain words: "Picked from listings
 * that mention database, sql, postgres or mongodb in their name,
 * description, tags or skills; those in Data & Analytics or Infrastructure,
 * or with MCP access, rank higher."
 */
export function taskExplanation(task: Task, categoryName: (slug: string) => string): string {
  const keywords = joinList(task.keywords, 'or');
  const categories = joinList(task.categories.map(categoryName), 'or');
  const access = joinList(task.access.map((m) => ACCESS_WORDS[m] ?? m), 'or');
  return `Picked from listings that mention ${keywords} in their name, description, tags or skills; those in ${categories}, or with ${access} access, rank higher.`;
}

/**
 * Tasks like `task`, most alike first: those that fit the same listings
 * (from two in common up, scaled by the size of both lists) or share its
 * categories (the share of their categories in common, counting half).
 */
export function relatedTasks(task: Task, tasks: Task[], catalog: Agent[], n = RELATED_TASKS): Task[] {
  const mine = new Set(taskMatches(catalog, task).map((a) => a.slug));
  return tasks
    .filter((t) => t.slug !== task.slug)
    .map((t) => {
      const theirs = taskMatches(catalog, t);
      const shared = theirs.filter((a) => mine.has(a.slug)).length;
      const listings = shared >= 2 ? shared / Math.sqrt(mine.size * theirs.length) : 0;
      const categories =
        task.categories.filter((c) => t.categories.includes(c)).length /
        new Set([...task.categories, ...t.categories]).size;
      return { t, score: listings + categories / 2 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ t }) => t);
}

export interface TaskStack {
  stack: Stack;
  /** The stack's listings that fit the task, in the stack's order. */
  shared: Agent[];
}

/** Stacks with listings that fit the task (`fits`): most of them first, then in `stacks` order. */
export function relatedStacks(fits: Agent[], stacks: Stack[], n = RELATED_STACKS): TaskStack[] {
  const bySlug = new Map(fits.map((a) => [a.slug, a]));
  return stacks
    .map((stack) => ({ stack, shared: stack.items.flatMap((item) => bySlug.get(item.slug) ?? []) }))
    .filter(({ shared }) => shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, n);
}

/**
 * What is wrong with content/tasks.json beyond its shape: slugs and labels
 * are unique, a task names a keyword, category or access method once, every
 * keyword matches at least one published listing, and every task fits at
 * least TASK_MIN_LISTINGS of them.
 */
export function taskProblems(tasks: Task[], published: Agent[]): string[] {
  const problems: string[] = [];
  const slugs = new Set<string>();
  const labels = new Set<string>();
  for (const task of tasks) {
    if (slugs.has(task.slug)) problems.push(`duplicate task slug "${task.slug}"`);
    slugs.add(task.slug);
    if (labels.has(task.label.toLowerCase())) problems.push(`${task.slug}: another task is labelled "${task.label}"`);
    labels.add(task.label.toLowerCase());

    for (const [field, values] of [
      ['keyword', task.keywords],
      ['category', task.categories],
      ['access method', task.access],
    ] as const) {
      const seen = new Set<string>();
      for (const value of values) {
        if (seen.has(value.toLowerCase())) problems.push(`${task.slug}: ${field} "${value}" is listed twice`);
        seen.add(value.toLowerCase());
      }
    }

    for (const keyword of task.keywords) {
      if (!published.some((a) => taskScore(a, { ...task, keywords: [keyword] }).points > 0)) {
        problems.push(`${task.slug}: no published listing mentions "${keyword}"`);
      }
    }
    const fits = taskMatches(published, task).length;
    if (fits < TASK_MIN_LISTINGS) {
      problems.push(`${task.slug}: fits ${fits} published listing(s); a task needs at least ${TASK_MIN_LISTINGS}, or is cut`);
    }
  }
  return problems;
}
