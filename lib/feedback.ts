/**
 * Zero-cost feedback loop URL helpers:
 *   1. Pre-filled GitHub issue URL for reporting errors or suggesting updates
 *      on any live listing page (/agents/[slug]).
 *   2. Pre-filled /request URL linking empty search states and task footers to
 *      the human missing-tool request form (POST /api/missing-tool).
 */

import { BASE_URL } from './env';
import type { Agent } from './types';

export const REPO_ISSUES_NEW_URL = 'https://github.com/assafbar2/agentswitchboard.dev/issues/new';

/** Build a pre-filled GitHub issue URL for correcting or updating a live listing. */
export function listingFeedbackUrl(agent: Pick<Agent, 'slug' | 'name' | 'agentUrl'>): string {
  const title = `[Update] ${agent.name} (${agent.slug})`;
  const body = [
    `Listing: ${BASE_URL}/agents/${agent.slug}`,
    `File: \`content/agents/${agent.slug}.json\``,
    `Current URL: ${agent.agentUrl}`,
    '',
    '### What needs updating?',
    '<!-- Broken link, wrong auth/access method, pricing/open-source/lifecycle change, acquisition, or missing setup config -->',
    '',
    '### Official source or docs link',
    '<!-- Link to the official documentation, changelog, or announcement confirming the change -->',
    '',
  ].join('\n');

  const params = new URLSearchParams({
    title,
    labels: 'listing-update',
    body,
  });
  return `${REPO_ISSUES_NEW_URL}?${params.toString()}`;
}

/** Link to the human missing-tool request form, optionally pre-filling what was tried. */
export function missingToolHref(options: { tried?: string; category?: string } = {}): string {
  const params = new URLSearchParams();
  const tried = options.tried?.trim();
  const category = options.category?.trim();
  if (tried) params.set('tried', tried);
  if (category) params.set('category', category);
  const qs = params.toString();
  return qs ? `/request?${qs}` : '/request';
}
