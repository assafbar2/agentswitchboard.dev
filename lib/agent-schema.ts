import type { Agent } from './types';

/**
 * Build only the structured metadata supported by catalog fields.
 * Authentication and directory placement do not establish product price or OS.
 */
export function buildAgentSchema(agent: Agent) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: agent.name,
    description: agent.description,
    url: agent.agentUrl,
    applicationCategory: 'DeveloperApplication',
    provider: {
      '@type': 'Organization',
      name: agent.providerName,
      url: agent.providerUrl,
    },
  };
}
