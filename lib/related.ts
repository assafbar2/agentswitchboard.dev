import type { Agent } from './types';

/**
 * "Related Agents" on a listing page: genuine alternatives to the agent being
 * viewed, not a loose neighbourhood.
 *
 * A candidate qualifies only when it
 *   1. lists the current agent's primary category (its first category),
 *   2. shares at least one access method (API, MCP, CLI or Extension), so a
 *      developer could swap one for the other, and
 *   3. overlaps on what it does: at least MIN_SHARED keywords drawn from tags
 *      and skills, worth at least MIN_SCORE together.
 *
 * Keyword overlap is weighted by rarity across the catalog (inverse document
 * frequency), so sharing "postgres" counts for far more than sharing "data".
 * Tags are free-form, so keywords are split on punctuation, lightly stemmed
 * and mapped through a few synonyms ("postgresql" and "postgres-access" both
 * yield the same keyword). Words that make up one term in both listings count
 * once, as that term, and so do forms of one word ("deploy", "deployment").
 *
 * The list is never padded with weaker matches: fewer related agents, even
 * none, beats irrelevant ones. Ties keep the order `all` arrives in.
 */

/** Most related agents shown on a listing page. */
export const MAX_RELATED = 4;

/** Most alternatives on a listing's alternatives page. */
export const MAX_ALTERNATIVES = 8;

/** A listing with fewer alternatives than this gets no alternatives page, so no page is thin. */
export const MIN_ALTERNATIVES = 3;

/** Shared keywords named as a reason, at most. */
const MAX_REASONS = 3;

/** A single shared word or term ("image", "time series") is too thin to call two agents alternatives. */
export const MIN_SHARED = 2;

/**
 * Minimum summed keyword weight. Each shared keyword adds ln(N / df), where N
 * is the catalog size and df how many listings use the keyword (a term adds
 * its rarest word's). 6 takes two keywords that each appear in under ~5% of
 * listings, or a rare one plus a common one; "web" and "search" from unrelated
 * tags (6% and 15%) fall short. Tuned against the real catalog, where ~70% of
 * listings get the full four.
 */
export const MIN_SCORE = 6;

/**
 * Words that say nothing about what an agent does. Packaging and protocol
 * words are excluded because access methods already cover them.
 */
const STOPWORDS = new Set([
  // packaging / protocol
  'mcp', 'api', 'cli', 'sdk', 'server', 'client', 'remote', 'local', 'official',
  'self', 'hosted', 'open', 'source', 'opensource', 'native', 'compatible',
  'plugin', 'extension',
  // generic
  'ai', 'agent', 'tool', 'app', 'support', 'integration', 'management', 'mgmt',
  'mode', 'base', 'based', 'first', 'use', 'using', 'multi', 'cross', 'full',
  'long', 'low', 'high', 'fast', 'smart', 'run', 'key', 'user', 'get',
  'automatically', 'securely', 'access', 'action', 'check', 'create', 'creation',
  'execution', 'lookup', 'manage', 'operation', 'ops', 'read', 'write', 'zero',
  // licence, funding and portability claims
  'mit', 'license', 'apache', 'yc', 'combinator', 'backed', 'agnostic',
  // filler
  'a', 'an', 'and', 'the', 'for', 'with', 'of', 'to', 'in', 'on', 'via', 'by',
  'or', 'as', 'at', 'from', 'into', 'over', 'through', 'without', 'across',
  'before', 'up', 'any', 'all', 'each', 'every', 'one', 'only', 'own', 'per',
  'so', 'that', 'your', 'its', 'their',
]);

/** Spelling variants that should count as one keyword. */
const SYNONYMS: Record<string, string> = {
  postgresql: 'postgres',
  pg: 'postgres',
  psql: 'postgres',
  mongo: 'mongodb',
  k8s: 'kubernetes',
};

/**
 * Multi-word spellings of one word, joined before splitting, and how to write
 * each back. "real-time" would otherwise count as three rare keywords ("real",
 * "time", "real time"), enough on its own to pair an email API with a
 * monitoring tool. Traits and platforms are one word for the same reason: two
 * listings that both offer human-in-the-loop approval, or both run on Google
 * Cloud, are not alternatives for that alone. A YC batch is just YC.
 * "multi-agent" is joined for the opposite reason: both its words are
 * stopwords, so split it would say nothing.
 */
const COMPOUNDS: [spelling: RegExp, word: string, written: string][] = [
  [/\bmulti[\s-]agents?\b/g, 'multiagent', 'multi-agent'],
  [/\breal[\s-]time\b/g, 'realtime', 'real-time'],
  [/\bhuman[\s-]in[\s-](?:the[\s-])?loop\b/g, 'hitl', 'human-in-the-loop'],
  [/\bno[\s-]code\b/g, 'nocode', 'no-code'],
  [/\blow[\s-]code\b/g, 'lowcode', 'low-code'],
  [/\bevent[\s-]driven\b/g, 'eventdriven', 'event-driven'],
  [/\b(?:end[\s-]to[\s-]end|e2e)[\s-]encrypt(?:ion|ed)?\b/g, 'e2ee', 'end-to-end encryption'],
  [/\bgoogle[\s-]cloud\b/g, 'gcp', 'google cloud'],
  [/\bcloudflare[\s-]workers?\b/g, 'cfworkers', 'cloudflare workers'],
  [/\bclaude[\s-]code\b/g, 'claudecode', 'claude code'],
  [/\bvs[\s-]code\b/g, 'vscode', 'vs code'],
  [/\byc[\s-][swfx]\d{2}\b/g, 'yc', 'yc'],
];

const WRITTEN = new Map(COMPOUNDS.map(([, word, written]) => [word, written]));

/** Plural folding, applied identically to both sides of a comparison. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  // "sandboxes", "branches"; not "caches" or "niches", whose singular ends in e.
  if (/(x|sh|ss|tch|nch|rch)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !/(ss|us|is)$/.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

function normalize(token: string): string | null {
  if (token.length < 2) return null;
  const word = stem(SYNONYMS[token] ?? token);
  if (STOPWORDS.has(token) || STOPWORDS.has(word)) return null;
  return word;
}

/**
 * The keywords describing what an agent does, from its tags and skills: each
 * meaningful word, plus each multi-word phrase as a whole ("web search"), so
 * two listings tagged web-search outrank two that merely mention "web" and
 * "search" in unrelated tags.
 */
export function agentKeywords(agent: Agent): Set<string> {
  return new Set(keywordForms(agent).keys());
}

/**
 * Each keyword with how the listing writes it: "kubernetes" for the stem
 * "kubernete", "postgres" for "pg", "speech to text" for "speech text",
 * "real-time" for "realtime".
 */
function keywordForms(agent: Agent): Map<string, string> {
  const phrases = [...agent.tags, ...agent.skills.flatMap((s) => [s.id, s.name])];
  const forms = new Map<string, string>();
  const add = (keyword: string, form: string) => {
    if (!forms.has(keyword)) forms.set(keyword, form);
  };
  for (const phrase of phrases) {
    const text = COMPOUNDS.reduce((t, [spelling, word]) => t.replace(spelling, word), phrase.toLowerCase());
    const tokens = text.split(/[^a-z0-9]+/).filter(Boolean).map((token) => SYNONYMS[token] ?? token);
    const written = tokens.map((token) => WRITTEN.get(token) ?? token);
    const kept = tokens.flatMap((token, at) => {
      const word = normalize(token);
      return word ? [{ word, at }] : [];
    });
    for (const { word, at } of kept) add(word, written[at]);
    if (kept.length > 1) {
      const span = written.slice(kept[0].at, kept[kept.length - 1].at + 1);
      add(kept.map((k) => k.word).join(' '), span.join(' '));
    }
  }
  return forms;
}

/** Each pair of words that sit side by side in one of the listing's phrases: "time sery". */
function adjacentPairs(keywords: Set<string>): Set<string> {
  const pairs = new Set<string>();
  for (const keyword of keywords) {
    const words = keyword.split(' ');
    for (let i = 1; i < words.length; i++) pairs.add(`${words[i - 1]} ${words[i]}`);
  }
  return pairs;
}

interface CatalogIndex {
  keywords: Map<Agent, Set<string>>;
  pairs: Map<Agent, Set<string>>;
  docFreq: Map<string, number>;
}

// One index per catalog array, reused by every listing page rendered from it.
const indexCache = new WeakMap<Agent[], CatalogIndex>();

function indexCatalog(all: Agent[]): CatalogIndex {
  const cached = indexCache.get(all);
  if (cached) return cached;
  const keywords = new Map<Agent, Set<string>>();
  const pairs = new Map<Agent, Set<string>>();
  const docFreq = new Map<string, number>();
  for (const agent of all) {
    const kw = agentKeywords(agent);
    keywords.set(agent, kw);
    pairs.set(agent, adjacentPairs(kw));
    for (const word of kw) docFreq.set(word, (docFreq.get(word) ?? 0) + 1);
  }
  const index = { keywords, pairs, docFreq };
  indexCache.set(all, index);
  return index;
}

/** An alternative to a listing, with why it qualified beyond sharing the listing's primary category. */
export interface Alternative {
  agent: Agent;
  /** Access methods both offer, in the alternative's order. */
  access: Agent['accessMethods'];
  /** Up to MAX_REASONS shared keywords as the listing writes them, rarest first: "postgres", "index tuning". */
  keywords: string[];
}

/** Up to `limit` genuine alternatives to `current`, best first. */
export function getAlternatives(current: Agent, all: Agent[], limit = MAX_ALTERNATIVES): Alternative[] {
  const primary = current.categories[0]?.slug;
  if (!primary || current.accessMethods.length === 0) return [];

  const { keywords, pairs, docFreq } = indexCatalog(all);
  const own = keywords.get(current) ?? agentKeywords(current);
  if (own.size < MIN_SHARED) return [];
  const ownPairs = pairs.get(current) ?? adjacentPairs(own);

  const methods = new Set<string>(current.accessMethods);
  const total = all.length;
  const weight = (word: string) => Math.log(total / (docFreq.get(word) ?? total));
  const forms = keywordForms(current);

  return all
    .filter(
      (a) =>
        a.id !== current.id &&
        a.categories.some((c) => c.slug === primary) &&
        a.accessMethods.some((m) => methods.has(m))
    )
    .map((agent) => {
      const shared = [...(keywords.get(agent) ?? [])].filter((word) => own.has(word));
      const terms = [...(pairs.get(agent) ?? [])].filter((pair) => ownPairs.has(pair));
      const common = inCommon(shared, terms, weight);
      return { agent, common, score: common.reduce((sum, c) => sum + c.weight, 0) };
    })
    .filter((s) => s.common.length >= MIN_SHARED && s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ agent, common }) => ({
      agent,
      access: agent.accessMethods.filter((m) => methods.has(m)),
      keywords: reasons(common).map((c) => c.words.map((word) => forms.get(word) ?? word).join(' ')),
    }));
}

/** One thing two listings share: a keyword, or words that make up one term in both. */
interface Shared {
  /** Keywords in reading order: ["postgres"], ["speech text"], ["time", "sery"]. */
  words: string[];
  /** The rarest word's weight, which is the keyword's own for a single keyword. */
  weight: number;
}

/** Endings that make another form of the same word: "deploy" and "deployment", "code" and "coding". */
const FORM_ENDINGS = ['ing', 'ion', 'ment', 'ed', 'er'];

const isFormOf = (base: string, word: string) =>
  FORM_ENDINGS.some((ending) => word === base + ending || word === base.replace(/e$/, '') + ending);

/**
 * The shared keywords, with words side by side in a phrase of both listings
 * (`terms`) taken as one term: "time series" in one listing and "time series
 * forecasting" in the other is one thing in common, not two rare words. A
 * phrase both write the same way still counts in full, its words and itself,
 * so two listings tagged speech-to-text outrank two that merely use the words.
 * Forms of one word ("deploy", "deployment") count once, as the rarer.
 */
function inCommon(shared: string[], terms: string[], weight: (word: string) => number): Shared[] {
  const alike = (a: string, b: string) => !a.includes(' ') && !b.includes(' ') && (isFormOf(a, b) || isFormOf(b, a));
  const rarer = (a: string, b: string) => weight(a) > weight(b) || (weight(a) === weight(b) && a < b);
  const words = shared.filter((w) => !shared.some((v) => v !== w && alike(v, w) && rarer(v, w)));
  const kept = new Set(words);

  const phrases = words.filter((k) => k.includes(' ')).map((p) => ` ${p} `);
  const split = terms.filter(
    (pair) => pair.split(' ').every((w) => kept.has(w)) && !phrases.some((p) => p.includes(` ${pair} `))
  );
  const next = new Map(split.map((pair) => pair.split(' ') as [string, string]));
  const follows = new Set(next.values());
  const taken = new Set<string>();
  const common: Shared[] = [];
  const take = (term: string[]) => {
    for (const word of term) taken.add(word);
    common.push({ words: term, weight: Math.max(...term.map(weight)) });
  };
  for (const word of words) {
    if (follows.has(word)) continue;
    const term = [word];
    for (let w = next.get(word); w && !taken.has(w) && !term.includes(w); w = next.get(w)) term.push(w);
    take(term);
  }
  for (const word of words) if (!taken.has(word)) take([word]);
  return common;
}

/**
 * What to name, rarest first. A word inside a shared phrase ("tuning" in
 * "index tuning") or another form of a named word ("alert" after "alerting")
 * would only repeat it.
 */
function reasons(common: Shared[]): Shared[] {
  const inPhrase = new Set(common.flatMap((c) => c.words.filter((k) => k.includes(' ')).flatMap((p) => p.split(' '))));
  const key = (c: Shared) => c.words.join(' ');
  const sameRoot = (a: string, b: string) => Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a));
  const named: Shared[] = [];
  for (const c of common.filter((c) => !c.words.every((w) => inPhrase.has(w))).sort((a, b) => b.weight - a.weight)) {
    if (named.length === MAX_REASONS) break;
    if (!named.some((n) => sameRoot(key(n), key(c)))) named.push(c);
  }
  return named;
}

/** Up to MAX_RELATED genuine alternatives to `current`, best first. */
export function getRelatedAgents(current: Agent, all: Agent[]): Agent[] {
  return getAlternatives(current, all, MAX_RELATED).map((a) => a.agent);
}

/** What `current`'s alternatives page lists, or null when it has too few for a page. */
export function alternativesPage(current: Agent, all: Agent[]): Alternative[] | null {
  const alternatives = getAlternatives(current, all);
  return alternatives.length >= MIN_ALTERNATIVES ? alternatives : null;
}
