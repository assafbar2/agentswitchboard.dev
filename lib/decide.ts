/**
 * The decision tools' answers as data, for GET /api/compare,
 * /api/agents/{slug}/alternatives and /api/bundle, and the MCP tools
 * compare_agents, alternatives_to and connect_bundle. Each is built from the
 * same functions as the site's own page (/compare, an alternatives page, a
 * stack page), so an assistant says what a visitor sees.
 */

import { bundleNotes, bundleSummary, connectBundle } from './bundle';
import {
  compareRows,
  compareSuggestions,
  compareTitle,
  comparisonFor,
  curatedComparisons,
  factLines,
  noteText,
  pairPath,
  selectCompared,
} from './compare';
import { COMPARE_MAX, compareHref } from './compare-link';
import { BASE_URL } from './env';
import { decisionAgent } from './public-api';
import { alternativeWhy, getAlternatives, MAX_ALTERNATIVES, MIN_ALTERNATIVES } from './related';
import { listedAgents, sharedStack } from './shared-stack';
import { stackHref } from './stack-link';
import type { Agent } from './types';
import { pluralize } from './utils';

/** Why a decision tool has no answer: the HTTP status, an error code and a message, plus anything that helps the next call. */
export interface Refusal {
  ok: false;
  status: number;
  error: string;
  message: string;
  extra?: Record<string, unknown>;
}

export type Decision<T> = { ok: true; body: T } | Refusal;

const said = (notes: string[]) => (notes.length > 0 ? ` ${notes.join(' ')}` : '');

// ── compare ─────────────────────────────────────────────────────────

function compareBody(agents: Agent[], notes: string[], catalog: Agent[]) {
  const slugs = agents.map((a) => a.slug);
  const curated = comparisonFor(slugs, curatedComparisons(catalog));
  const facts = factLines(agents);
  return {
    title: compareTitle(agents),
    url: `${BASE_URL}${curated ? pairPath(curated.items) : compareHref(slugs)}`,
    intro: curated?.intro ?? null,
    agents: agents.map((a, i) => ({ ...decisionAgent(a), setsApart: facts[i] })),
    rows: compareRows(agents).map(({ key, label, values, same }) => ({
      key,
      label,
      same,
      values: Object.fromEntries(agents.map((a, i) => [a.slug, values[i]])),
    })),
    notes,
  };
}

export type CompareBody = ReturnType<typeof compareBody>;

/** 2 or 3 listings side by side, as /compare shows them. `requested` is the slugs in column order. */
export function compareDecision(
  requested: readonly string[],
  catalog: Agent[],
  retired: ReadonlyMap<string, string>
): Decision<CompareBody> {
  const { agents, notes } = selectCompared(requested, catalog, retired);
  const texts = notes.map(noteText);
  if (agents.length >= 2) return { ok: true, body: compareBody(agents, texts, catalog) };

  const suggestions = compareSuggestions(agents, catalog);
  const next =
    agents.length === 0
      ? ' Search the directory for their slugs first.'
      : suggestions.length > 0
        ? ` Listings to put beside it: ${suggestions.map((a) => a.slug).join(', ')}.`
        : ' None of its alternatives is listed; search the directory for another.';
  return {
    ok: false,
    status: 400,
    error: 'too_few_listings',
    message: `Name 2 or 3 listings to compare${agents.length === 1 ? `; only ${agents[0].name} was found` : ''}.${said(texts)}${next}`,
    extra: { notes: texts, suggestions: suggestions.map(decisionAgent) },
  };
}

// ── alternatives ────────────────────────────────────────────────────

function alternativesBody(agent: Agent, catalog: Agent[], limit: number) {
  const all = getAlternatives(agent, catalog);
  const top = all.slice(0, COMPARE_MAX - 1).map((a) => a.agent.slug);
  const category = agent.categories[0]?.name ?? 'its category';
  return {
    agent: decisionAgent(agent),
    total: all.length,
    url: all.length >= MIN_ALTERNATIVES ? `${BASE_URL}/agents/${agent.slug}/alternatives` : null,
    compareUrl: top.length > 0 ? `${BASE_URL}${compareHref([agent.slug, ...top])}` : null,
    basis:
      all.length > 0
        ? `${all.length} ${pluralize(all.length, 'listing')} in ${category} that share a way to connect with ${agent.name} and overlap on what it does, strongest match first.`
        : `No listing is a close alternative to ${agent.name}: none in ${category} shares a way to connect with it and enough of what it does.`,
    alternatives: all.slice(0, limit).map((alt) => ({
      ...decisionAgent(alt.agent),
      sharedAccess: alt.access,
      inCommon: alt.keywords,
      why: alternativeWhy(alt),
    })),
  };
}

export type AlternativesBody = ReturnType<typeof alternativesBody>;

/** Up to `limit` alternatives to the listing `slug` names, as its alternatives page lists them. */
export function alternativesDecision(
  slug: string,
  catalog: Agent[],
  retired: ReadonlyMap<string, string>,
  limit = MAX_ALTERNATIVES
): Decision<AlternativesBody> {
  const key = slug.trim().toLowerCase();
  const agent = catalog.find((a) => a.slug === key);
  if (agent) return { ok: true, body: alternativesBody(agent, catalog, limit) };
  const name = retired.get(key);
  return {
    ok: false,
    status: 404,
    error: 'not_found',
    message: name
      ? `${name} is no longer listed in the directory, so it has no alternatives here. Search the directory for tools that do the same job.`
      : `No agent with slug "${key.slice(0, 80)}". Search the directory first, then retry with a returned slug.`,
  };
}

// ── connect bundle ──────────────────────────────────────────────────

function bundleBody(agents: Agent[], notes: string[]) {
  const bundle = connectBundle(agents);
  return {
    summary: bundleSummary(bundle.items),
    stackUrl: `${BASE_URL}${stackHref(agents.map((a) => a.slug))}`,
    config: bundle.config,
    claudeCode: bundle.claudeCode,
    setupPrompt: bundle.setupPrompt,
    items: bundle.items.map(({ agent, how, server, docsUrl, note }) => ({ ...decisionAgent(agent), how, server, docsUrl, note })),
    notes,
  };
}

export type BundleBody = ReturnType<typeof bundleBody>;

/** One MCP client config for the listings `requested` names, in order, and how to connect the rest. */
export function bundleDecision(
  requested: readonly string[],
  catalog: Agent[],
  retired: ReadonlyMap<string, string>
): Decision<BundleBody> {
  const stack = sharedStack(requested, '', catalog, retired);
  const agents = listedAgents(stack);
  const notes = bundleNotes(stack);
  if (agents.length > 0) return { ok: true, body: bundleBody(agents, notes) };
  return {
    ok: false,
    status: 400,
    error: 'no_listings',
    message: `Name 1 to 10 listings by slug.${said(notes)} Search the directory for their slugs first.`,
    extra: { notes },
  };
}
