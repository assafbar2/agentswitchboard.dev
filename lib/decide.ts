/**
 * The decision tools' answers as data, for GET /api/compare,
 * /api/agents/{slug}/alternatives, /api/bundle and /api/recommend, and the MCP
 * tools compare_agents, alternatives_to, connect_bundle and recommend. Each is
 * built from the same functions as the site's own page (/compare, an
 * alternatives page, a stack page, the Operator), so an assistant says what a
 * visitor sees.
 */

import { bundleItem, bundleNotes, bundleSummary, connectBundle, type BundleHow } from './bundle';
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
import { pickedBecause, putThrough } from './operator';
import { decisionAgent } from './public-api';
import { alternativeWhy, getAlternatives, MAX_ALTERNATIVES, MIN_ALTERNATIVES } from './related';
import { operatorHref, PARTS_MAX, REQUEST_MAX } from './request-parts';
import { listedAgents, sharedStack } from './shared-stack';
import { stackHref } from './stack-link';
import type { Task } from './tasks';
import type { Agent } from './types';
import { joinList, pluralize } from './utils';

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

// ── recommend ───────────────────────────────────────────────────────

/** How a recommendation is picked, said with every answer. */
export const RECOMMEND_BASIS =
  'Picked by the directory’s own matching rules, the same for every caller and with no model: each need is matched to one of the directory’s tasks, ' +
  'then the listings for that task that mention what the need names come first (a product, a service), then Official ones, then the task’s best fits. ' +
  'Asking for an MCP server, a CLI, an API, a browser extension or Official narrows the pick. Paid placement never changes it.';

const NEXT_STEP_LABEL: Record<BundleHow, string> = {
  config: 'Add its MCP server to your MCP client',
  guide: 'Set up its MCP server from its guide',
  other: 'Start from its setup docs',
};

function nextStep(agent: Agent) {
  const item = bundleItem(agent);
  return { how: item.how, label: NEXT_STEP_LABEL[item.how], url: item.docsUrl, server: item.server, note: item.note };
}

const taskRef = (task: Task) => ({ slug: task.slug, label: task.label, url: `${BASE_URL}/tasks/${task.slug}` });

function answerLine(r: RecommendBody['recommendations'][number]): string {
  const alternatives = r.alternatives.length > 0 ? ` Alternatives: ${joinList(r.alternatives.map((a) => a.name))}.` : '';
  const because = r.pickedBecause.startsWith('Picked') ? r.pickedBecause : 'The task’s best fit.';
  const why = r.why ? ` ${r.why}${/[.!?]$/.test(r.why) ? '' : '.'}` : '';
  return (
    `For “${r.need}”: ${r.pick.name} (${r.pick.url}). ${because}${why} ` +
    `Next step: ${r.nextStep.label}: ${r.nextStep.url}.${alternatives}`
  );
}

function recommendBody(need: unknown, tasks: Task[], catalog: Agent[]) {
  const put = putThrough(need, tasks, catalog);
  const recommendations = put.parts.flatMap((part) =>
    part.task && part.pick
      ? [
          {
            need: part.text,
            task: taskRef(part.task),
            pick: decisionAgent(part.pick),
            pickedBecause: pickedBecause(part),
            why: part.why,
            unmet: part.unmet,
            nextStep: nextStep(part.pick),
            alternatives: part.alternatives.map(decisionAgent),
            fits: part.fits,
          },
        ]
      : []
  );
  const unmatched = put.parts
    .filter((part) => !part.task || !part.pick)
    .map((part) => ({ need: part.text, nearestTasks: (part.task ? [part.task] : part.nearest).map(taskRef) }));
  const notes = [
    ...(put.cut ? [`The request was cut at ${REQUEST_MAX} characters.`] : []),
    ...(put.extra > 0 ? [`Only the first ${PARTS_MAX} needs were read; ${put.extra} more were left out.`] : []),
  ];
  const body = {
    request: put.request,
    answer: '',
    recommendations,
    unmatched,
    stackUrl: put.stack.length > 1 ? `${BASE_URL}${stackHref(put.stack.map((a) => a.slug))}` : null,
    operatorUrl: `${BASE_URL}${operatorHref(put.request)}`,
    basis: RECOMMEND_BASIS,
    notes,
  };
  return body;
}

export type RecommendBody = ReturnType<typeof recommendBody>;

/**
 * One pick for each need in `need` (the user's words: "query Postgres and
 * send email"), with why, the next step to start using it and two
 * alternatives, as the Operator puts it through. `catalog` must be in organic
 * order (lib/organic.ts): ties go to the catalog's order.
 */
export function recommendDecision(need: unknown, tasks: Task[], catalog: Agent[]): Decision<RecommendBody> {
  const body = recommendBody(need, tasks, catalog);
  if (!body.request) {
    return {
      ok: false,
      status: 400,
      error: 'no_need',
      message: 'Say what your user needs in a sentence, e.g. "query Postgres and send email".',
    };
  }
  if (body.recommendations.length === 0) {
    const nearest = [...new Map(body.unmatched.flatMap((u) => u.nearestTasks).map((t) => [t.slug, t])).values()];
    const closest = nearest.length > 0 ? ` The closest tasks: ${nearest.map((t) => t.slug).join(', ')}.` : '';
    return {
      ok: false,
      status: 404,
      error: 'no_match',
      message: `No task in the directory matches "${body.request}", so there is no pick.${closest} Say it another way, or search the directory.`,
      extra: { unmatched: body.unmatched },
    };
  }
  const left = body.unmatched.map((u) => `No pick for “${u.need}”: no task in the directory matches it.`);
  body.answer = [...body.recommendations.map(answerLine), ...left].join('\n');
  return { ok: true, body };
}
