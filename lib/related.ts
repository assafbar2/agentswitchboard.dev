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
 * yield the same keyword).
 *
 * The list is never padded with weaker matches: fewer related agents, even
 * none, beats irrelevant ones. Ties keep the order `all` arrives in.
 */

/** Most related agents shown on a listing page. */
export const MAX_RELATED = 4;

/** A single shared word ("image", "compliance") is too thin to call two agents alternatives. */
export const MIN_SHARED = 2;

/**
 * Minimum summed keyword weight. Each shared keyword adds ln(N / df), where N
 * is the catalog size and df how many listings use the keyword. 6 takes two
 * keywords that each appear in under ~5% of listings, or a rare one plus a
 * common one; "web" and "search" from unrelated tags (6% and 15%) fall short.
 * Tuned against the real catalog, where ~70% of listings get the full four.
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
  // generic
  'ai', 'agent', 'tool', 'app', 'support', 'integration', 'management', 'mgmt',
  'mode', 'base', 'based', 'first', 'use', 'using', 'multi', 'cross', 'full',
  'long', 'low', 'high', 'fast', 'smart', 'run', 'key', 'user', 'get',
  'automatically', 'securely', 'access', 'action', 'check', 'create', 'creation',
  'execution', 'lookup', 'manage', 'operation', 'ops', 'read', 'write',
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

/** Plural folding, applied identically to both sides of a comparison. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
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
  const phrases = [...agent.tags, ...agent.skills.flatMap((s) => [s.id, s.name])];
  const keywords = new Set<string>();
  for (const phrase of phrases) {
    const words: string[] = [];
    for (const token of phrase.toLowerCase().split(/[^a-z0-9]+/)) {
      const word = normalize(token);
      if (word) words.push(word);
    }
    for (const word of words) keywords.add(word);
    if (words.length > 1) keywords.add(words.join(' '));
  }
  return keywords;
}

interface CatalogIndex {
  keywords: Map<Agent, Set<string>>;
  docFreq: Map<string, number>;
}

// One index per catalog array, reused by every listing page rendered from it.
const indexCache = new WeakMap<Agent[], CatalogIndex>();

function indexCatalog(all: Agent[]): CatalogIndex {
  const cached = indexCache.get(all);
  if (cached) return cached;
  const keywords = new Map<Agent, Set<string>>();
  const docFreq = new Map<string, number>();
  for (const agent of all) {
    const kw = agentKeywords(agent);
    keywords.set(agent, kw);
    for (const word of kw) docFreq.set(word, (docFreq.get(word) ?? 0) + 1);
  }
  const index = { keywords, docFreq };
  indexCache.set(all, index);
  return index;
}

/** Up to MAX_RELATED genuine alternatives to `current`, best first. */
export function getRelatedAgents(current: Agent, all: Agent[]): Agent[] {
  const primary = current.categories[0]?.slug;
  if (!primary || current.accessMethods.length === 0) return [];

  const { keywords, docFreq } = indexCatalog(all);
  const own = keywords.get(current) ?? agentKeywords(current);
  if (own.size < MIN_SHARED) return [];

  const methods = new Set<string>(current.accessMethods);
  const total = all.length;

  return all
    .filter(
      (a) =>
        a.id !== current.id &&
        a.categories.some((c) => c.slug === primary) &&
        a.accessMethods.some((m) => methods.has(m))
    )
    .map((agent) => {
      let shared = 0;
      let score = 0;
      for (const word of keywords.get(agent) ?? []) {
        if (!own.has(word)) continue;
        shared++;
        score += Math.log(total / (docFreq.get(word) ?? total));
      }
      return { agent, shared, score };
    })
    .filter((s) => s.shared >= MIN_SHARED && s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELATED)
    .map((s) => s.agent);
}
