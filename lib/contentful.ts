import { createClient } from 'contentful';
import { createClient as createManagementClient } from 'contentful-management';
import type { Agent, AgentQueryOptions, AgentSkill, Category, SiteSettings } from './types';
import type { Document } from '@contentful/rich-text-types';

// ── Clients ─────────────────────────────────────────────────────────

export const contentfulClient = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN!,
});

export const previewClient = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_PREVIEW_TOKEN!,
  host: 'preview.contentful.com',
});

export function getManagementClient() {
  return createManagementClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN!,
  });
}

// ── Mappers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAgent(entry: any): Agent {
  const f = entry.fields;
  return {
    id: entry.sys.id,
    name: f.name,
    slug: f.slug,
    description: f.description,
    longDescription: f.longDescription as Document | undefined,
    providerName: f.providerName,
    providerUrl: f.providerUrl,
    version: f.version,
    agentUrl: f.agentUrl,
    wellKnownUrl: f.wellKnownUrl,
    agentCardJson: f.agentCardJson,
    categories: Array.isArray(f.categories)
      ? f.categories.filter((c: any) => c?.fields).map(mapCategory)
      : [],
    tags: f.tags ?? [],
    skills: (f.skills as AgentSkill[]) ?? [],
    authType: f.authType ?? 'none',
    authInstructions: f.authInstructions as Document | undefined,
    integrationGuide: f.integrationGuide as Document | undefined,
    supportsStreaming: f.supportsStreaming ?? false,
    supportsPushNotifications: f.supportsPushNotifications ?? false,
    iconUrl: f.iconUrl,
    status: f.status ?? 'draft',
    featured: f.featured ?? false,
    featuredUntil: f.featuredUntil,
    verified: f.verified ?? false,
    referralUrl: f.referralUrl,
    sponsorLabel: f.sponsorLabel,
    tier: f.tier ?? 'free',
    discoveredBy: f.discoveredBy ?? 'manual',
    workerSource: f.workerSource,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCategory(entry: any): Category {
  const f = entry.fields;
  return {
    id: entry.sys.id,
    name: f.name,
    slug: f.slug,
    description: f.description,
    icon: f.icon,
    sortOrder: f.sortOrder ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSiteSettings(entry: any): SiteSettings {
  const f = entry.fields;
  return {
    siteName: f.siteName,
    tagline: f.tagline,
    heroSubtitle: f.heroSubtitle,
    footerText: f.footerText,
    advertiseUrl: f.advertiseUrl,
    premiumPriceMonthly: f.premiumPriceMonthly,
    premiumCheckoutUrl: f.premiumCheckoutUrl,
  };
}

// ── Fetchers ────────────────────────────────────────────────────────

export async function getAllAgents(
  options: AgentQueryOptions = {}
): Promise<{ agents: Agent[]; total: number }> {
  const {
    category,
    tag,
    featured,
    verified,
    tier,
    search,
    limit = 24,
    skip = 0,
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    content_type: 'agent',
    'fields.status': 'published',
    include: 2,
    limit,
    skip,
    order: ['-fields.featured', 'fields.name'],
  };

  if (category) {
    const catEntries = await contentfulClient.getEntries({
      content_type: 'category',
      'fields.slug': category,
      limit: 1,
    });
    if (catEntries.items.length > 0) {
      query['fields.categories.sys.id'] = catEntries.items[0].sys.id;
    }
  }

  if (tag) query['fields.tags[in]'] = tag;
  if (featured) {
    query['fields.featured'] = true;
    query['fields.featuredUntil[gte]'] = new Date().toISOString();
  }
  if (verified) query['fields.verified'] = true;
  if (tier) query['fields.tier'] = tier;
  if (search) query['query'] = search;

  const entries = await contentfulClient.getEntries(query);

  return {
    agents: entries.items.map(mapAgent),
    total: entries.total,
  };
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const entries = await contentfulClient.getEntries({
    content_type: 'agent',
    'fields.slug': slug,
    'fields.status': 'published',
    include: 2,
    limit: 1,
  });

  if (entries.items.length === 0) return null;
  return mapAgent(entries.items[0]);
}

export async function getAllCategories(): Promise<Category[]> {
  const entries = await contentfulClient.getEntries({
    content_type: 'category',
    order: ['fields.sortOrder'],
    limit: 100,
  });

  return entries.items.map(mapCategory);
}

export async function getCategoryBySlug(
  slug: string
): Promise<{ category: Category; agents: Agent[] } | null> {
  const catEntries = await contentfulClient.getEntries({
    content_type: 'category',
    'fields.slug': slug,
    limit: 1,
  });

  if (catEntries.items.length === 0) return null;
  const category = mapCategory(catEntries.items[0]);

  const agentEntries = await contentfulClient.getEntries({
    content_type: 'agent',
    'fields.status': 'published',
    'fields.categories.sys.id': category.id,
    include: 2,
    order: ['-fields.featured', 'fields.name'],
    limit: 100,
  });

  return {
    category,
    agents: agentEntries.items.map(mapAgent),
  };
}

export async function getFeaturedAgents(): Promise<Agent[]> {
  const entries = await contentfulClient.getEntries({
    content_type: 'agent',
    'fields.featured': true,
    'fields.status': 'published',
    include: 2,
    limit: 6,
    order: ['fields.name'],
  });

  const now = new Date().toISOString();
  return entries.items
    .map(mapAgent)
    .filter((a) => !a.featuredUntil || a.featuredUntil >= now);
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const entries = await contentfulClient.getEntries({
    content_type: 'siteSettings',
    limit: 1,
  });

  if (entries.items.length === 0) return null;
  return mapSiteSettings(entries.items[0]);
}

export async function getAgentCount(): Promise<number> {
  const entries = await contentfulClient.getEntries({
    content_type: 'agent',
    'fields.status': 'published',
    limit: 0,
  });
  return entries.total;
}

export async function getTotalSkillsCount(): Promise<number> {
  const { agents } = await getAllAgents({ limit: 1000 });
  return agents.reduce((sum, a) => sum + a.skills.length, 0);
}

// ── Management API helpers ──────────────────────────────────────────

export async function createDraftAgent(data: {
  name: string;
  slug: string;
  description: string;
  agentUrl: string;
  wellKnownUrl?: string;
  agentCardJson?: string;
  skills?: unknown;
  categoryIds?: string[];
  discoveredBy: 'manual' | 'worker';
  workerSource?: string;
}) {
  const client = getManagementClient();
  const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID!);
  const environment = await space.getEnvironment('master');

  const categoryLinks = (data.categoryIds ?? []).map((id) => ({
    sys: { type: 'Link' as const, linkType: 'Entry' as const, id },
  }));

  const entry = await environment.createEntry('agent', {
    fields: {
      name: { 'en-US': data.name },
      slug: { 'en-US': data.slug },
      description: { 'en-US': data.description.slice(0, 200) },
      agentUrl: { 'en-US': data.agentUrl },
      wellKnownUrl: data.wellKnownUrl
        ? { 'en-US': data.wellKnownUrl }
        : undefined,
      agentCardJson: data.agentCardJson
        ? { 'en-US': data.agentCardJson }
        : undefined,
      skills: data.skills ? { 'en-US': data.skills } : undefined,
      categories: { 'en-US': categoryLinks },
      status: { 'en-US': 'draft' },
      discoveredBy: { 'en-US': data.discoveredBy },
      workerSource: data.workerSource
        ? { 'en-US': data.workerSource }
        : undefined,
      tier: { 'en-US': 'free' },
      featured: { 'en-US': false },
      verified: { 'en-US': false },
      supportsStreaming: { 'en-US': false },
      supportsPushNotifications: { 'en-US': false },
      providerName: { 'en-US': data.name },
      providerUrl: { 'en-US': data.agentUrl },
    },
  });

  return entry;
}

export async function isAgentAlreadyListed(
  agentUrl: string
): Promise<boolean> {
  const entries = await contentfulClient.getEntries({
    content_type: 'agent',
    'fields.agentUrl': agentUrl,
    limit: 1,
  });
  return entries.total > 0;
}
