import { createClient, type ContentfulClientApi } from 'contentful';
import { createClient as createManagementClient } from 'contentful-management';
import { cache } from 'react';
import { requireEnv } from './env';
import type { Agent, AgentQueryOptions, AgentSkill, Category, HomepageAgent, SiteSettings } from './types';
import type { Document } from '@contentful/rich-text-types';

// ── Clients ─────────────────────────────────────────────────────────

export const contentfulClient = createClient({
  space: requireEnv('CONTENTFUL_SPACE_ID'),
  accessToken: requireEnv('CONTENTFUL_DELIVERY_TOKEN'),
});

// Lazy: only required when previewing drafts.
let _previewClient: ContentfulClientApi<undefined> | null = null;
export function getPreviewClient() {
  if (!_previewClient) {
    _previewClient = createClient({
      space: requireEnv('CONTENTFUL_SPACE_ID'),
      accessToken: requireEnv('CONTENTFUL_PREVIEW_TOKEN'),
      host: 'preview.contentful.com',
    });
  }
  return _previewClient;
}

export function getManagementClient() {
  return createManagementClient({
    accessToken: requireEnv('CONTENTFUL_MANAGEMENT_TOKEN'),
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
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        f.categories.filter((c: any) => c?.fields).map(mapCategory)
      : [],
    tags: f.tags ?? [],
    skills: Array.isArray(f.skills)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f.skills as any[]).map((s) =>
          typeof s === 'string'
            ? ({ id: s, name: s, description: s } as AgentSkill)
            : (s as AgentSkill)
        )
      : [],
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
    accessMethods: f.accessMethods ?? [],
    createdAt: entry.sys.createdAt,
    updatedAt: entry.sys.updatedAt,
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

/**
 * Fetch EVERY published agent, paginating past Contentful's 1000-per-request
 * cap. Wrapped in React cache() so all call sites within one render share a
 * single fetch. This is the canonical "full catalog" — use it instead of
 * getAllAgents({ limit: N }) whenever the complete directory is needed.
 */
export const getEveryAgent = cache(async (): Promise<Agent[]> => {
  const PAGE = 1000;
  const all: Agent[] = [];
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const entries = await contentfulClient.getEntries({
      content_type: 'agent',
      'fields.status': 'published',
      include: 2,
      limit: PAGE,
      skip,
      order: ['-fields.featured', 'fields.name'],
    });
    total = entries.total;
    all.push(...entries.items.map(mapAgent));
    skip += PAGE;
  }

  return all;
});

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
  const [entries, agents] = await Promise.all([
    contentfulClient.getEntries({
      content_type: 'category',
      order: ['fields.sortOrder'],
      limit: 100,
    }),
    getEveryAgent(),
  ]);

  // Count published agents per category so agentCount is always populated
  const counts = new Map<string, number>();
  for (const agent of agents) {
    for (const cat of agent.categories) {
      counts.set(cat.slug, (counts.get(cat.slug) ?? 0) + 1);
    }
  }

  return entries.items.map((entry) => {
    const cat = mapCategory(entry);
    return { ...cat, agentCount: counts.get(cat.slug) ?? 0 };
  });
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

export async function getHomepageAgents(): Promise<HomepageAgent[]> {
  // Pinned slots — always first, in this order
  const PINNED: Array<{ slug: string; label: HomepageAgent['label'] }> = [
    { slug: 'agentmail',      label: 'editors-pick' },
    { slug: 'here-now',       label: 'featured' },
    { slug: 'playwright-mcp', label: 'featured' },
    { slug: 'clawvisor',      label: 'featured' },
  ];

  const pinnedResults = await Promise.all(
    PINNED.map(async ({ slug, label }) => {
      const agent = await getAgentBySlug(slug);
      return agent ? { agent, label } : null;
    })
  );
  const pinned = pinnedResults.filter(Boolean) as HomepageAgent[];
  const pinnedIds = new Set(pinned.map((p) => p.agent.id));

  // Slugs to suppress from the newest section (pinned elsewhere or manually hidden)
  const SUPPRESS_FROM_NEWEST = new Set(['vennio']);

  // Fetch newest agents to fill the remaining slots
  const newEntries = await contentfulClient.getEntries({
    content_type: 'agent',
    'fields.status': 'published',
    include: 2,
    limit: 20, // fetch extra, we'll filter and trim
    order: ['-sys.createdAt'],
  });

  const newest: HomepageAgent[] = newEntries.items
    .map(mapAgent)
    .filter((a) => !pinnedIds.has(a.id) && !SUPPRESS_FROM_NEWEST.has(a.slug))
    .slice(0, 2)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((agent) => ({ agent, label: 'new' as const }));

  return [...pinned, ...newest];
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
  return (await getEveryAgent()).length;
}

export async function getTotalSkillsCount(): Promise<number> {
  const agents = await getEveryAgent();
  return agents.reduce((sum, a) => sum + a.skills.length, 0);
}

export async function getUniqueProviderCount(): Promise<number> {
  const agents = await getEveryAgent();
  return new Set(agents.map((a) => a.providerName)).size;
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
