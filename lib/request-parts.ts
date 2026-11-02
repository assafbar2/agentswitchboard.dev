/**
 * A request in the visitor's own words ("read my Notion, file Linear
 * tickets, ping me on Slack") as its parts, each with the task it names
 * (lib/task-match.ts), for the Operator (lib/operator.ts).
 *
 * Commas, full stops, new lines, "then", "also" and "plus" end a part. "And",
 * "&" and "+" end one unless the words on one side name no task alone, so
 * "send and read email" stays whole. A part that could be one of two tasks
 * takes the one no other part names ("translate documents and read PDFs"),
 * and one too vague for a task joins the part whose task it comes closest to
 * ("send, read and archive email"). Parts that name the same task become
 * one, unless each names it by keywords of its own, as "Slack and Discord"
 * do. Client-safe: the homepage box shows the parts as you type.
 */

import { namedKeywords, pickTask, rankTasks, TASK_MATCH_MIN, wordsOf, type RankedTask, type TaskTerms } from './task-match';

/** Characters of a request that are read; the rest is cut at a word. */
export const REQUEST_MAX = 300;
/** Parts put through; the rest are left out. */
export const PARTS_MAX = 6;
/** Tasks offered for a part that names none clearly. */
export const NEAREST_TASKS = 3;

/** Requests to try, the first also the box's placeholder and /operator's share card. */
export const OPERATOR_EXAMPLES = [
  'read my Notion, file Linear tickets, ping me on Slack',
  'query Postgres and send email',
  'monitor errors with Sentry and open Jira tickets',
  'review my pull requests, deploy to Vercel',
];

export interface RequestPart<T extends TaskTerms> {
  /** The visitor's words for it. */
  text: string;
  task: T | null;
  /** For a part without a task: the tasks it comes closest to that no other part names, closest first. */
  nearest: T[];
}

export interface ParsedRequest<T extends TaskTerms> {
  /** The request as read: one line, at most REQUEST_MAX characters. */
  text: string;
  parts: RequestPart<T>[];
  /** Parts past PARTS_MAX, left out. */
  extra: number;
  /** True when the request was longer than REQUEST_MAX. */
  cut: boolean;
}

/** Words that say nothing about the job on their own: a part of nothing else ("please") is dropped. */
export const REQUEST_FILLER = new Set([
  'need', 'needs', 'want', 'wants', 'would', 'like', 'please', 'thanks', 'thank', 'hi', 'hello', 'hey',
  'can', 'could', 'should', 'will', 'just', 'so', 'too', 'also', 'then', 'them', 'they', 'these', 'those',
  'there', 'here', 'what', 'when', 'where', 'which', 'who', 'how', 'is', 'are', 'be', 'was', 'were',
  'do', 'does', 'has', 'have', 'something', 'someone', 'thing', 'things', 'stuff', 'way', 'able', 'help',
  'about', 'across', 'after', 'against', 'as', 'before', 'between', 'during', 'each', 'every', 'if', 'many',
  'more', 'most', 'much', 'no', 'not', 'off', 'onto', 'out', 'over', 'per', 'than', 'through', 'using',
  'very', 'via', 'within', 'without',
]);

/** A separator, kept so a merged part reads as typed. */
const SEPARATOR = /(\s*[\n,;]+\s*|[.?!]+(?=\s|$)\s*|\s+(?:and then|then|also|plus|as well as|and|&|\+)\s+)/i;
const SOFT = /^\s*(?:and|&|\+)\s*$/i;
const LEADING = /^(?:(?:and|then|also|plus|or|but|so)\s+)+/i;
// Built with new RegExp so the 'u'-flag syntax isn't checked against the ES2017 target.
const EDGE_JUNK = new RegExp('^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}+#]+$', 'gu');
/** Control and text-direction characters. */
const UNPRINTABLE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/** The request as one line, at most REQUEST_MAX characters, cut at a word. */
export function cleanRequest(raw: unknown): { text: string; cut: boolean } {
  if (typeof raw !== 'string') return { text: '', cut: false };
  const line = raw
    .replace(/\s*[\r\n]+\s*/g, ', ')
    .replace(UNPRINTABLE, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
  if (line.length <= REQUEST_MAX) return { text: line, cut: false };
  const head = line.slice(0, REQUEST_MAX + 1);
  const atWord = /\s/.test(head) ? head.replace(/\s+\S*$/, '') : head.slice(0, REQUEST_MAX);
  return { text: atWord.replace(/[\s,]+$/, ''), cut: true };
}

/** /operator for this request. */
export function operatorHref(request: string): string {
  const { text } = cleanRequest(request);
  return text ? `/operator?q=${encodeURIComponent(text)}` : '/operator';
}

/** True when `text` has a word that can say what the job is. */
function hasContent(text: string): boolean {
  return wordsOf(text).some((w) => !REQUEST_FILLER.has(w));
}

/** How a separator reads between two merged parts: ", " or " and ". */
function joiner(separator: string): string {
  const s = separator.replace(/\s+/g, ' ').trim();
  return /^[,;.?!]/.test(s) ? `${s.slice(0, 1)} ` : ` ${s} `;
}

/**
 * True when both name `task` by keywords its label doesn't say, none the
 * same: "Slack" and "Discord" each get a tool, while "secrets" and
 * "vulnerabilities" are one scan.
 */
function apart(a: string, b: string, task: TaskTerms): boolean {
  const x = namedKeywords(a, task);
  const y = namedKeywords(b, task);
  return x.length > 0 && y.length > 0 && !x.some((k) => y.includes(k));
}

/** True when the words name no task, not even one of two. */
function vague<T extends TaskTerms>(ranked: readonly RankedTask<T>[]): boolean {
  return !ranked[0] || ranked[0].score < TASK_MATCH_MIN;
}

interface Piece<T extends TaskTerms> {
  text: string;
  /** The separator before it; '' for the first. */
  before: string;
  ranked: RankedTask<T>[];
  task: T | null;
}

/** The pieces between separators, with words that can say what the job is, and "and" undone where a side names no task. */
function piecesOf<T extends TaskTerms>(text: string, tasks: readonly T[]): Piece<T>[] {
  const split = text.split(SEPARATOR);
  const pieces: Piece<T>[] = [];
  let before = '';
  for (let i = 0; i < split.length; i += 2) {
    const words = (split[i] ?? '').replace(LEADING, '').replace(EDGE_JUNK, '').trim();
    if (words && hasContent(words)) {
      const ranked = rankTasks(words, tasks);
      const last = pieces.at(-1);
      const joined = last && SOFT.test(before) && (vague(last.ranked) || vague(ranked)) ? `${last.text}${joiner(before)}${words}` : '';
      const together = joined ? rankTasks(joined, tasks) : [];
      const task = pickTask(together);
      if (last && task) {
        Object.assign(last, { text: joined, ranked: together, task });
      } else {
        pieces.push({ text: words, before: pieces.length > 0 ? before : '', ranked, task: pickTask(ranked) });
      }
      before = '';
    }
    // The separators around a dropped piece separate as the harder of the two.
    if (i + 1 < split.length) before = before && !SOFT.test(split[i + 1]) ? split[i + 1] : before || split[i + 1];
  }
  return pieces;
}

/** The parts of a request, in order, each with its task or the tasks it comes closest to. */
export function requestParts<T extends TaskTerms>(raw: unknown, tasks: readonly T[]): ParsedRequest<T> {
  const { text, cut } = cleanRequest(raw);
  const pieces = piecesOf(text, tasks);

  const named = new Set(pieces.flatMap((p) => p.task ?? []));
  const resolved = pieces.map((piece) => {
    if (piece.task || piece.ranked.length === 0) return piece.task;
    const best = piece.ranked[0].score;
    const top = piece.ranked.filter((r) => r.score === best).map((r) => r.task);
    if (best < TASK_MATCH_MIN) return top.length === 1 && named.has(top[0]) ? top[0] : null;
    const open = top.filter((t) => !named.has(t));
    return open.length === 1 ? open[0] : open.length === 0 ? top[0] : null;
  });

  const parts: { text: string; task: T | null; ranked: RankedTask<T>[]; last: number }[] = [];
  pieces.forEach((piece, at) => {
    const task = resolved[at];
    const same = task ? parts.find((p) => p.task === task && !apart(p.text, piece.text, task)) : undefined;
    if (!same) {
      parts.push({ text: piece.text, task, ranked: piece.ranked, last: at });
      return;
    }
    same.text += `${same.last === at - 1 && piece.before ? joiner(piece.before) : ', '}${piece.text}`;
    same.last = at;
  });

  const kept = parts.slice(0, PARTS_MAX);
  const taken = new Set(kept.flatMap((p) => p.task ?? []));
  return {
    text,
    parts: kept.map(({ text: words, task, ranked }) => ({
      text: words,
      task,
      nearest: task
        ? []
        : ranked
            .map((r) => r.task)
            .filter((t) => !taken.has(t))
            .slice(0, NEAREST_TASKS),
    })),
    extra: parts.length - kept.length,
    cut,
  };
}
