/**
 * Share cards: the Open Graph / X image each page hands to social sites.
 * This module decides what a card says and the URL it is served at;
 * lib/og.tsx draws it, and the card.png route handlers serve it, prerendered
 * at build.
 *
 * X and others cache a card by URL, so every card URL carries ?v=<hash of
 * CARD_DESIGN and the card's data>: changed data or a new look means a new URL.
 */

import { createHash } from 'crypto';
import { panelCode, type Board } from './board';
import type { Release } from './changelog';
import { pairPath } from './compare';
import { compareQuery } from './compare-link';
import { dropAdditions, dropHighlights, rankAdditions, type Drop } from './drops';
import type { NewGroup } from './freshness';
import { inlineMarkdownToText } from './inline-markdown';
import type { Operator } from './operator';
import type { Alternative } from './related';
import { operatorQuery } from './request-parts';
import { ACCESS_METHOD_LABELS } from './search';
import { stackQuery, UNTITLED_STACK } from './stack-link';
import { stackAccessMethods, type Stack, type StackEntry } from './stacks';
import { taskTitle, type Task } from './tasks';
import type { Agent, Category } from './types';
import { formatDay, joinList, pluralize } from './utils';

/**
 * Hash of lib/og.tsx and assets/fonts/, so a redesigned card gets new URLs.
 * lib/share-cards.test.ts prints the new value whenever either changes.
 */
export const CARD_DESIGN = 'e2bbf5fa';

export const CARD_SIZE = { width: 1200, height: 630 } as const;

export interface SiteCard {
  agents: number;
  official: number;
  categories: number;
  /** Site paths of sample icons, at most one per provider. */
  icons: string[];
}

export interface ListingCard {
  name: string;
  provider: string;
  official: boolean;
  verified: boolean;
  /** Display labels: API, MCP, CLI, Extension. */
  access: string[];
  /** The primary category's name. */
  category: string | null;
  description: string;
  icon: string | null;
}

export interface CategoryCard {
  name: string;
  agents: number;
  official: number;
  description: string;
  icons: string[];
}

export interface DropCard {
  /** As the page shows it: "Oct 31, 2026". */
  date: string;
  added: number;
  official: number;
  updated: number;
  /** A few additions still listed: lib/drops.ts dropHighlights. */
  names: string[];
  icons: string[];
}

export interface NewCard {
  /** Listings added since `since`. */
  added: number;
  official: number;
  /** The window's first day, as the page shows it: "Oct 4, 2026". */
  since: string;
  /** A few of them, the biggest vendors first and one per provider. */
  names: string[];
  icons: string[];
}

export interface WhatsNewCard {
  version: string;
  /** The release's title: "Come back". */
  title: string;
  /** As the page shows it: "Nov 2, 2026". */
  date: string;
  /** Its first highlights, as plain text. */
  lines: string[];
}

export interface AlternativesCard {
  /** The listing the alternatives replace. */
  name: string;
  icon: string | null;
  /** Its primary category, which every alternative shares. */
  category: string | null;
  alternatives: number;
  /** The strongest few, best first. */
  names: string[];
  /** The alternatives' icons, best first, each image once. */
  icons: string[];
}

export interface StackCard {
  title: string;
  /** A curated stack's promise; a shared stack's listing names. */
  promise: string;
  /** As the page shows it, for a stack of the week: "Oct 31, 2026". */
  week: string | null;
  /** Made by a visitor on My stack and shared as a /stack link, not curated. */
  shared: boolean;
  tools: number;
  /** Display labels of every access method in the stack, in the site's order. */
  access: string[];
  /** The listings' icons in the stack's order, each image once. */
  icons: string[];
}

export interface StacksCard {
  stacks: number;
  /** Distinct listings across every stack. */
  tools: number;
  /** One icon per stack, the stack of the week's first. */
  icons: string[];
}

export interface TaskCard {
  /** "I need to query a database" */
  title: string;
  blurb: string;
  tools: number;
  official: number;
  /** The best fits' icons, best first, each image once. */
  icons: string[];
}

export interface TasksCard {
  tasks: number;
  /** Distinct listings across every task. */
  tools: number;
  /** Each task's best fit's icon, in the tasks' order, each image once. */
  icons: string[];
}

export interface CompareCard {
  /** The compared listings, in column order. */
  columns: { name: string; provider: string; icon: string | null; access: string[] }[];
}

export interface ComparisonsCard {
  /** Curated comparisons. */
  comparisons: number;
  /** Their listings' icons, in the file's order, each image once. */
  icons: string[];
}

export interface BoardCard {
  listings: number;
  official: number;
  lit: number;
  /** The newest drop, whose additions are lit, as the page shows it: "Oct 31, 2026". */
  drop: string | null;
  /** Each panel's jacks, as lib/board.ts panelCode writes them. */
  panels: string[];
}

export interface OperatorCard {
  /** The example /operator opens with, as typed; a visitor's own request is never drawn. */
  example: string | null;
  /** The stack's listing names, in order. */
  names: string[];
  /** Parts put through to a tool. */
  jobs: number;
  /** Their tasks' labels, capitalized, in order, each once. */
  tasks: string[];
  /** The stack's icons, in order, each image once. */
  icons: string[];
}

/** An entry for Metadata openGraph.images; twitter:image copies it. */
export interface ShareImage {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: 'image/png';
}

const SITE_ICONS = 12;
const CATEGORY_ICONS = 10;
const DROP_ICONS = 10;
const DROP_NAMES = 3;
const NEW_ICONS = 10;
const NEW_NAMES = 3;
const WHATS_NEW_LINES = 3;
const ALTERNATIVE_NAMES = 3;
const TASK_ICONS = 10;
const COMPARISON_ICONS = 10;

export function siteCard(agents: Agent[], categories: Category[]): SiteCard {
  return {
    agents: agents.length,
    official: agents.filter((a) => a.official).length,
    categories: categories.length,
    icons: sampleIcons(agents, agents, SITE_ICONS),
  };
}

export function listingCard(agent: Agent): ListingCard {
  return {
    name: agent.name,
    provider: agent.providerName,
    official: agent.official,
    verified: agent.verified,
    access: agent.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m),
    category: agent.categories[0]?.name ?? null,
    description: agent.description,
    icon: agent.iconUrl ?? null,
  };
}

/** `agents` is the category's listings; `catalog`, every listing, ranks vendors. */
export function categoryCard(category: Category, agents: Agent[], catalog: Agent[]): CategoryCard {
  return {
    name: category.name,
    agents: agents.length,
    official: agents.filter((a) => a.official).length,
    description: category.description ?? '',
    icons: sampleIcons(agents, catalog, CATEGORY_ICONS),
  };
}

export function dropCard(drop: Drop, catalog: Agent[]): DropCard {
  const { listed } = dropAdditions(drop, catalog);
  return {
    date: formatDay(drop.date),
    added: drop.added.length,
    official: listed.filter((a) => a.official).length,
    updated: drop.updated.length,
    names: dropHighlights(listed, DROP_NAMES).map((a) => a.name),
    icons: sampleIcons(listed, catalog, DROP_ICONS),
  };
}

/** `groups` as lib/freshness.ts newListings returns them for `since`. */
export function newCard(groups: NewGroup[], since: string, catalog: Agent[]): NewCard {
  const fresh = groups.flatMap((g) => g.agents);
  return {
    added: fresh.length,
    official: fresh.filter((a) => a.official).length,
    since: formatDay(since),
    names: dropHighlights(rankAdditions(fresh, catalog), NEW_NAMES).map((a) => a.name),
    icons: sampleIcons(fresh, catalog, NEW_ICONS),
  };
}

/** The newest release with highlights, as /whats-new opens with it. */
export function whatsNewCard(release: Release): WhatsNewCard {
  return {
    version: release.version,
    title: release.title,
    date: formatDay(release.date),
    lines: release.highlights.slice(0, WHATS_NEW_LINES).map((h) => inlineMarkdownToText(h.text)),
  };
}

/** `alternatives` as lib/related.ts alternativesPage lists them. */
export function alternativesCard(agent: Agent, alternatives: Alternative[]): AlternativesCard {
  return {
    name: agent.name,
    icon: agent.iconUrl ?? null,
    category: agent.categories[0]?.name ?? null,
    alternatives: alternatives.length,
    names: alternatives.slice(0, ALTERNATIVE_NAMES).map((a) => a.agent.name),
    icons: distinctIcons(alternatives.map((a) => a.agent)),
  };
}

/** `entries` as lib/stacks.ts stackEntries lists them. */
export function stackCard(stack: Stack, entries: StackEntry[]): StackCard {
  return {
    title: stack.title,
    promise: stack.promise,
    week: stack.week ? formatDay(stack.week) : null,
    shared: false,
    tools: entries.length,
    access: stackAccessMethods(entries).map((m) => ACCESS_METHOD_LABELS[m]),
    icons: distinctIcons(entries.map((e) => e.agent)),
  };
}

/** A shared stack's card: `title` as lib/shared-stack.ts cleans it, `agents` its listings still in the directory. */
export function sharedStackCard(title: string, agents: Agent[]): StackCard {
  return {
    title: title || UNTITLED_STACK,
    promise: joinList(agents.map((a) => a.name)),
    week: null,
    shared: true,
    tools: agents.length,
    access: stackAccessMethods(agents.map((agent) => ({ agent, why: '' }))).map((m) => ACCESS_METHOD_LABELS[m]),
    icons: distinctIcons(agents),
  };
}

/** `stacks` in the order /stacks shows them, each with its entries. */
export function stacksCard(stacks: { entries: StackEntry[] }[]): StacksCard {
  const tools = new Set(stacks.flatMap((s) => s.entries.map((e) => e.agent.slug)));
  return {
    stacks: stacks.length,
    tools: tools.size,
    icons: distinctIcons(stacks.flatMap((s) => s.entries.slice(0, 1).map((e) => e.agent))),
  };
}

/** `fits` as lib/search.ts taskMatches ranks them. */
export function taskCard(task: Task, fits: Agent[]): TaskCard {
  return {
    title: taskTitle(task),
    blurb: task.blurb,
    tools: fits.length,
    official: fits.filter((a) => a.official).length,
    icons: distinctIcons(fits).slice(0, TASK_ICONS),
  };
}

/** Every task in the order /tasks shows them, each with its fits. */
export function tasksCard(tasks: { fits: Agent[] }[]): TasksCard {
  const tools = new Set(tasks.flatMap((t) => t.fits.map((a) => a.slug)));
  return {
    tasks: tasks.length,
    tools: tools.size,
    icons: distinctIcons(tasks.flatMap((t) => t.fits.slice(0, 1))).slice(0, TASK_ICONS),
  };
}

/** `agents` in column order, as lib/compare.ts selectCompared picks them. */
export function compareCard(agents: Agent[]): CompareCard {
  return {
    columns: agents.map((a) => ({
      name: a.name,
      provider: a.providerName,
      icon: a.iconUrl ?? null,
      access: a.accessMethods.map((m) => ACCESS_METHOD_LABELS[m] ?? m),
    })),
  };
}

/** Each curated comparison's listings, in content/comparisons.json's order. */
export function comparisonsCard(comparisons: Agent[][]): ComparisonsCard {
  return { comparisons: comparisons.length, icons: distinctIcons(comparisons.flat()).slice(0, COMPARISON_ICONS) };
}

export function boardCard(board: Board): BoardCard {
  return {
    listings: board.listings,
    official: board.official,
    lit: board.lit,
    drop: board.drop ? formatDay(board.drop) : null,
    panels: board.panels.map(panelCode),
  };
}

/** `operator` as lib/operator.ts putThrough returns it; `example` when its request is /operator's own example. */
export function operatorCard(operator: Operator, example: boolean): OperatorCard {
  const tasks = operator.parts.flatMap((p) => (p.pick && p.task ? [p.task.label] : []));
  return {
    example: example ? operator.request : null,
    names: operator.stack.map((a) => a.name),
    jobs: tasks.length,
    tasks: [...new Set(tasks.map((label) => `${label.charAt(0).toUpperCase()}${label.slice(1)}`))],
    icons: distinctIcons(operator.stack),
  };
}

export function siteCardImage(card: SiteCard): ShareImage {
  return shareImage('/card.png', card, 'Agent Switchboard — AI Agent Directory');
}

export function listingCardImage(slug: string, card: ListingCard): ShareImage {
  return shareImage(`/agents/${slug}/card.png`, card, `${card.name} by ${card.provider}, on Agent Switchboard`);
}

export function categoryCardImage(slug: string, card: CategoryCard): ShareImage {
  return shareImage(`/categories/${slug}/card.png`, card, `${card.name}: ${card.agents} AI agents on Agent Switchboard`);
}

export function dropCardImage(date: string, card: DropCard): ShareImage {
  return shareImage(
    `/drops/${date}/card.png`,
    card,
    `The ${card.date} drop on Agent Switchboard: ${card.added} listings added, ${card.updated} updated`
  );
}

export function newCardImage(card: NewCard): ShareImage {
  return shareImage('/new/card.png', card, `${card.added} listings added to Agent Switchboard since ${card.since}`);
}

export function whatsNewCardImage(card: WhatsNewCard): ShareImage {
  return shareImage('/whats-new/card.png', card, `What's new on Agent Switchboard: ${card.version}, ${card.title}`);
}

export function alternativesCardImage(slug: string, card: AlternativesCard): ShareImage {
  return shareImage(
    `/agents/${slug}/alternatives/card.png`,
    card,
    `${card.alternatives} alternatives to ${card.name} on Agent Switchboard`
  );
}

export function stackCardImage(slug: string, card: StackCard): ShareImage {
  return shareImage(`/stacks/${slug}/card.png`, card, `${card.title}: a stack of ${card.tools} tools on Agent Switchboard`);
}

/** Drawn when asked for at /stack/card.png?items=…&title=…, like any other mix on /compare. */
export function sharedStackCardImage(slugs: readonly string[], title: string, card: StackCard): ShareImage {
  return shareImage(
    `/stack/card.png?${stackQuery(slugs, title)}`,
    card,
    `${card.title}: a stack of ${card.tools} ${pluralize(card.tools, 'tool')}, shared on Agent Switchboard`
  );
}

export function stacksCardImage(card: StacksCard): ShareImage {
  return shareImage('/stacks/card.png', card, `${card.stacks} stacks of AI tools that work together, on Agent Switchboard`);
}

export function taskCardImage(slug: string, card: TaskCard): ShareImage {
  return shareImage(`/tasks/${slug}/card.png`, card, `${card.title}: ${card.tools} tools that do it, on Agent Switchboard`);
}

export function tasksCardImage(card: TasksCard): ShareImage {
  return shareImage('/tasks/card.png', card, `${card.tasks} tasks, each with the AI tools that do it, on Agent Switchboard`);
}

const compareAlt = (card: CompareCard) => `${card.columns.map((c) => c.name).join(' vs ')}, side by side on Agent Switchboard`;

/** A curated comparison's card, prerendered at /compare/<a>-vs-<b>/card.png. */
export function comparisonCardImage(slugs: readonly string[], card: CompareCard): ShareImage {
  return shareImage(`${pairPath(slugs)}/card.png`, card, compareAlt(card));
}

/** Any other 2 or 3 listings' card, drawn when asked for at /compare/card.png?a=&b=&c=. */
export function compareCardImage(slugs: readonly string[], card: CompareCard): ShareImage {
  return shareImage(`/compare/card.png?${compareQuery(slugs)}`, card, compareAlt(card));
}

export function comparisonsCardImage(card: ComparisonsCard): ShareImage {
  return shareImage('/compare/card.png', card, 'Compare AI tools side by side on Agent Switchboard');
}

export function boardCardImage(card: BoardCard): ShareImage {
  const lit = card.drop && card.lit > 0 ? `, the ${card.lit} from the ${card.drop} drop lit` : '';
  return shareImage('/switchboard/card.png', card, `All ${card.listings} listings on Agent Switchboard as jacks on one board${lit}`);
}

/** /operator's card shows its example; a request's is drawn when asked for at /operator/card.png?q=…, as a /stack link's is. */
export function operatorCardImage(request: string | null, card: OperatorCard): ShareImage {
  const tools = joinList(card.names);
  return shareImage(
    request === null ? '/operator/card.png' : `/operator/card.png?${operatorQuery(request)}`,
    card,
    card.example
      ? `Ask the switchboard: “${card.example}” put through to ${tools}, on Agent Switchboard`
      : `${tools}: ${card.names.length} ${pluralize(card.names.length, 'tool')} for ${card.jobs} ${pluralize(card.jobs, 'job')}, from the Operator on Agent Switchboard`
  );
}

function shareImage(
  path: string,
  card:
    | SiteCard
    | ListingCard
    | CategoryCard
    | DropCard
    | NewCard
    | WhatsNewCard
    | AlternativesCard
    | StackCard
    | StacksCard
    | TaskCard
    | TasksCard
    | CompareCard
    | ComparisonsCard
    | BoardCard
    | OperatorCard,
  alt: string
): ShareImage {
  const v = createHash('sha1').update(JSON.stringify([CARD_DESIGN, card])).digest('hex').slice(0, 8);
  return { url: `${path}${path.includes('?') ? '&' : '?'}v=${v}`, ...CARD_SIZE, alt, type: 'image/png' };
}

/** The listings' icons in order, each image once: an icon URL carries its image's hash as ?v=. */
function distinctIcons(agents: Agent[]): string[] {
  const icons = new Map<string, string>();
  for (const a of agents) {
    const hash = a.iconUrl?.split('?v=')[1];
    if (a.iconUrl && hash && !icons.has(hash)) icons.set(hash, a.iconUrl);
  }
  return [...icons.values()];
}

/**
 * Up to `n` icons from `agents`, one per provider: the biggest Official
 * vendors in `catalog` first so the row shows names people know, then the
 * rest in catalog order. A provider's icon is the image most of its listings
 * share, which is usually the company's logo rather than one product's.
 */
export function sampleIcons(agents: Agent[], catalog: Agent[], n: number): string[] {
  const vendorSize = new Map<string, number>();
  for (const a of catalog) {
    if (a.officialVendor) vendorSize.set(a.officialVendor.slug, (vendorSize.get(a.officialVendor.slug) ?? 0) + 1);
  }

  // provider → image hash → its first URL and how many listings share it
  const byProvider = new Map<string, Map<string, { url: string; count: number }>>();
  for (const a of agents) {
    if (!a.iconUrl) continue;
    const provider = a.officialVendor?.slug ?? a.providerName.toLowerCase();
    const images = byProvider.get(provider) ?? new Map<string, { url: string; count: number }>();
    const hash = a.iconUrl.split('?v=')[1];
    const image = images.get(hash) ?? { url: a.iconUrl, count: 0 };
    image.count++;
    images.set(hash, image);
    byProvider.set(provider, images);
  }

  // Maps keep insertion order and sort is stable, so ties stay in catalog order.
  const providers = [...byProvider].sort(([a], [b]) => (vendorSize.get(b) ?? 0) - (vendorSize.get(a) ?? 0));
  const shown = new Set<string>();
  const icons: string[] = [];
  for (const [, images] of providers) {
    const [hash, top] = [...images].reduce((best, entry) => (entry[1].count > best[1].count ? entry : best));
    if (shown.has(hash)) continue;
    shown.add(hash);
    icons.push(top.url);
    if (icons.length === n) break;
  }
  return icons;
}
