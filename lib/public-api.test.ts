import { describe, it, expect } from 'vitest';
import {
  clampInt,
  summarizeAgent,
  detailAgent,
  summarizeCategory,
} from './public-api';
import type { Agent, Category } from './types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'id-1',
    name: 'AgentMail',
    slug: 'agentmail',
    description: 'Email inbox API built for AI agents.',
    providerName: 'AgentMail',
    providerUrl: 'https://agentmail.to',
    agentUrl: 'https://agentmail.to',
    categories: [
      {
        id: 'c1',
        name: 'Infrastructure',
        slug: 'infrastructure',
        sortOrder: 1,
      },
    ],
    tags: ['email', 'api'],
    skills: [
      {
        id: 'inbox-management',
        name: 'Inbox Management',
        description: 'Create and list inboxes.',
      },
    ],
    authType: 'apiKey',
    supportsStreaming: true,
    supportsPushNotifications: true,
    status: 'published',
    featured: true,
    verified: true,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['api', 'mcp', 'cli'],
    createdAt: '2026-03-21T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('clampInt', () => {
  it('returns fallback for null or NaN', () => {
    expect(clampInt(null, 10, 1, 50)).toBe(10);
    expect(clampInt('nope', 10, 1, 50)).toBe(10);
  });

  it('clamps to min and max', () => {
    expect(clampInt('0', 10, 1, 50)).toBe(1);
    expect(clampInt('999', 10, 1, 50)).toBe(50);
    expect(clampInt('7', 10, 1, 50)).toBe(7);
  });
});

describe('summarizeAgent', () => {
  it('exposes directory URL and category slugs, not CMS ids', () => {
    const card = summarizeAgent(makeAgent());
    expect(card.slug).toBe('agentmail');
    expect(card.url).toBe('https://agentswitchboard.dev/agents/agentmail');
    expect(card.categories).toEqual(['infrastructure']);
    expect(card).not.toHaveProperty('skills');
    expect(card).not.toHaveProperty('id');
  });
});

describe('detailAgent', () => {
  it('includes skills, auth, and provider homepage', () => {
    const detail = detailAgent(makeAgent());
    expect(detail.homepage).toBe('https://agentmail.to');
    expect(detail.authType).toBe('apiKey');
    expect(detail.skills).toEqual([
      {
        id: 'inbox-management',
        name: 'Inbox Management',
        description: 'Create and list inboxes.',
      },
    ]);
    expect(detail.tags).toEqual(['email', 'api']);
  });
});

describe('summarizeCategory', () => {
  it('defaults missing description and count', () => {
    const cat: Category = {
      id: 'c1',
      name: 'Code & DevTools',
      slug: 'code-devtools',
      sortOrder: 4,
    };
    expect(summarizeCategory(cat)).toEqual({
      slug: 'code-devtools',
      name: 'Code & DevTools',
      description: null,
      agentCount: 0,
    });
  });
});
