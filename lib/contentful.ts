import { createClient, type ContentfulClientApi, type Entry, type UnresolvedLink } from 'contentful';
import { createClient as createManagementClient } from 'contentful-management';
import { cache } from 'react';
import { requireEnv } from './env';
import type {
  Agent,
  AgentQueryOptions,
  AgentSkill,
  AgentSkeleton,
  Category,
  CategorySkeleton,
  HomepageAgent,
  SiteSettings,
  SiteSettingsSkeleton,
} from './types';

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

type AgentEntry = Entry<AgentSkeleton, undefined, string>;
type CategoryEntry = Entry<CategorySkeleton, undefined, string>;
type SiteSettingsEntry = Entry<SiteSettingsSkeleton, undefined, string>;

/** Narrow a linked entry: with include-depth resolution, links either resolve
 *  to full entries (with `fields`) or stay as unresolved sys links. */
function isResolved(
  link: CategoryEntry | UnresolvedLink<'Entry'>
): link is CategoryEntry {
  return 'fields' in link && !!link.fields;
}

function mapAgent(entry: AgentEntry): Agent {
  const f = entry.fields;
  return {
    id: entry.sys.id,
    name: f.name,
    slug: f.slug,
    description: f.description,
    longDescription: f.longDescription,
    providerName: f.providerName,
    providerUrl: f.providerUrl,
    version: f.version,
    agentUrl: f.agentUrl,
    wellKnownUrl: f.wellKnownUrl,
    agentCardJson: f.agentCardJson,
    categories: Array.isArray(f.categories)
      ? f.categories.filter(isResolved).map(mapCategory)
      : [],
    tags: f.tags ?? [],
    skills: Array.isArray(f.skills)
      ? (f.skills as (AgentSkill | string)[]).map((s) =>
          typeof s === 'string'
            ? ({ id: s, name: s, description: s } satisfies AgentSkill)
            : s
        )
      : [],
    // Enum-like Symbol fields: Contentful validates allowed values at write
    // time, so narrowing casts at this boundary are safe.
    authType: (f.authType ?? 'none') as Agent['authType'],
    authInstructions: f.authInstructions,
    integrationGuide: f.integrationGuide,
    supportsStreaming: f.supportsStreaming ?? false,
    supportsPushNotifications: f.supportsPushNotifications ?? false,
    iconUrl: f.iconUrl,
    status: (f.status ?? 'draft') as Agent['status'],
    featured: f.featured ?? false,
    featuredUntil: f.featuredUntil,
    verified: f.verified ?? false,
    referralUrl: f.referralUrl,
    sponsorLabel: f.sponsorLabel,
    tier: (f.tier ?? 'free') as Agent['tier'],
    discoveredBy: (f.discoveredBy ?? 'manual') as Agent['discoveredBy'],
    workerSource: f.workerSource,
    accessMethods: (f.accessMethods ?? []) as Agent['accessMethods'],
    createdAt: entry.sys.createdAt,
    updatedAt: entry.sys.updatedAt,
  };
}

function mapCategory(entry: CategoryEntry): Category {
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

function mapSiteSettings(entry: SiteSettingsEntry): SiteSettings {
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
    const catEntries = await contentfulClient.getEntries<CategorySkeleton>({
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

  const entries = await contentfulClient.getEntries<AgentSkeleton>(query);

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
    const entries = await contentfulClient.getEntries<AgentSkeleton>({
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
  const entries = await contentfulClient.getEntries<AgentSkeleton>({
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
    contentfulClient.getEntries<CategorySkeleton>({
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
  const catEntries = await contentfulClient.getEntries<CategorySkeleton>({
    content_type: 'category',
    'fields.slug': slug,
    limit: 1,
  });

  if (catEntries.items.length === 0) return null;
  const category = mapCategory(catEntries.items[0]);

  const agentEntries = await contentfulClient.getEntries<AgentSkeleton>({
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
  const entries = await contentfulClient.getEntries<AgentSkeleton>({
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

/**
 * Homepage slots are fully CMS-driven: agents with `featured: true` (and an
 * unexpired `featuredUntil`, when set) fill up to SLOTS positions, ordered
 * by name; the first is labeled Editor's Pick. Any remaining slots are
 * filled with the newest additions. Curation happens in Contentful — no
 * code deploy needed to change the homepage.
 */
export async function getHomepageAgents(): Promise<HomepageAgent[]> {
  const SLOTS = 6;
  const now = new Date().toISOString();
  const agents = await getEveryAgent();

  const featured: HomepageAgent[] = agents
    .filter((a) => a.featured && (!a.featuredUntil || a.featuredUntil >= now))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, SLOTS)
    .map((agent, i) => ({
      agent,
      label: i === 0 ? ('editors-pick' as const) : ('featured' as const),
    }));

  const featuredIds = new Set(featured.map((f) => f.agent.id));

  const newest: HomepageAgent[] = agents
    .filter((a) => !featuredIds.has(a.id) && a.createdAt)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, Math.max(0, SLOTS - featured.length))
    .map((agent) => ({ agent, label: 'new' as const }));

  return [...featured, ...newest];
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const entries = await contentfulClient.getEntries<SiteSettingsSkeleton>({
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
  const entries = await contentfulClient.getEntries<AgentSkeleton>({
    content_type: 'agent',
    'fields.agentUrl': agentUrl,
    limit: 1,
  });
  return entries.total > 0;
}
