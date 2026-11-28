import type { Agent } from './types';

export type BadgeTier = 'official' | 'verified' | 'listed';

export interface BadgeInfo {
  tier: BadgeTier;
  label: string;
  alt: string;
  path: string;
  width: number;
  height: number;
  description: string;
}

export const SITE_ORIGIN = 'https://agentswitchboard.dev';

const BADGE_META: Record<BadgeTier, BadgeInfo> = {
  official: {
    tier: 'official',
    label: 'Official',
    alt: 'Official on Agent Switchboard',
    path: '/badges/official.svg',
    width: 234,
    height: 28,
    description: 'First-party listing published by a major vendor under its own domain or GitHub org.',
  },
  verified: {
    tier: 'verified',
    label: 'Verified',
    alt: 'Verified on Agent Switchboard',
    path: '/badges/verified.svg',
    width: 234,
    height: 28,
    description: 'Listing whose URLs and declared access path (API, MCP, CLI or extension) have been checked.',
  },
  listed: {
    tier: 'listed',
    label: 'Listed',
    alt: 'Listed on Agent Switchboard',
    path: '/badges/listed.svg',
    width: 218,
    height: 28,
    description: 'Published entry in the Agent Switchboard directory.',
  },
};

export const ALL_BADGE_TIERS: readonly BadgeTier[] = ['official', 'verified', 'listed'] as const;

export function badgeTier(agent: Pick<Agent, 'official' | 'verified'>): BadgeTier {
  if (agent.official) return 'official';
  if (agent.verified) return 'verified';
  return 'listed';
}

export function badgeMeta(tier: BadgeTier): BadgeInfo {
  return BADGE_META[tier];
}

export interface BadgeSnippets {
  tier: BadgeTier;
  label: string;
  alt: string;
  path: string;
  imageUrl: string;
  listingUrl: string;
  width: number;
  height: number;
  markdown: string;
  html: string;
}

export function badgeSnippets(
  agent: Pick<Agent, 'slug' | 'official' | 'verified'>,
  origin: string = SITE_ORIGIN
): BadgeSnippets {
  const base = origin.replace(/\/+$/, '');
  const tier = badgeTier(agent);
  const meta = BADGE_META[tier];
  const imageUrl = `${base}${meta.path}`;
  const listingUrl = `${base}/agents/${agent.slug}`;

  return {
    tier,
    label: meta.label,
    alt: meta.alt,
    path: meta.path,
    imageUrl,
    listingUrl,
    width: meta.width,
    height: meta.height,
    markdown: `[![${meta.alt}](${imageUrl})](${listingUrl})`,
    html: `<a href="${listingUrl}"><img src="${imageUrl}" alt="${meta.alt}" width="${meta.width}" height="${meta.height}" /></a>`,
  };
}
