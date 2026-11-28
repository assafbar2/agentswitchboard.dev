/**
 * Optional structured truth fields for listings: pricing, open-source /
 * license, deployment model, lifecycle status, and authored limitations.
 *
 * Browser-safe (no Node/fs imports) so both server code, validate-content.ts,
 * public-api.ts, and client/WebMCP surfaces share the exact same rules.
 */

import { z } from 'zod';
import { bundleItem } from './bundle';
import {
  DEPLOYMENT_MODELS,
  LIFECYCLE_STATES,
  PRICING_MODELS,
  type Agent,
  type DeploymentModel,
  type LifecycleState,
  type PricingModel,
} from './types';

export const LICENSE_MAX_LENGTH = 40;
export const LIFECYCLE_NOTE_MAX_LENGTH = 240;
export const LIMITATION_MAX_ITEMS = 4;
export const LIMITATION_MAX_LENGTH = 140;
/** Maximum total items returned by merged authored + mechanical limitations. */
export const MAX_MERGED_LIMITATIONS = 6;

const HTTP_URL = /^https?:\/\//i;

/** Zod field definitions spread into AgentSchema in scripts/validate-content.ts. */
export const truthFieldsShape = {
  pricing: z.enum(PRICING_MODELS).optional(),
  pricingUrl: z
    .string()
    .url()
    .refine((u) => HTTP_URL.test(u), 'pricingUrl must start with http:// or https://')
    .optional(),
  openSource: z.boolean().optional(),
  license: z.string().trim().min(1).max(LICENSE_MAX_LENGTH).optional(),
  deployment: z
    .array(z.enum(DEPLOYMENT_MODELS))
    .min(1)
    .max(DEPLOYMENT_MODELS.length)
    .refine((items) => new Set(items).size === items.length, 'deployment values must be unique')
    .optional(),
  lifecycle: z.enum(LIFECYCLE_STATES).optional(),
  lifecycleNote: z.string().trim().min(1).max(LIFECYCLE_NOTE_MAX_LENGTH).optional(),
  limitations: z
    .array(z.string().trim().min(1).max(LIMITATION_MAX_LENGTH))
    .max(LIMITATION_MAX_ITEMS)
    .optional(),
};

export const TruthFieldsSchema = z.object(truthFieldsShape).strict();

export const PRICING_LABELS: Record<PricingModel, string> = {
  free: 'Free',
  freemium: 'Freemium',
  paid: 'Paid',
  'usage-based': 'Usage-based',
  enterprise: 'Enterprise',
  'open-source': 'Open source',
};

export const DEPLOYMENT_LABELS: Record<DeploymentModel, string> = {
  hosted: 'Hosted',
  'self-hosted': 'Self-hosted',
  local: 'Local',
};

export const LIFECYCLE_LABELS: Record<LifecycleState, string> = {
  active: 'Active',
  beta: 'Beta',
  acquired: 'Acquired',
  deprecated: 'Deprecated',
};

export const LIFECYCLE_DEFAULT_NOTES: Record<Exclude<LifecycleState, 'active'>, string> = {
  beta: 'This product is currently in beta; APIs and availability may change.',
  acquired: "This product was acquired; check the vendor's current docs for ongoing availability.",
  deprecated: 'This product is deprecated and may no longer be maintained.',
};

/** Whether a lifecycle state warrants a top notice banner on the listing page. */
export function isNotableLifecycle(
  lifecycle: LifecycleState | undefined
): lifecycle is Exclude<LifecycleState, 'active'> {
  return lifecycle === 'acquired' || lifecycle === 'deprecated' || lifecycle === 'beta';
}

/** Structured truth fields for REST / MCP / WebMCP detail payloads (null when unset). */
export function truthFields(a: Agent) {
  return {
    pricing: a.pricing ?? null,
    pricingUrl: a.pricingUrl ?? null,
    openSource: a.openSource ?? null,
    license: a.license ?? null,
    deployment: a.deployment && a.deployment.length > 0 ? a.deployment : null,
    lifecycle: a.lifecycle ?? null,
    lifecycleNote: a.lifecycleNote ?? null,
  };
}

function normalizeLimitation(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Authored factual limitations merged with mechanical listing constraints:
 * authored caveats come first, deduplicated case- and punctuation-insensitively,
 * and bounded to MAX_MERGED_LIMITATIONS.
 */
export function mergeLimitations(agent: Agent): string[] {
  const item = bundleItem(agent);
  const mechanical: string[] = [];
  if (agent.authType === 'oauth2') mechanical.push(`needs a ${agent.providerName} sign-in`);
  else if (agent.authType === 'apiKey') mechanical.push(`needs an API key from ${agent.providerName}`);
  else if (agent.authType === 'bearer') mechanical.push(`needs a token from ${agent.providerName}`);
  if (item.server && 'command' in item.server) {
    mechanical.push('runs only on your own computer, with no hosted server');
  }
  if (item.how === 'guide') mechanical.push('no MCP config to copy yet, so set it up from its guide');
  if (item.how === 'other') mechanical.push('no MCP server');
  if (!agent.verified) mechanical.push('not Verified yet');

  const authored = (agent.limitations ?? [])
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of [...authored, ...mechanical]) {
    if (out.length >= MAX_MERGED_LIMITATIONS) break;
    const key = normalizeLimitation(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}
