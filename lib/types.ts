/**
 * Catalog types. Content lives in content/ (git-as-CMS); these types
 * describe the JSON files and everything the site renders.
 */

/** Legacy rich-text documents from the previous CMS, preserved in some
 *  entries (longDescription, authInstructions, integrationGuide). Kept as
 *  opaque JSON — not currently rendered anywhere. */
export type RichTextDocument = Record<string, unknown>;

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
  longDescription?: RichTextDocument;
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
  authInstructions?: RichTextDocument;
  integrationGuide?: RichTextDocument;
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
