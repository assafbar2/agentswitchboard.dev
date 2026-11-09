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

export const INSTALL_TYPES = ['npm', 'pip', 'brew', 'docker', 'binary'] as const;

export interface AgentInstall {
  type: (typeof INSTALL_TYPES)[number];
  command: string;
}

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
  // How to start using it, each value printed in the vendor's own docs and
  // absent when they don't print one. See lib/use-it-now.ts.
  /** The vendor's hosted MCP server address. */
  mcpEndpoint?: string;
  /** The command that runs the MCP server locally, e.g. "npx -y @playwright/mcp@latest". */
  mcpCommand?: string;
  /** The command that installs the CLI. */
  install?: AgentInstall;
  /** The vendor's setup or getting-started page. */
  quickstartUrl?: string;
  /** Base URL of the vendor's public API. */
  apiBaseUrl?: string;
  /**
   * Site path of the listing's fetched icon (/icons/<slug>.png?v=…), from
   * content/icons.json; absent when it has none. See lib/icons.ts.
   */
  iconUrl?: string;
  status: 'published' | 'draft' | 'archived';
  featured: boolean;
  featuredUntil?: string;
  verified: boolean;
  /** First-party listing from a major vendor in content/official-vendors.json. */
  official: boolean;
  /** The vendor behind an official listing, resolved from its agentUrl. */
  officialVendor?: { slug: string; name: string };
  referralUrl?: string;
  /**
   * A paid placement, set only by the maintainer. It labels the listing
   * Sponsored and puts it in the Sponsored slot on the homepage and the latest
   * drop page; nothing that ranks or picks listings reads it.
   */
  sponsored?: boolean;
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
  /** Ordered homepage slots (agent slugs); the first is the Editor's Pick. */
  homepageFeatured?: string[];
}

/** One line of content/changelog.json, the directory's change log. */
export interface ChangelogEntry {
  action: 'added' | 'removed' | 'updated';
  slug: string;
  name: string;
  /** What changed, or why a listing was removed. Older entries may have null. */
  note?: string | null;
  /** YYYY-MM-DD, UTC. */
  date: string;
}

// ── Query options ───────────────────────────────────────────────────

export interface AgentQueryOptions {
  category?: string;
  tag?: string;
  featured?: boolean;
  verified?: boolean;
  official?: boolean;
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
