import type { Entry, Asset, EntrySkeletonType } from 'contentful';
import type { Document } from '@contentful/rich-text-types';

// ── Contentful field types ──────────────────────────────────────────

export interface AgentFields {
  name: string;
  slug: string;
  description: string;
  longDescription?: Document;
  providerName: string;
  providerUrl: string;
  version?: string;
  agentUrl: string;
  wellKnownUrl?: string;
  agentCardJson?: string;
  categories: Entry<CategorySkeleton>[];
  tags?: string[];
  skills?: AgentSkill[];
  authType?: 'apiKey' | 'oauth2' | 'bearer' | 'none';
  authInstructions?: Document;
  integrationGuide?: Document;
  supportsStreaming?: boolean;
  supportsPushNotifications?: boolean;
  iconUrl?: string;
  status: 'published' | 'draft' | 'archived';
  featured?: boolean;
  featuredUntil?: string;
  verified?: boolean;
  referralUrl?: string;
  sponsorLabel?: string;
  tier?: 'free' | 'premium';
  discoveredBy?: 'manual' | 'worker';
  workerSource?: string;
  accessMethods?: ('api' | 'mcp' | 'cli' | 'browser-extension')[];
}

export interface CategoryFields {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface SiteSettingsFields {
  siteName: string;
  tagline: string;
  heroSubtitle?: string;
  footerText?: string;
  advertiseUrl?: string;
  premiumPriceMonthly?: number;
  premiumCheckoutUrl?: string;
}

// ── Contentful skeletons ────────────────────────────────────────────

export interface AgentSkeleton extends EntrySkeletonType {
  contentTypeId: 'agent';
  fields: AgentFields;
}

export interface CategorySkeleton extends EntrySkeletonType {
  contentTypeId: 'category';
  fields: CategoryFields;
}

export interface SiteSettingsSkeleton extends EntrySkeletonType {
  contentTypeId: 'siteSettings';
  fields: SiteSettingsFields;
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
