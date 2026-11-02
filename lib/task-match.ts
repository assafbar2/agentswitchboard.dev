/**
 * Free text to a task: what a visitor types after "I need an agent to…"
 * ("read my email") goes to the task that names it, as a task chip would.
 * A typed word scores 2 when it is part of one of the task's keywords, all
 * of whose words were typed, or else 1 when it is in the task's label; the
 * whole label scores 3 more. A task needs 2 and more than any other, so one
 * stray label word ("build") or a tie picks nothing and the text runs as a
 * search. Client-safe: the homepage box runs it on every keystroke.
 */

/** What matching needs of a task (lib/tasks.ts Task). */
export interface TaskTerms {
  slug: string;
  label: string;
  keywords: string[];
}

export interface RankedTask<T extends TaskTerms> {
  task: T;
  score: number;
}

/** The least a task scores to be picked: one keyword, or two words of its label. */
export const TASK_MATCH_MIN = 2;

// Built with new RegExp so the 'u'-flag syntax isn't checked against the ES2017 target.
const WORD = new RegExp('[\\p{L}\\p{N}]+', 'gu');

/** Words that pick no task. "I need an agent to…" already says the last five. */
const FILLER = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'for', 'with', 'in', 'on', 'at', 'by', 'from', 'into',
  'my', 'our', 'your', 'their', 'me', 'us', 'i', 'it', 'its', 'this', 'that', 'some', 'all', 'any',
  'agent', 'agents', 'ai', 'bot', 'bots',
]);

/** Everyday words for the ones task labels and keywords use. */
const ALIASES = new Map([
  ['db', 'database'],
  ['dbs', 'databases'],
  ['doc', 'document'],
  ['docs', 'documents'],
  ['repo', 'repository'],
  ['repos', 'repositories'],
  ['pg', 'postgres'],
  ['gh', 'github'],
  ['mail', 'email'],
  ['internet', 'web'],
  ['online', 'web'],
  ['site', 'website'],
  ['sites', 'websites'],
  ['webpage', 'website'],
  ['webpages', 'websites'],
  ['photo', 'image'],
  ['photos', 'images'],
  ['picture', 'image'],
  ['pictures', 'images'],
  ['tweet', 'twitter'],
  ['tweets', 'twitter'],
  ['create', 'generate'],
]);

/** Lowercased words that can pick a task, in order, with ALIASES applied. */
function wordsOf(text: string): string[] {
  return (text.toLowerCase().match(WORD) ?? []).map((w) => ALIASES.get(w) ?? w).filter((w) => !FILLER.has(w));
}

/** A word without its ending: "invoices" is "invoice", "scraping" "scrap", "libraries" "library", "planning" "plan". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  for (const ending of ['ing', 'ed']) {
    if (word.length >= ending.length + 3 && word.endsWith(ending)) {
      const base = word.slice(0, -ending.length);
      // A doubled consonant before the ending is spelling ("planning"), but not in "billing" or "passed".
      return /([bdgmnprt])\1$/.test(base) ? base.slice(0, -1) : base;
    }
  }
  if (word.length >= 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * True when two words are one, give or take an ending: "emails" and
 * "email", "coding" and "code", or "transcription" and "transcribe", which
 * share all but their last two letters (at least five).
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  const x = stem(a);
  const y = stem(b);
  if (x === y || x === `${y}e` || y === `${x}e`) return true;
  let common = 0;
  while (common < a.length && a[common] === b[common]) common++;
  return common >= Math.max(5, Math.min(a.length, b.length) - 2);
}

interface Keyword {
  words: string[];
  /** "X to Y" keywords keep their order, so "speech to text" is not "text-to-speech". */
  ordered: boolean;
}

interface Prepared {
  label: string[];
  keywords: Keyword[];
}

const preparedTasks = new WeakMap<TaskTerms, Prepared>();

function prepare(task: TaskTerms): Prepared {
  let prepared = preparedTasks.get(task);
  if (!prepared) {
    prepared = {
      label: [...new Set(wordsOf(task.label))],
      keywords: task.keywords
        .map((k) => ({ words: wordsOf(k), ordered: /\bto\b/i.test(k) }))
        .filter((k) => k.words.length > 0),
    };
    preparedTasks.set(task, prepared);
  }
  return prepared;
}

/** Where each word of `keyword` is in `text`, in the keyword's order when it has one, or null when one is missing. */
function keywordAt(keyword: Keyword, text: string[]): number[] | null {
  const found: number[] = [];
  let from = 0;
  for (const word of keyword.words) {
    const at = text.findIndex((w, i) => i >= from && !found.includes(i) && sameWord(w, word));
    if (at < 0) return null;
    found.push(at);
    if (keyword.ordered) from = at + 1;
  }
  return found;
}

function scoreOf(text: string[], task: TaskTerms): number {
  const { label, keywords } = prepare(task);
  const inKeywords = new Set(keywords.flatMap((k) => keywordAt(k, text) ?? []));
  const inLabel = label.map((w) => text.findIndex((t) => sameWord(t, w))).filter((at) => at >= 0);
  const labelOnly = new Set(inLabel.filter((at) => !inKeywords.has(at))).size;
  return inKeywords.size * 2 + labelOnly + (label.length > 0 && inLabel.length === label.length ? 3 : 0);
}

/** The tasks `text` names at all, highest score first; equal scores keep the order of `tasks`. */
export function rankTasks<T extends TaskTerms>(text: string, tasks: readonly T[]): RankedTask<T>[] {
  const words = wordsOf(text);
  if (words.length === 0) return [];
  return tasks
    .map((task) => ({ task, score: scoreOf(words, task) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);
}

/** The task a ranking picks: the first, when it scores TASK_MATCH_MIN or more, and more than the next. */
export function pickTask<T extends TaskTerms>(ranked: readonly RankedTask<T>[]): T | null {
  const [first, second] = ranked;
  return first && first.score >= TASK_MATCH_MIN && (!second || second.score < first.score) ? first.task : null;
}

/** The task `text` names, or null when it names none clearly enough. */
export function matchTask<T extends TaskTerms>(text: string, tasks: readonly T[]): T | null {
  return pickTask(rankTasks(text, tasks));
}
