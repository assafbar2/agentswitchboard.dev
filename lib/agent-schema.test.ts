import { describe, expect, it } from 'vitest';
import { buildAgentSchema } from './agent-schema';
import type { Agent } from './types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'continuum',
    name: 'Continuum',
    slug: 'continuum',
    description: 'A paid commissioning service.',
    providerName: 'Black Label Bots',
    providerUrl: 'https://blacklabelbots.com',
    agentUrl: 'https://continuum.blacklabelbots.com',
    categories: [],
    tags: [],
    skills: [],
    authType: 'none',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    tier: 'premium',
    discoveredBy: 'manual',
    accessMethods: ['mcp'],
    ...overrides,
  };
}

describe('buildAgentSchema', () => {
  it('does not infer platform or a zero-dollar offer for an unauthenticated premium agent', () => {
    const schema = buildAgentSchema(makeAgent());

    expect(schema).not.toHaveProperty('operatingSystem');
    expect(schema).not.toHaveProperty('offers');
  });
});
