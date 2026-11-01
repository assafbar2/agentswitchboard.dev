/**
 * "Try this first": up to three ready-to-paste prompts per listing, built from
 * its own skills so nothing is invented. A skill's description opens with what
 * it does ("Searches files by keyword…"); that opening verb phrase becomes the
 * prompt ("Use Box MCP to search files: ‹what you're looking for›").
 *
 * A skill whose description doesn't open with something a person would ask for
 * gets no prompt: descriptive openers ("Provides", "Lets", "Exposes"), code,
 * marketing numbers, and phrases that can't end cleanly within
 * MAX_ACTION_WORDS. When in doubt a skill is skipped, never cut mid-thought.
 */

import type { Agent } from './types';

export const MAX_PROMPTS = 3;
/** Longest verb phrase worth pasting. */
export const MAX_ACTION_WORDS = 10;

export interface TryPrompt {
  skillId: string;
  skillName: string;
  text: string;
}

export interface TryThis {
  /** MCP listings are prompted from an assistant with the server connected; API and CLI ones from a coding agent. */
  audience: 'assistant' | 'coding-agent';
  prompts: TryPrompt[];
}

// Base forms. A description opening with a verb not listed here gets no prompt.
const ACTION_VERBS = new Set([
  'access', 'add', 'aggregate', 'analyse', 'analyze', 'annotate', 'answer', 'append', 'apply', 'archive', 'arrange',
  'ask', 'assemble', 'assess', 'assign', 'attach', 'audit', 'authenticate', 'authorize', 'auto-detect',
  'auto-discover', 'auto-extract', 'automate', 'batch', 'benchmark', 'blend', 'book', 'boot', 'bootstrap', 'branch',
  'break', 'browse', 'build', 'buy', 'cache', 'calculate', 'call', 'cancel', 'capture', 'chain', 'chat', 'check',
  'chunk', 'classify', 'clean', 'click', 'clip', 'clone', 'cluster', 'collect', 'combine', 'commit', 'compact',
  'compare', 'compile', 'complete', 'compose', 'compress', 'compute', 'configure', 'connect', 'consolidate', 'consult',
  'control', 'convert', 'coordinate', 'copy', 'correlate', 'count', 'crawl', 'create', 'curate', 'cut', 'debug',
  'decompile', 'decompose', 'define', 'delegate', 'delete', 'deliver', 'deploy', 'derive', 'design', 'detect',
  'diagnose', 'dictate', 'diff', 'discover', 'dispatch', 'distill', 'distribute', 'download', 'draft', 'draw', 'drive',
  'dump', 'edit', 'enrich', 'enumerate', 'escalate', 'estimate', 'evaluate', 'execute', 'explain', 'explore', 'export',
  'extract', 'fan', 'fetch', 'file', 'fill', 'filter', 'find', 'fine-tune', 'fix', 'flag', 'forecast', 'fork',
  'format', 'fuzzy-search', 'gather', 'generate', 'get', 'grade', 'group', 'identify', 'import', 'index', 'ingest',
  'initialize', 'initiate', 'inspect', 'install', 'instruct', 'instrument', 'investigate', 'invoke', 'issue', 'join',
  'label', 'launch', 'link', 'lint', 'list', 'load', 'localize', 'locate', 'lock', 'log', 'look', 'manage', 'map',
  'mark', 'match', 'measure', 'merge', 'mine', 'mint', 'mix', 'moderate', 'monitor', 'mount', 'move', 'navigate',
  'normalize', 'notify', 'open', 'optimize', 'orchestrate', 'organize', 'pack', 'page', 'pair', 'parse', 'pause', 'pay',
  'perform', 'pick', 'place', 'plan', 'poll', 'post', 'post-process', 'predict', 'prepare', 'preview', 'probe',
  'process', 'produce', 'profile', 'promote', 'propose', 'provision', 'publish', 'pull', 'push', 'quantize', 'query',
  'queue', 'rank', 'rate', 're-rank', 'read', 'recall', 'receive', 'recognize', 'recommend', 'reconcile', 'record',
  'recover', 'redact', 'reduce', 'refactor', 'refresh', 'regenerate', 'register', 'remove', 'render', 'reopen',
  'reorder', 'repair', 'replace', 'replay', 'reply', 'report', 'reproduce', 'rerank', 'rerun', 'research', 'reserve',
  'resolve', 'restart', 'restore', 'resume', 'retrieve', 'retry', 'review', 'rewrite', 'rotate', 'route', 'run', 'save',
  'scaffold', 'scan', 'schedule', 'score', 'scrape', 'screen', 'scroll', 'search', 'segment', 'select', 'send', 'set',
  'share', 'show', 'sign', 'simulate', 'snapshot', 'solve', 'sort', 'spawn', 'spend', 'spin', 'split', 'start', 'stop',
  'store', 'stream', 'structure', 'submit', 'subscribe', 'suggest', 'summarise', 'summarize', 'suspend', 'swap',
  'switch', 'sync', 'synchronise', 'synchronize', 'synthesize', 'tag', 'take', 'tap', 'test', 'trace', 'track', 'train',
  'transcribe', 'transform', 'translate', 'traverse', 'triage', 'trigger', 'turn', 'unify', 'update', 'upload',
  'upsert', 'validate', 'vectorize', 'verify', 'version', 'view', 'visualize', 'void', 'watch', 'wire', 'write',
]);

/** Descriptions say what a tool returns; asked for, that's getting it. */
const RETURN = new Set(['return']);

/** Setting something up is a poor first try, so these skills come after ones that do a task. */
const SETUP_VERBS = new Set([
  'attach', 'authenticate', 'authorize', 'boot', 'bootstrap', 'configure', 'connect', 'define', 'initialize', 'install',
  'mount', 'pair', 'provision', 'register', 'route', 'select', 'set', 'sign', 'switch', 'wire',
]);

/** Verbs that mark a second action ("…and returns", "…or refines") but never open a prompt. */
const OTHER_VERBS = new Set([
  'accept', 'act', 'allow', 'approve', 'block', 'bring', 'cap', 'change', 'choose', 'clear', 'consume', 'decide', 'emit',
  'enable', 'expose', 'fall', 'forward', 'give', 'guard', 'help', 'keep', 'let', 'light', 'make', 'offer', 'persist',
  'provide', 'put', 'quarantine', 'raise', 'recalculate', 're-grade', 're-run', 'refine', 'reject', 'rename', 'replan',
  'return', 'revoke', 'see', 'serve', 'ship', 'slice', 'support', 'surface', 'use', 'wait', 'wake',
]);

/** Words that end the verb phrase: what follows is how it works, not what it does. */
const STOP_WORDS = new Set([
  'after', 'already', 'also', 'are', 'based', 'be', 'because', 'been', 'before', 'by', 'can', 'could', 'does', 'e.g',
  'eg', 'etc', 'has', 'have', 'how', 'i.e', 'ie', 'including', 'instead', 'is', 'like', 'may', 'might', 'must', 'plus',
  'rather', 'should', 'since', 'so', 'still', 'such', 'than', 'that', 'then', 'through', 'unless', 'until', 'using',
  'via', 'was', 'were', 'what', 'when', 'whenever', 'where', 'whether', 'which', 'while', 'who', 'whose', 'why', 'will',
  'with', 'without', 'would',
]);

/** Stopping at one of these strands its clause's subject: "docs the user | can open". */
const AUXILIARIES = new Set(['are', 'be', 'been', 'can', 'could', 'does', 'has', 'have', 'is', 'may', 'might', 'must', 'should', 'was', 'were', 'will', 'would']);

/**
 * After a comma, "wiring inputs, tools and outputs" is a clause but "testing
 * utilities, and deployment helpers" a list item; these verbs start clauses.
 */
const CLAUSE_VERBS = new Set([...OTHER_VERBS, 'add', 'combine', 'cover', 'create', 'ensure', 'generate', 'leave', 'produce', 'save', 'send', 'store', 'turn', 'wire']);
const participle = (word: string) => {
  const stem = word.replace(/ing$/, '');
  return [stem, `${stem}e`, stem.slice(0, -1)].some((v) => CLAUSE_VERBS.has(v));
};

/** After a comma, these start a new clause rather than continue a list. */
const CLAUSE_STARTS = new Set([
  'about', 'across', 'against', 'all', 'along', 'alongside', 'among', 'around', 'as', 'at', 'between', 'both', 'during',
  'each', 'even', 'for', 'from', 'in', 'inside', 'into', 'just', 'no', 'not', 'on', 'only', 'onto', 'over', 'per', 'to',
  'under', 'within',
]);

/** A phrase too long to paste can end before one of these, keeping the verb and its object. */
const PREPOSITIONS = new Set([
  'about', 'across', 'against', 'along', 'alongside', 'among', 'around', 'as', 'at', 'between', 'during', 'for', 'from',
  'in', 'inside', 'into', 'on', 'onto', 'over', 'per', 'to', 'toward', 'towards', 'under', 'within',
]);

/**
 * A verb list shares its object, but what follows the object usually belongs
 * to one verb: "Creates, modifies, and applies labels to messages".
 */
const LIST_STOPS = new Set(['about', 'against', 'as', 'for', 'from', 'into', 'onto', 'to', 'toward', 'towards']);

/** Right after the verb, these describe where or how the product runs ("runs on your machine", "embeds as a library"). */
const DESCRIPTIVE_STARTS = new Set(['as', 'inside', 'on', 'within']);

/** Words a phrase can't end on once it's cut. */
const DANGLING = new Set([
  'a', 'about', 'across', 'against', 'all', 'among', 'an', 'and', 'any', 'around', 'as', 'at', 'best', 'between',
  'each', 'every', 'fewer', 'for', 'from', 'in', 'into', 'it', 'its', 'less', 'more', 'of', 'on', 'only', 'or', 'over',
  'per', 'the', 'their', 'them', 'these', 'they', 'this', 'those', 'to', 'toward', 'towards', 'under', 'up', 'we',
  'within', 'you', 'your',
]);

/** "look up", "rolls out": a particle belongs to the verb, not its object. */
const PARTICLES = new Set(['away', 'back', 'down', 'off', 'out', 'up']);

/** Words ending in -ly that aren't adverbs ("disassembly", "biweekly", "read-only"). */
const NOT_ADVERB =
  /(?:anomaly|apply|assembly|costly|daily|early|elderly|family|friendly|hourly|likely|monthly|multiply|nightly|-only|orderly|quarterly|reply|supply|timely|weekly|yearly)$/;

/**
 * What's left hanging once the rest of its clause is cut: "the roles covered",
 * "agents running", "components ready".
 */
const PARTICIPLES = new Set(['built', 'done', 'found', 'given', 'held', 'kept', 'known', 'made', 'sent', 'shown', 'taken', 'written']);
const ADJECTIVES = new Set(['accessible', 'available', 'capable', 'compatible', 'ideal', 'ready', 'suitable', 'usable']);
const hangs = (word: string, before: string) =>
  /[^e]ed$/.test(word) || PARTICIPLES.has(word) || ADJECTIVES.has(word) || (/ing$/.test(word) && /s$/.test(before));

/** Speed claims ("in seconds", "in under 50ms") say how fast it is, not what to do. */
const SPEED_CLAIM = / in (?:under |about |just |a few |less than )?(?:a |one |\d+ ?)?(?:second|minute|millisecond|ms)s?$/i;

const DETERMINERS = new Set(['a', 'an', 'any', 'each', 'every', 'it', 'its', 'one', 'their', 'them', 'the', 'your']);

const SEARCH_VERBS = new Set(['browse', 'discover', 'explore', 'find', 'fuzzy-search', 'locate', 'look', 'query', 'research', 'retrieve', 'search']);

/** The product starting its own server isn't something to ask for. */
const SERVES_ITSELF = /^(?:run|start|launch) (?:a |an |the |its )?(?:\w+ )?(?:MCP )?server\b/i;

const strip = (word: string) => word.replace(/[,:;.!?)\]"]+$/, '');
const bare = (word: string | undefined) => strip(word ?? '').toLowerCase();
const isAdverb = (word: string) => /^[a-z][a-z-]{2,}ly$/.test(word) && !NOT_ADVERB.test(word);
const isAndOr = (word: string | undefined) => bare(word) === 'and' || bare(word) === 'or';
const thirdPerson = (word: string) => /[^su]s$/.test(word);
const deinflect = (word: string) => word.replace(/ies$/, 'y').replace(/(?:(?<=[sxz]|[cs]h)e)?s$/, '');

/** Marketing numbers ("7,500+ tools", "cut spend 40-70%"), code, paths and package names don't belong in a prompt; file types (".docx") do. */
const unpromptable = (word: string) =>
  /\d\+|\d%|[`_(){}<>=\\]/.test(word) || /^[/@-]/.test(word) || (word.startsWith('.') && !/^\.[a-z0-9]{2,5}$/i.test(strip(word)));

/** "Searches" → "search", "Applies" → "apply", "Create" → "create"; null unless it's in `verbs`. */
function baseVerb(word: string | undefined, verbs: Set<string> = ACTION_VERBS): string | null {
  const w = bare(word);
  return [w, w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y')].find((c) => verbs.has(c)) ?? null;
}

/** words[j] in a run of verbs ("Fetches, searches, and deletes"), as its base form. */
function listedVerb(word: string | undefined, imperative: boolean): string | null {
  const w = bare(word);
  if (!w || DANGLING.has(w) || DETERMINERS.has(w) || STOP_WORDS.has(w) || isAdverb(w)) return null;
  const known = baseVerb(w) ?? baseVerb(w, OTHER_VERBS);
  if (known) return known;
  if (imperative) return thirdPerson(w) ? null : w;
  return thirdPerson(w) ? deinflect(w) : null;
}

/**
 * words[j] follows "and"/"or" after the object: does it start a second action
 * ("…and returns a task", "…and is turned off") rather than add to the object
 * ("…and issues")? A known verb ending the description reads as a plural.
 */
function startsSecondAction(words: string[], j: number, imperative: boolean): boolean {
  const word = bare(words[j]);
  if (!word) return false;
  if (STOP_WORDS.has(word) || isAdverb(word)) return true;
  if (DANGLING.has(word) || DETERMINERS.has(word)) return false;
  if (!/^[a-z-]+$/.test(strip(words[j]))) return false;
  const known = baseVerb(word) ?? baseVerb(word, OTHER_VERBS);
  if (known && (thirdPerson(word) || imperative)) return OTHER_VERBS.has(known) || j < words.length - 1;
  const next = bare(words[j + 1]);
  const objectFollows =
    !!next && !words[j].endsWith(',') && (DETERMINERS.has(next) || !(STOP_WORDS.has(next) || CLAUSE_STARTS.has(next) || isAndOr(next)));
  return !known && thirdPerson(word) && objectFollows;
}

/**
 * After a comma: does words[j] start a clause ("…, returning X", "…, with Y",
 * "…, slices references") rather than continue a list ("…, PRs, and commits")?
 */
function startsClause(words: string[], j: number, imperative: boolean): boolean {
  const word = bare(words[j]);
  if (!word) return true;
  if (STOP_WORDS.has(word) || CLAUSE_STARTS.has(word) || isAdverb(word)) return true;
  if (isAndOr(word)) return startsSecondAction(words, j + 1, imperative);
  const next = bare(words[j + 1]);
  if (isAndOr(next)) return baseVerb(word) !== null && (thirdPerson(word) || imperative) && startsSecondAction(words, j + 2, imperative);
  if (words[j].endsWith(',') || !next || !/^[a-z-]+$/.test(strip(words[j]))) return false;
  if (/ing$/.test(word)) return participle(word) || !words[j + 1].endsWith(',');
  if (imperative) return ACTION_VERBS.has(word) || OTHER_VERBS.has(word);
  return thirdPerson(word) && !STOP_WORDS.has(next) && !CLAUSE_STARTS.has(next);
}

interface Head {
  words: string[];
  /** Index of the first word after the verb(s). */
  next: number;
  /** A run of verbs sharing one object, of which the prompt names one. */
  list: boolean;
  /** "Search files" rather than "Searches files". */
  imperative: boolean;
}

/**
 * The verb the prompt opens with: "Looks up and retrieves contacts" →
 * "look up and retrieve"; from a run of verbs ("Fetches, searches, and deletes
 * messages") the one worth trying first.
 */
function parseHead(words: string[], i: number): Head | null {
  const opener = words[i];
  const verb = baseVerb(opener) ?? (baseVerb(opener, RETURN) ? 'get' : null);
  if (!verb) return null;
  const imperative = !thirdPerson(bare(opener));

  if (opener.endsWith(',')) {
    const verbs = [[verb]];
    let k = i + 1;
    for (;;) {
      const last = isAndOr(words[k]);
      if (last) k++;
      const listed = listedVerb(words[k], imperative);
      if (!listed) return null;
      const item = [listed];
      if (!words[k].endsWith(',') && PARTICLES.has(bare(words[k + 1])) && words[k + 2]) item.push(bare(words[++k]));
      verbs.push(item);
      const comma = words[k++].endsWith(',');
      if (last) {
        if (comma) return null;
        break;
      }
      if (!comma && !isAndOr(words[k])) return null;
    }
    const pick = verbs.find(([v]) => SEARCH_VERBS.has(v)) ?? verbs.find(([v]) => ACTION_VERBS.has(v)) ?? verbs[0];
    return { words: pick, next: k, list: true, imperative };
  }

  const head = [verb];
  let k = i + 1;
  const particle = () => {
    if (PARTICLES.has(bare(words[k])) && words[k + 1] && !words[k].endsWith(',')) head.push(bare(words[k++]));
  };
  particle();
  if (isAndOr(words[k])) {
    const second = listedVerb(words[k + 1], imperative);
    if (second && !words[k + 1].endsWith(',')) {
      head.push(bare(words[k]), second);
      k += 2;
      particle();
    }
  }
  return { words: head, next: k, list: false, imperative };
}

/**
 * A comma list with no "and"/"or" yet ("the prompts, transcript"): it was cut
 * before its end. Adjectives sharing one noun ("clean, LLM-ready markdown")
 * are not a list.
 */
function openList(phrase: string[]): boolean {
  const lastComma = phrase.findLastIndex((w) => w.endsWith(','));
  if (lastComma < 0 || lastComma === phrase.length - 1) return false;
  const rest = phrase.slice(lastComma + 1);
  if (rest.some(isAndOr)) return false;
  const before = strip(phrase[lastComma]);
  const adjectives = /^[a-z][a-z-]*$/.test(before) && !/(?:s|ing)$/.test(before) && rest.length >= 2 && !/s$/.test(bare(rest[0]));
  return !adjectives;
}

/**
 * The opening verb phrase of a skill description, as an imperative:
 * "Renders Jetpack Compose previews to images, with no device" →
 * "render Jetpack Compose previews to images". Null when it doesn't open with
 * an action or can't end cleanly within MAX_ACTION_WORDS.
 */
export function skillAction(description: string): string | null {
  const words = description
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z])|;\s*|\s[—–-]\s/)[0]
    .replace(/[.!?]+$/, '')
    .replace(/\b(\w+) by \1\b/gi, '$1-by-$1')
    .split(/\s+/)
    .filter(Boolean);
  const adverb = words.length > 1 && isAdverb(words[0].toLowerCase()) ? [words[0].toLowerCase()] : [];
  if (DESCRIPTIVE_STARTS.has(bare(words[adverb.length + 1]))) return null;
  const head = parseHead(words, adverb.length);
  if (!head) return null;

  const phrase = [...adverb, ...head.words];
  const objectsFrom = phrase.length;
  for (let j = head.next; j < words.length; j++) {
    const raw = words[j];
    if (/^[([—–"'‘“]/.test(raw)) break;
    const word = strip(raw);
    const lower = word.toLowerCase();
    const purpose = lower === 'to' && (ACTION_VERBS.has(bare(words[j + 1])) || OTHER_VERBS.has(bare(words[j + 1])));
    if (STOP_WORDS.has(lower) || isAdverb(lower) || (head.list && LIST_STOPS.has(lower)) || purpose) {
      if (AUXILIARIES.has(lower)) {
        let subject = phrase.length - 1;
        while (subject > objectsFrom && !(DETERMINERS.has(bare(phrase[subject])) && !DANGLING.has(bare(phrase[subject - 1])))) subject--;
        if (subject > objectsFrom) phrase.length = subject;
      }
      break;
    }
    if (isAndOr(lower) && startsSecondAction(words, j + 1, head.imperative)) break;
    if (raw.endsWith(',') && !startsClause(words, j + 1, head.imperative)) {
      phrase.push(`${word},`);
      continue;
    }
    phrase.push(word);
    if (word !== raw) break;
  }

  const limit = MAX_ACTION_WORDS + adverb.length;
  if (phrase.length > limit) {
    let at = limit;
    while (at > objectsFrom && !(PREPOSITIONS.has(phrase[at].toLowerCase()) && !phrase[at - 1].endsWith(','))) at--;
    if (at <= objectsFrom) return null;
    phrase.length = at;
  }
  const last = (n = 1) => bare(phrase[phrase.length - n]);
  while (phrase.length > objectsFrom + 1 && hangs(last(), last(2))) phrase.pop();
  while (phrase.length > objectsFrom && DANGLING.has(last())) phrase.pop();
  phrase[phrase.length - 1] = strip(phrase[phrase.length - 1]);

  const objects = phrase.slice(objectsFrom).filter((w) => !PARTICLES.has(bare(w)));
  const text = phrase.join(' ').replace(SPEED_CLAIM, '');
  if (objects.length === 0 || openList(phrase) || phrase.some(unpromptable) || SERVES_ITSELF.test(text)) return null;
  return text;
}

const verbOf = (action: string) => action.split(' ').find((w) => ACTION_VERBS.has(w)) ?? '';
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function slotFor(action: string): string {
  const verb = verbOf(action);
  if (verb === 'ask' || verb === 'answer') return 'your question';
  if (SEARCH_VERBS.has(verb)) return "what you're looking for";
  return 'what you need';
}

/** The listing's prompts, or null when it has no skill that makes one (or no way in an assistant or coding agent can use). */
export function tryThis(agent: Pick<Agent, 'name' | 'skills' | 'accessMethods'>): TryThis | null {
  const audience = agent.accessMethods.includes('mcp')
    ? 'assistant'
    : agent.accessMethods.some((m) => m === 'api' || m === 'cli')
      ? 'coding-agent'
      : null;
  if (!audience) return null;

  // "Use Flyte to run Flyte 2" only restates the listing.
  const runsItself = new RegExp(`^(?:\\w+ly )?(?:boot|deploy|install|launch|run|start) ${escapeRegExp(agent.name.split(' ')[0])}\\b`, 'i');
  const seen = new Set<string>();
  const candidates = agent.skills.flatMap((skill) => {
    const action = skillAction(skill.description);
    if (!action || runsItself.test(action) || seen.has(action.toLowerCase())) return [];
    seen.add(action.toLowerCase());
    return [{ skill, action }];
  });
  const setup = candidates.filter((c) => SETUP_VERBS.has(verbOf(c.action)));
  const prompts = [...candidates.filter((c) => !setup.includes(c)), ...setup]
    .slice(0, MAX_PROMPTS)
    .map(({ skill, action }) => ({ skillId: skill.id, skillName: skill.name, text: `Use ${agent.name} to ${action}: ‹${slotFor(action)}›` }));
  return prompts.length > 0 ? { audience, prompts } : null;
}
