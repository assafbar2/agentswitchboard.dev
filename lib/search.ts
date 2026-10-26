import type { Agent } from './types';

/** Canonical access method labels for display */
export const ACCESS_METHOD_LABELS: Record<string, string> = {
  api: 'API',
  mcp: 'MCP',
  cli: 'CLI',
  'browser-extension': 'Extension',
};

export const ALL_ACCESS_METHODS = Object.keys(ACCESS_METHOD_LABELS);

export interface CatalogFilter {
  category?: string;
  official?: boolean;
  /** Official vendor slug (content/official-vendors.json); implies official. */
  vendor?: string;
}

/** Category / Official / vendor narrowing, applied before text search. */
export function filterAgents(agents: Agent[], { category, official, vendor }: CatalogFilter): Agent[] {
  return agents.filter(
    (a) =>
      (!category || a.categories.some((c) => c.slug === category)) &&
      (!official || a.official) &&
      (!vendor || a.officialVendor?.slug === vendor)
  );
}

/** Query-string flag parsing: "1", "true", "yes" (any case) mean on. */
export function parseFlag(raw: string | null | undefined): boolean {
  return !!raw && ['1', 'true', 'yes'].includes(raw.trim().toLowerCase());
}

/**
 * The /browse URL for a submitted search. Params already in `current`
 * (category, access, official, vendor) are kept, so a search never clears
 * the active filters. Pass '' as `current` to start a fresh search.
 */
export function browseHref(query: string, current: string | URLSearchParams = ''): string {
  const params = new URLSearchParams(current);
  const q = query.trim();
  if (q) params.set('q', q);
  else params.delete('q');
  const qs = params.toString();
  return qs ? `/browse?${qs}` : '/browse';
}

// ── Query parsing ───────────────────────────────────────────────────

type AccessMethod = Agent['accessMethods'][number];

/**
 * Query words that name an access method. A query word that equals one of
 * these exactly is a filter, not a text match, so "capital" and "climate"
 * never match because they contain "api" or "cli". Unlike a chip, the word
 * also lets through a listing whose name has it as a whole word, so
 * "mcp python" finds the MCP Python SDK, whose access is API and CLI.
 */
const ACCESS_ALIASES: Record<string, AccessMethod> = {
  mcp: 'mcp',
  api: 'api',
  cli: 'cli',
  extension: 'browser-extension',
  'browser-extension': 'browser-extension',
};

/** Own keys only, so "constructor" is a search word, not an access method. */
function accessAlias(word: string): AccessMethod | undefined {
  return Object.prototype.hasOwnProperty.call(ACCESS_ALIASES, word) ? ACCESS_ALIASES[word] : undefined;
}

/** Filler words in natural queries ("an mcp server for postgres"). */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'with', 'to', 'of', 'and',
  'server', 'servers', 'tool', 'tools',
]);

/** Each word in a group also matches listings that use another word in it. */
const SYNONYM_GROUPS = [
  ['postgres', 'postgresql', 'pg'],
  ['kubernetes', 'k8s'],
  ['github', 'gh'],
  ['javascript', 'js'],
  ['typescript', 'ts'],
];

/**
 * One-way expansions: the word also matches listings that use any of these,
 * but not the reverse, so "sql" finds MySQL and SQLite tools while "mysql"
 * does not find SQLite ones. ("sql" alone only matches at a word start, which
 * misses "MySQL" and "NoSQL" in descriptions.)
 */
const EXPANSIONS: Record<string, string[]> = {
  sql: ['mysql', 'postgresql', 'sqlite', 'nosql', 'mssql'],
};

const SYNONYMS = new Map<string, string[]>(
  SYNONYM_GROUPS.flatMap((group) => group.map((word): [string, string[]] => [word, group]))
);
for (const [word, more] of Object.entries(EXPANSIONS)) {
  SYNONYMS.set(word, [...new Set([...(SYNONYMS.get(word) ?? [word]), ...more])]);
}

// Letters and digits in any script are word characters. Built with
// new RegExp so the 'u'-flag syntax isn't checked against the ES2017 target.
const NOT_WORD = '[^\\p{L}\\p{N}]';
const EDGE_JUNK = new RegExp('^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}+#]+$', 'gu');

/**
 * One spelling a query word can match. Words of 4+ letters match anywhere,
 * so "postgres" finds "PostgreSQL" and "mail" finds "email". Shorter words
 * need word boundaries, or "ts" would match "agents" and "pg" "upgrade":
 * 1–2 letters must be a whole word, 3 must start a word. Names are often
 * run together ("PaddleOCR", "AgentMail"), so in a name 3 letters may
 * match anywhere.
 */
interface Variant {
  word: string;
  test: (text: string, inName?: boolean) => boolean;
}

function makeVariant(word: string): Variant {
  if (word.length >= 4) return { word, test: (text) => text.includes(word) };
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const end = word.length <= 2 ? `(?=${NOT_WORD}|$)` : '';
  const re = new RegExp(`(?:^|${NOT_WORD})${escaped}${end}`, 'u');
  return {
    word,
    test: (text, inName) => (inName && word.length === 3 ? text.includes(word) : re.test(text)),
  };
}

/** Matches `word` as a whole word: no letter or digit right before or after it. */
function wholeWord(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|${NOT_WORD})${escaped}(?=${NOT_WORD}|$)`, 'u');
}

/** An access method named in the query, with the query words that named it. */
interface QueryAccess {
  method: AccessMethod;
  /** The naming words as whole words, for the name check. */
  inName: RegExp[];
}

interface ParsedQuery {
  /** The whole query, lowercased, with single spaces. */
  phrase: string;
  /** Number of distinct words in the query, filters and stopwords included. */
  wordCount: number;
  /** Words left after filters and stopwords, each with its synonyms. Every one must match. */
  terms: Variant[][];
  /**
   * Access methods named in the query. A listing passes each one if it has
   * the method or its name contains the word as a whole word.
   */
  access: QueryAccess[];
}

function parseQuery(query: string): ParsedQuery {
  const phrase = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const words = [
    ...new Set(
      phrase
        .split(/[\s,;|]+/)
        .map((w) => w.replace(EDGE_JUNK, ''))
        .filter(Boolean)
    ),
  ];

  const access: QueryAccess[] = [];
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const w of words) {
    const method = accessAlias(w);
    if (method) {
      const seen = access.find((a) => a.method === method);
      if (seen) seen.inName.push(wholeWord(w));
      else access.push({ method, inName: [wholeWord(w)] });
    } else if (STOPWORDS.has(w)) {
      dropped.push(w);
    } else {
      kept.push(w);
    }
  }

  // A query of nothing but filler ("tools") still searches for its words;
  // one with no word characters at all ("!!") searches for the raw text.
  let textWords = kept;
  if (textWords.length === 0 && access.length === 0) {
    textWords = dropped.length > 0 ? dropped : phrase ? [phrase] : [];
  }

  return {
    phrase,
    wordCount: words.length,
    terms: textWords.map((w) => (SYNONYMS.get(w) ?? [w]).map(makeVariant)),
    access,
  };
}

// ── Scoring ─────────────────────────────────────────────────────────

/** Lowercased searchable text of one listing. */
interface Haystack {
  name: string;
  description: string;
  skillNames: string[];
  skillDescriptions: string[];
  categoryNames: string[];
  categorySlugs: string[];
  tags: string[];
  provider: string;
}

function haystackOf(agent: Agent): Haystack {
  const lower = (s: unknown) => (typeof s === 'string' ? s.toLowerCase() : '');
  // Guard against legacy string-form skills and missing fields.
  const skills = (agent.skills ?? []).filter((s) => s && typeof s === 'object');
  return {
    name: lower(agent.name),
    description: lower(agent.description),
    skillNames: skills.map((s) => lower(s.name)).filter(Boolean),
    skillDescriptions: skills.map((s) => lower(s.description)).filter(Boolean),
    categoryNames: (agent.categories ?? []).map((c) => lower(c.name)),
    categorySlugs: (agent.categories ?? []).map((c) => lower(c.slug)),
    tags: (agent.tags ?? []).map(lower),
    provider: lower(agent.providerName),
  };
}

/**
 * Score one query word (any of its synonyms). Each field counts once,
 * however many skills or tags mention the word:
 *  100 — name is the word, 90 — name starts with it, 80 — name contains it
 *   60 — description
 *   40 — a skill name, 20 — a skill description
 *   20 — a category name, 10 — a category slug
 *   10 — a tag
 *    5 — provider name
 */
function scoreTerm(h: Haystack, variants: Variant[]): number {
  const hit = (text: string, inName = false) => variants.some((v) => v.test(text, inName));
  const hitAny = (texts: string[]) => texts.some((t) => hit(t));
  let score = 0;

  if (variants.some((v) => h.name === v.word)) score += 100;
  else if (hit(h.name, true)) score += variants.some((v) => h.name.startsWith(v.word)) ? 90 : 80;

  if (hit(h.description)) score += 60;
  if (hitAny(h.skillNames)) score += 40;
  if (hitAny(h.skillDescriptions)) score += 20;
  if (hitAny(h.categoryNames)) score += 20;
  if (hitAny(h.categorySlugs)) score += 10;
  if (hitAny(h.tags)) score += 10;
  if (hit(h.provider)) score += 5;

  return score;
}

/**
 * `chips` are the access filters picked in the UI and are strict: the
 * listing must have every one. Access words typed in the query are looser
 * (see ParsedQuery.access).
 */
function scoreParsed(agent: Agent, parsed: ParsedQuery, chips: string[]): number {
  const methods: string[] = agent.accessMethods ?? [];
  if (!chips.every((m) => methods.includes(m))) return 0;
  if (parsed.access.length > 0) {
    const name = typeof agent.name === 'string' ? agent.name.toLowerCase() : '';
    const passes = (a: QueryAccess) => methods.includes(a.method) || a.inName.some((re) => re.test(name));
    if (!parsed.access.every(passes)) return 0;
  }
  if (parsed.terms.length === 0) return 1;

  const h = haystackOf(agent);
  let score = 0;
  for (const variants of parsed.terms) {
    const s = scoreTerm(h, variants);
    if (s === 0) return 0; // every word must match somewhere
    score += s;
  }

  // Multi-word queries: reward the whole phrase in the name ("postgres mcp pro").
  if (parsed.wordCount > 1) {
    if (h.name === parsed.phrase) score += 100;
    else if (h.name.includes(parsed.phrase)) score += 50;
  }
  return score;
}

/**
 * Score an agent against a search query. Higher = more relevant; 0 = no
 * match; an empty query scores 1 (neutral).
 *
 * The query is split into words. A word that names an access method
 * ("mcp", "api", "cli", "extension") is a filter: an agent scores 0 unless
 * it has that method or its name contains the word as a whole word.
 * Stopwords ("for", "server", "tools", ...) are dropped. Every remaining
 * word, or one of its synonyms (postgres/postgresql/pg, k8s/kubernetes,
 * gh/github, js/javascript, ts/typescript; "sql" also matches mysql,
 * postgresql, sqlite, nosql and mssql), must match some field; the score is
 * the sum of the per-word scores (see scoreTerm).
 */
export function scoreAgent(agent: Agent, query: string): number {
  if (!query.trim()) return 1;
  return scoreParsed(agent, parseQuery(query), []);
}

export function searchAgents(
  agents: Agent[],
  query: string,
  filterAccessMethods?: string[]
): Agent[] {
  const parsed = parseQuery(query);
  // Chip filters (strict) and access words in the query combine (AND).
  const chips = [
    ...new Set((filterAccessMethods ?? []).map((m) => accessAlias(m.toLowerCase()) ?? m)),
  ];

  // Nothing to rank by: keep the incoming order.
  if (parsed.terms.length === 0) {
    return chips.length === 0 && parsed.access.length === 0
      ? agents
      : agents.filter((a) => scoreParsed(a, parsed, chips) > 0);
  }

  return agents
    .map((agent) => ({ agent, score: scoreParsed(agent, parsed, chips) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ agent }) => agent);
}
