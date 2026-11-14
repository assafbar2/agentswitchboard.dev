/**
 * Shared shapes and HTTP helpers for the public catalog REST API.
 * Used by GET /api/agents, GET /api/agents/[slug], GET /api/categories,
 * GET /api/stacks, GET /api/tasks and the decision endpoints (GET /api/compare,
 * GET /api/agents/[slug]/alternatives, GET /api/bundle), and — for the label
 * definitions, tool wording and access-method input rules — by the MCP server
 * (/api/mcp), WebMCP and the agent docs, so they cannot drift apart. WebMCP runs in the browser: import only types from
 * modules that read files.
 */

import type { Stack, StackEntry } from './stacks';
import type { Task } from './tasks';
import type { Agent, Category } from './types';
import { BASE_URL } from './env';
import { absoluteIconUrl } from './icons';
import { ALL_ACCESS_METHODS, AUTH_TYPES } from './search';
import { howToUseJson } from './use-it-now';
import { lastChecked } from './verified';

// ── Label definitions ───────────────────────────────────────────────
// "Verified" is worded once, in components/VerifiedBadge.tsx
// (VERIFIED_DEFINITION). These two sit beside it so every agent-facing surface
// (llms.txt, /index.md, /for-agents, skill.md, REST docs, MCP and WebMCP tool
// descriptions) defines the flags the same way.

/** What `official: true` means. Mirrors CONTRIBUTING.md, "Official listings". */
export const OFFICIAL_DEFINITION =
  "Official: a first-party listing, published by the company behind the product under its own domain or GitHub org (e.g. Notion's own Notion MCP, not a community build), where that company is a major vendor (publicly traded, a frontier AI lab, or valued around $1B+). It records who publishes the product, not a paid placement, and is separate from Verified.";

/** What `featured: true` means, and how it affects result order. */
export const FEATURED_DEFINITION =
  'Featured: set only by the maintainer. With no search text, results list featured listings first, then A→Z; with search text, results are ranked by relevance and equal scores keep that featured-first order. ' +
  'The MCP server and WebMCP ignore it: their results are organic and leave the flag out.';

/** What `sponsored: true` means. Mirrors /about#sponsored and CONTRIBUTING.md. */
export const SPONSORED_DEFINITION =
  'Sponsored: a paid placement, approved by the maintainer. It shows a Sponsored label and a spot in the Sponsored slot on the homepage and the latest drop page. It never changes search results or their order, tasks, alternatives, compare or the Operator, never appears in AI-assistant (MCP) results, and is separate from Featured, Official and Verified.';

// ── Access-method input ─────────────────────────────────────────────

/** Accepted spellings that map onto a canonical access method. */
const ACCESS_METHOD_ALIASES = new Map<string, string>([['extension', 'browser-extension']]);

/**
 * Every value the `access` input accepts: the canonical methods, then their
 * aliases. Docs use the canonical `browser-extension`; `extension` is accepted
 * because earlier docs used it.
 */
export const ACCESS_METHOD_INPUTS: string[] = [
  ...ALL_ACCESS_METHODS,
  ...ACCESS_METHOD_ALIASES.keys(),
];

/**
 * Canonical, de-duplicated access methods from raw input: trims, lowercases,
 * maps aliases (`extension` → `browser-extension`) and drops unknown values.
 */
export function normalizeAccessMethods(values: readonly string[]): string[] {
  const methods = new Set<string>();
  for (const raw of values) {
    const value = raw.trim().toLowerCase();
    const method = ACCESS_METHOD_ALIASES.get(value) ?? value;
    if (ALL_ACCESS_METHODS.includes(method)) methods.add(method);
  }
  return [...methods];
}

/**
 * Canonical, de-duplicated auth types from raw input: trims, matches any case
 * (`apikey` → `apiKey`) and drops unknown values.
 */
export function normalizeAuthTypes(values: readonly string[]): string[] {
  const types = new Set<string>();
  for (const raw of values) {
    const value = raw.trim().toLowerCase();
    const type = AUTH_TYPES.find((t) => t.toLowerCase() === value);
    if (type) types.add(type);
  }
  return [...types];
}

// ── Search input wording ────────────────────────────────────────────
// Shared by the MCP server and WebMCP. public/openapi.json and the
// /.well-known manifests are static, so they repeat it.

export const VERIFIED_INPUT = 'Only Verified listings: checked to work, re-checked monthly';

export const AUTH_INPUT =
  'Only listings with one of these auth types: none (no key or sign-in needed), apiKey, oauth2, bearer. A listing has one auth type, so several mean any of them';

export const SORT_INPUT =
  'Result order. relevance (default): best match first with search text; without it, best fit first for a task, else featured then A→Z. newest: most recently added first. skills: most skills first. name: A→Z';

export const TASK_INPUT =
  'Task slug, e.g. "query-a-database": only the listings that do that job, best fit first. GET https://agentswitchboard.dev/api/tasks lists the tasks';

export const SINCE_INPUT =
  'Only listings added to the directory on or after this day: a date (YYYY-MM-DD), or a number of days back with today included ("7" is the last 7 days). Add sort "newest" to list the newest first';

export function unknownTaskMessage(slug: string): string {
  return `No task with slug "${slug}". GET /api/tasks lists every task.`;
}

// ── Decision tools ──────────────────────────────────────────────────
// compare_agents, alternatives_to and connect_bundle, worded once for the MCP
// server, WebMCP and the manifests. lib/decide.ts builds their answers.

export const COMPARE_AGENTS_DESCRIPTION =
  "Put 2 or 3 listings side by side, as the site's /compare page does. For each listing: the facts that set it apart from the others " +
  '("Only one with a CLI", "No auth required", "Most skills (12)"). Then one row per field, with each listing\'s value by slug: ' +
  'what it is, provider, official vendor, verified, access, auth, MCP server, CLI install, API base URL, skills, streaming, push, categories, tags, listed since. ' +
  'A row where every listing agrees has same: true. Facts from the listings\' own data, never a verdict. ' +
  'A curated comparison of the same listings adds its intro line. Unknown or repeated slugs, and any past 3, are left out with a note.';

export const COMPARE_SLUGS_INPUT = 'Listing slugs to compare, in column order: 2 or 3, e.g. ["deepgram", "assemblyai"]';

export const ALTERNATIVES_TO_DESCRIPTION =
  "Listings that could stand in for one listing, strongest first, as on its /agents/<slug>/alternatives page. " +
  "Each alternative is in the listing's main category, offers at least one of its access methods, and overlaps on what it does " +
  '(shared skills and tags, rarer ones counting for more). Each comes with why: the access methods both offer and what they have in common. ' +
  'Up to 8. Fewer, or none, rather than a weak match. Also returns a link comparing the listing with its top two alternatives.';

export const BUNDLE_SLUGS_INPUT = 'Listing slugs, in the order to list them: 1 to 10, e.g. a stack\'s items';

export const CONNECT_BUNDLE_DESCRIPTION =
  'One MCP client config to paste ({"mcpServers": …}, as Cursor and other MCP clients read it) for up to 10 listings, ' +
  'and how each one connects. A listing is in the config when its own docs give a hosted server address or a local command. ' +
  "An MCP server whose docs give neither comes with its setup guide, and setupPrompt asks a coding agent to set all of those up. " +
  'A listing without an MCP server comes with its CLI install command, API address or docs. ' +
  'Also returns a claude mcp add command for each server in the config, for Claude Code, and the /stack link for the listings. ' +
  "Nothing is guessed: every address and command is copied from the vendor's docs, as on the listing's page.";

export const RECOMMEND_DESCRIPTION =
  'One recommendation for what your user needs, and the next step to start using it, as the site\'s Operator (/operator) picks it. ' +
  'Pass the need in a sentence you write yourself, e.g. "query Postgres and send email": each need it names gets one pick, why it fits, ' +
  'the next step (the MCP client config to paste when the vendor\'s docs give one, else its setup guide or docs) and two alternatives; ' +
  'two or more picks also come with a /stack link. Name a product to prefer the listings that mention it; say MCP, CLI, API, browser extension or official to narrow the pick. ' +
  'Picked by fixed matching rules, not a model, so the same need always gets the same answer. A need that matches no task is refused with the closest tasks. ' +
  'Never include names, email addresses or phone numbers.';

export const LAST_CHECKED_DESCRIPTION =
  'YYYY-MM-DD the Verified listing was last checked (its link and access path), from its last update; null when it is not Verified';

export const LIMITATIONS_DESCRIPTION =
  'What may stop or slow the user, read from the listing: the sign-in it needs, a server that runs only on their computer, no MCP config to copy yet, no MCP server, not Verified. Empty when the listing shows none';

export const RECOMMEND_NEED_INPUT =
  "What the user needs, in a sentence or two, e.g. \"query Postgres and send email\" (up to 300 characters are read)";

/**
 * A listing in a decision tool's answer: the search-result fields, its auth
 * type and, when Verified, the day it was last checked (lib/verified.ts). The MCP server returns these too, and connector directories reject
 * sponsored placements in tool output, so they never carry `sponsored`.
 */
export function decisionAgent(a: Agent) {
  const { sponsored, ...card } = summarizeAgent(a);
  return { ...card, authType: a.authType, lastChecked: lastChecked(a) };
}

export const CORS_GET = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const CACHE_PUBLIC =
  'public, s-maxage=300, stale-while-revalidate=600';

export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 10;

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_GET });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': CACHE_PUBLIC,
      ...CORS_GET,
    },
  });
}

export function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Search-result card. Same fields as GET /api/agents `agents[]`. */
export function summarizeAgent(a: Agent) {
  return {
    name: a.name,
    slug: a.slug,
    url: `${BASE_URL}/agents/${a.slug}`,
    iconUrl: absoluteIconUrl(a.iconUrl),
    description: a.description,
    provider: a.providerName,
    categories: a.categories.map((c) => c.slug),
    accessMethods: a.accessMethods,
    verified: a.verified,
    official: a.official,
    // Featured listings sort first in the default order, so callers see why.
    featured: a.featured === true,
    sponsored: a.sponsored === true,
  };
}

/** Full listing for GET /api/agents/{slug} — skills, auth, links. */
export function detailAgent(a: Agent) {
  return {
    ...summarizeAgent(a),
    officialVendor: a.officialVendor?.name ?? null,
    homepage: a.agentUrl ?? null,
    providerUrl: a.providerUrl ?? null,
    authType: a.authType,
    tags: a.tags ?? [],
    skills: (a.skills ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
    })),
    supportsStreaming: a.supportsStreaming,
    supportsPushNotifications: a.supportsPushNotifications,
    tier: a.tier,
    createdAt: a.createdAt ?? null,
    updatedAt: a.updatedAt ?? null,
    ...howToUseFields(a),
    useItNow: howToUseJson(a),
  };
}

/** A listing's Use it now fields as published, null when its vendor's docs don't give one. */
export function howToUseFields(a: Agent) {
  return {
    mcpEndpoint: a.mcpEndpoint ?? null,
    mcpCommand: a.mcpCommand ?? null,
    install: a.install ?? null,
    quickstartUrl: a.quickstartUrl ?? null,
    apiBaseUrl: a.apiBaseUrl ?? null,
  };
}

export function summarizeCategory(c: Category) {
  return {
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    agentCount: c.agentCount ?? 0,
  };
}

/**
 * A stack for GET /api/stacks and /api/stacks/{slug}: its listings in order,
 * each with why it is there, and the GET /api/bundle call that connects them.
 */
export function summarizeStack(stack: Stack, entries: StackEntry[]) {
  return {
    slug: stack.slug,
    title: stack.title,
    promise: stack.promise,
    week: stack.week ?? null,
    url: `${BASE_URL}/stacks/${stack.slug}`,
    bundleUrl: `${BASE_URL}/api/bundle?items=${entries.map((e) => e.agent.slug).join(',')}`,
    items: entries.map(({ agent, why }) => ({ ...summarizeAgent(agent), authType: agent.authType, why })),
  };
}

/** A task for GET /api/tasks: the job, what its listings are picked by, and how many fit (`fits`). */
export function summarizeTask(task: Task, fits: Agent[]) {
  return {
    slug: task.slug,
    label: task.label,
    blurb: task.blurb,
    keywords: task.keywords,
    categories: task.categories,
    access: task.access,
    count: fits.length,
    official: fits.filter((a) => a.official).length,
    url: `${BASE_URL}/tasks/${task.slug}`,
    browseUrl: `${BASE_URL}/browse?task=${task.slug}`,
    agentsUrl: `${BASE_URL}/api/agents?task=${task.slug}`,
  };
}

/**
 * One task for GET /api/tasks/{slug}: its summary, every listing that fits
 * best first with why (lib/tasks.ts whyItFits, or null), and the slugs of
 * related tasks and of stacks with its listings.
 */
export function detailTask(
  task: Task,
  fits: { agent: Agent; why: string | null }[],
  related: Task[],
  stacks: Stack[]
) {
  return {
    ...summarizeTask(task, fits.map((f) => f.agent)),
    agents: fits.map(({ agent, why }) => ({ ...summarizeAgent(agent), authType: agent.authType, why })),
    relatedTasks: related.map((t) => t.slug),
    stacks: stacks.map((s) => s.slug),
  };
}
