import type { EntryFieldTypes } from 'contentful';
import type { Document } from '@contentful/rich-text-types';

// ── Contentful skeletons ────────────────────────────────────────────
// Declared with EntryFieldTypes so the SDK derives typed query keys
// ('fields.slug'), order paths ('-fields.featured'), and resolved link
// shapes. Enum-like Symbol fields are strings at the type level; mappers
// narrow them to the app-level unions.

export interface AgentSkeleton {
  contentTypeId: 'agent';
  fields: {
    name: EntryFieldTypes.Symbol;
    slug: EntryFieldTypes.Symbol;
    description: EntryFieldTypes.Symbol;
    longDescription?: EntryFieldTypes.RichText;
    providerName: EntryFieldTypes.Symbol;
    providerUrl: EntryFieldTypes.Symbol;
    version?: EntryFieldTypes.Symbol;
    agentUrl: EntryFieldTypes.Symbol;
    wellKnownUrl?: EntryFieldTypes.Symbol;
    agentCardJson?: EntryFieldTypes.Text;
    categories: EntryFieldTypes.Array<EntryFieldTypes.EntryLink<CategorySkeleton>>;
    tags?: EntryFieldTypes.Array<EntryFieldTypes.Symbol>;
    skills?: EntryFieldTypes.Object;
    authType?: EntryFieldTypes.Symbol;
    authInstructions?: EntryFieldTypes.RichText;
    integrationGuide?: EntryFieldTypes.RichText;
    supportsStreaming?: EntryFieldTypes.Boolean;
    supportsPushNotifications?: EntryFieldTypes.Boolean;
    iconUrl?: EntryFieldTypes.Symbol;
    status: EntryFieldTypes.Symbol;
    featured?: EntryFieldTypes.Boolean;
    featuredUntil?: EntryFieldTypes.Date;
    verified?: EntryFieldTypes.Boolean;
    referralUrl?: EntryFieldTypes.Symbol;
    sponsorLabel?: EntryFieldTypes.Symbol;
    tier?: EntryFieldTypes.Symbol;
    discoveredBy?: EntryFieldTypes.Symbol;
    workerSource?: EntryFieldTypes.Symbol;
    accessMethods?: EntryFieldTypes.Array<EntryFieldTypes.Symbol>;
  };
}

export interface CategorySkeleton {
  contentTypeId: 'category';
  fields: {
    name: EntryFieldTypes.Symbol;
    slug: EntryFieldTypes.Symbol;
    description?: EntryFieldTypes.Symbol;
    icon?: EntryFieldTypes.Symbol;
    sortOrder?: EntryFieldTypes.Integer;
  };
}

export interface SiteSettingsSkeleton {
  contentTypeId: 'siteSettings';
  fields: {
    siteName: EntryFieldTypes.Symbol;
    tagline: EntryFieldTypes.Symbol;
    heroSubtitle?: EntryFieldTypes.Symbol;
    footerText?: EntryFieldTypes.Symbol;
    advertiseUrl?: EntryFieldTypes.Symbol;
    premiumPriceMonthly?: EntryFieldTypes.Number;
    premiumCheckoutUrl?: EntryFieldTypes.Symbol;
  };
}

// ── App-level types ─────────────────────────────────────────────────

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export type AgentLabel = 'editors-pick' | 'featured' | 'new';

export interface HomepageAgent {
  agent: Agent;
  label: AgentLabel;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
  description: string;
  longDescription?: Document;
  providerName: string;
  providerUrl: string;
  version?: string;
  agentUrl: string;
  wellKnownUrl?: string;
  agentCardJson?: string;
  categories: Category[];
  tags: string[];
  skills: AgentSkill[];
  authType: 'apiKey' | 'oauth2' | 'bearer' | 'none';
  authInstructions?: Document;
  integrationGuide?: Document;
  supportsStreaming: boolean;
  supportsPushNotifications: boolean;
  iconUrl?: string;
  status: 'published' | 'draft' | 'archived';
  featured: boolean;
  featuredUntil?: string;
  verified: boolean;
  referralUrl?: string;
  sponsorLabel?: string;
  tier: 'free' | 'premium';
  discoveredBy: 'manual' | 'worker';
  workerSource?: string;
  accessMethods: ('api' | 'mcp' | 'cli' | 'browser-extension')[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  agentCount?: number;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  heroSubtitle?: string;
  footerText?: string;
  advertiseUrl?: string;
  premiumPriceMonthly?: number;
  premiumCheckoutUrl?: string;
}

// ── Query options ───────────────────────────────────────────────────

export interface AgentQueryOptions {
  category?: string;
  tag?: string;
  featured?: boolean;
  verified?: boolean;
  tier?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

export interface AgentCandidate {
  name: string;
  description: string;
  agentUrl: string;
  wellKnownUrl: string;
  agentCardJson: string;
  skills: AgentSkill[];
  authType?: string;
  source: string;
}
