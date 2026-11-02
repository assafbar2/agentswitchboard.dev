/**
 * The Operator: a request in the visitor's own words, put through to a
 * stack with a tool for each part. lib/request-parts.ts finds the parts and
 * the task each names. Among the listings that fit a part's task
 * (lib/search.ts taskMatches), those that mention the part's telling words
 * come first: words that some of the fits mention but not most, such as a
 * product's name ("Notion", "Linear"), or that most mention but few in their
 * names ("GitHub"), when only those count. Words that say what to do ("read",
 * "file") and the task's own words (the lowercase ones in its label) never
 * tell. A mention in a listing's name or its provider's counts twice one in
 * its description, which counts twice one in its tags or skill names; among
 * equals, Official listings come first, then the task's own order. An access
 * method ("a Postgres MCP") or "official" in the part then narrows the pick,
 * unless no tool left has it. No model: the same request always gets the
 * same stack.
 */

import { accessAlias, keywordMatcher, taskMatches } from './search';
import { REQUEST_FILLER, requestParts } from './request-parts';
import { ownWords, sameWord, wordsOf } from './task-match';
import { whyItFits, type Task } from './tasks';
import type { Agent } from './types';

/** Fits offered after a part's pick. */
export const OPERATOR_ALTERNATIVES = 2;

/** Words that say what to do with a tool rather than which tool: they never re-rank. */
const DOING = new Set([
  'read', 'write', 'file', 'ping', 'send', 'post', 'put', 'make', 'open', 'find', 'get', 'use', 'run',
  'build', 'generate', 'manage', 'track', 'take', 'give', 'store', 'save', 'keep', 'check', 'set', 'add',
  'turn', 'answer', 'book', 'fix', 'test', 'watch', 'tell', 'show', 'update', 'edit', 'list', 'ask',
  'connect', 'sync', 'move', 'share', 'handle', 'go', 'see', 'look', 'let', 'work', 'start', 'stop', 'up',
  'fill',
]);

/** Words for any listing, which name no product: "a Postgres service" names Postgres. */
const GENERIC = new Set(['app', 'apps', 'service', 'services', 'platform', 'platforms']);

export interface OperatorPart {
  /** The visitor's words for it. */
  text: string;
  task: Task | null;
  /** For a part without a task: the tasks it comes closest to, closest first. */
  nearest: Task[];
  /** Listings that fit the task. */
  fits: number;
  pick: Agent | null;
  alternatives: Agent[];
  /** What the part names that its pick mentions, as typed, words typed next to each other as one: "Notion", "pull requests". */
  named: string[];
  /** What the part asks for that no listing for its task has, so the pick goes without it: "No tool for this task has a CLI." */
  unmet: string[];
  /** Why the pick fits the task, from its skills (lib/tasks.ts whyItFits). */
  why: string | null;
}

export interface Operator {
  /** The request as read (lib/request-parts.ts cleanRequest). */
  request: string;
  parts: OperatorPart[];
  /** Each part's pick, once, in the parts' order. */
  stack: Agent[];
  /** Parts left out past PARTS_MAX. */
  extra: number;
  /** True when the request was cut at REQUEST_MAX characters. */
  cut: boolean;
}

const WORD = new RegExp('[\\p{L}\\p{N}]+', 'gu');

interface Telling {
  word: string;
  /** As typed. */
  typed: string;
  /** Its place among the part's words. */
  at: number;
}

/** A part's words that can tell its task's fits apart, in the order typed. */
function tellingWords(text: string, task: Task): Telling[] {
  const own = ownWords(task);
  const seen = new Map<string, Telling>();
  (text.match(WORD) ?? []).forEach((token, at) => {
    const [word] = wordsOf(token);
    if (word && !seen.has(word)) seen.set(word, { word, typed: token, at });
  });
  return [...seen.values()].filter(
    ({ word }) =>
      !REQUEST_FILLER.has(word) &&
      !DOING.has(word) &&
      !GENERIC.has(word) &&
      !accessAlias(word) &&
      word !== 'official' &&
      !own.some((w) => sameWord(w, word))
  );
}

/** The words as typed, those typed next to each other as one phrase: "pull requests". */
function phrases(words: Telling[]): string[] {
  const out: string[] = [];
  words.forEach(({ typed, at }, i) => {
    if (i > 0 && at === words[i - 1].at + 1) out[out.length - 1] += ` ${typed}`;
    else out.push(typed);
  });
  return out;
}

/** 4 when the listing's name or provider has the word, 2 its description, 1 its tags or skill names, else 0. */
function mentions(agent: Agent, matcher: ReturnType<typeof keywordMatcher>): number {
  const lower = (s: unknown) => (typeof s === 'string' ? s.toLowerCase() : '');
  if ([agent.name, agent.providerName].some((t) => matcher.anywhere(lower(t), true))) return 4;
  if (matcher.anywhere(lower(agent.description))) return 2;
  const skills = (agent.skills ?? []).filter((s) => s && typeof s === 'object').map((s) => s.name);
  return [...(agent.tags ?? []), ...skills].some((t) => matcher.anywhere(lower(t))) ? 1 : 0;
}

/** `fits` with those that mention the telling words first, and what of them their first one mentions. */
function rankFits(fits: Agent[], words: Telling[]) {
  const levels = words.map(({ word }) => {
    const matcher = keywordMatcher(word);
    return fits.map((agent) => mentions(agent, matcher));
  });
  // A word tells from the weakest mention that at most half of the fits reach.
  const telling = levels.flatMap((row, i) => {
    const floor = [1, 2, 4].find((level) => {
      const reach = row.filter((l) => l >= level).length;
      return reach > 0 && reach <= fits.length / 2;
    });
    return floor === undefined ? [] : [{ i, floor }];
  });
  const counted = ({ i, floor }: { i: number; floor: number }, j: number) => (levels[i][j] >= floor ? levels[i][j] : 0);
  const score = fits.map((_, j) => telling.reduce((sum, t) => sum + counted(t, j), 0));
  const official = (j: number) => (score[j] > 0 && fits[j].official ? 1 : 0);
  const order = fits.map((_, j) => j).sort((x, y) => score[y] - score[x] || official(y) - official(x) || x - y);
  return {
    ranked: order.map((j) => fits[j]),
    /** How many of `ranked`, from the first, mention a telling word. */
    mentioning: score.filter((s) => s > 0).length,
    namedBy: (agent: Agent) => {
      const j = fits.indexOf(agent);
      return phrases(telling.filter((t) => counted(t, j) > 0).map((t) => words[t.i]));
    },
  };
}

/** An access method as a sentence names it. */
const AN: Record<string, string> = { api: 'an API', mcp: 'an MCP server', cli: 'a CLI', 'browser-extension': 'a browser extension' };

/** What a part asks of its tool besides the task: an access method ("an mcp") or "official". */
interface Ask {
  keeps: (agent: Agent) => boolean;
  /** "has a CLI" */
  has: string;
}

function asksOf(words: string[]): Ask[] {
  const asks: Ask[] = [...new Set(words.flatMap((w) => accessAlias(w) ?? []))].map((method) => ({
    keeps: (agent) => (agent.accessMethods ?? []).includes(method),
    has: `has ${AN[method]}`,
  }));
  if (words.includes('official')) asks.push({ keeps: (agent) => !!agent.official, has: 'is Official' });
  return asks;
}

/**
 * `fits` narrowed by each ask in turn. An ask that none of them passes is
 * left out, and `unmet` says so, "as well" when `fits` or an earlier ask
 * already left some of the task's tools out.
 */
function narrowed(fits: Agent[], asks: Ask[], unmet: string[], already: boolean): { kept: Agent[]; met: Ask[] } {
  const met: Ask[] = [];
  let kept = fits;
  for (const ask of asks) {
    const left = kept.filter(ask.keeps);
    if (left.length === 0) {
      unmet.push(`No tool for this task ${ask.has}${already || met.length > 0 ? ' as well' : ''}.`);
      continue;
    }
    kept = left;
    met.push(ask);
  }
  return { kept, met };
}

/**
 * The request put through: each part with its task, pick and alternatives,
 * and the stack of picks. A pick mentions what its part names when one of
 * the task's tools does, then has what the part asks for that those can
 * have; the alternatives come from all of the task's tools.
 */
export function putThrough(raw: unknown, tasks: Task[], catalog: Agent[]): Operator {
  const { text, parts, extra, cut } = requestParts(raw, tasks);
  const stack: Agent[] = [];

  const put = parts.map(({ text: words, task, nearest }): OperatorPart => {
    const none = { text: words, task, nearest, fits: 0, pick: null, alternatives: [], named: [], unmet: [], why: null };
    if (!task) return none;
    const all = taskMatches(catalog, task);
    if (all.length === 0) return none;
    const { ranked, mentioning, namedBy } = rankFits(all, tellingWords(words, task));
    const unmet: string[] = [];
    const named = mentioning > 0 ? ranked.slice(0, mentioning) : ranked;
    const { kept, met } = narrowed(named, asksOf(wordsOf(words)), unmet, named.length < ranked.length);
    const pick = kept[0];
    if (!stack.includes(pick)) stack.push(pick);
    return {
      text: words,
      task,
      nearest,
      fits: all.length,
      pick,
      alternatives: ranked.filter((a) => a !== pick && met.every((ask) => ask.keeps(a))).slice(0, OPERATOR_ALTERNATIVES),
      named: namedBy(pick),
      unmet,
      why: whyItFits(pick, task),
    };
  });

  return { request: text, parts: put, stack, extra, cut };
}
