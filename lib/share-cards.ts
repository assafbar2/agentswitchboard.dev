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
import { dropAdditions, dropHighlights, type Drop } from './drops';
import type { Alternative } from './related';
import { ACCESS_METHOD_LABELS } from './search';
import type { Agent, Category } from './types';
import { formatDay } from './utils';

/**
 * Hash of lib/og.tsx and assets/fonts/, so a redesigned card gets new URLs.
 * lib/share-cards.test.ts prints the new value whenever either changes.
 */
export const CARD_DESIGN = '01c57ea2';

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
const ALTERNATIVE_NAMES = 3;

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

/** `alternatives` as lib/related.ts alternativesPage lists them. */
export function alternativesCard(agent: Agent, alternatives: Alternative[]): AlternativesCard {
  const icons = new Map<string, string>();
  for (const { agent: alt } of alternatives) {
    const hash = alt.iconUrl?.split('?v=')[1];
    if (alt.iconUrl && hash && !icons.has(hash)) icons.set(hash, alt.iconUrl);
  }
  return {
    name: agent.name,
    icon: agent.iconUrl ?? null,
    category: agent.categories[0]?.name ?? null,
    alternatives: alternatives.length,
    names: alternatives.slice(0, ALTERNATIVE_NAMES).map((a) => a.agent.name),
    icons: [...icons.values()],
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

export function alternativesCardImage(slug: string, card: AlternativesCard): ShareImage {
  return shareImage(
    `/agents/${slug}/alternatives/card.png`,
    card,
    `${card.alternatives} alternatives to ${card.name} on Agent Switchboard`
  );
}

function shareImage(
  path: string,
  card: SiteCard | ListingCard | CategoryCard | DropCard | AlternativesCard,
  alt: string
): ShareImage {
  const v = createHash('sha1').update(JSON.stringify([CARD_DESIGN, card])).digest('hex').slice(0, 8);
  return { url: `${path}?v=${v}`, ...CARD_SIZE, alt, type: 'image/png' };
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
