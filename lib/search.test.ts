import { describe, it, expect } from 'vitest';
import { scoreAgent, searchAgents } from './search';
import type { Agent } from './types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'A test agent for unit tests.',
    providerName: 'TestCo',
    providerUrl: 'https://test.co',
    agentUrl: 'https://test.co/agent',
    categories: [],
    tags: [],
    skills: [],
    authType: 'none',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: [],
    ...overrides,
  };
}

describe('scoreAgent', () => {
  it('returns 1 for empty query (neutral match)', () => {
    expect(scoreAgent(makeAgent(), '')).toBe(1);
  });

  it('ranks exact name match above partial name match', () => {
    const exact = scoreAgent(makeAgent({ name: 'Cursor' }), 'cursor');
    const partial = scoreAgent(makeAgent({ name: 'Cursor Tools' }), 'cursor');
    expect(exact).toBeGreaterThan(partial);
  });

  it('ranks name match above description match', () => {
    const byName = scoreAgent(makeAgent({ name: 'Playwright' }), 'playwright');
    const byDesc = scoreAgent(
      makeAgent({ name: 'Other', description: 'Uses playwright under the hood' }),
      'playwright'
    );
    expect(byName).toBeGreaterThan(byDesc);
  });

  it('matches access methods (searching "mcp" finds MCP agents)', () => {
    const agent = makeAgent({ accessMethods: ['mcp'] });
    expect(scoreAgent(agent, 'mcp')).toBeGreaterThan(0);
  });

  it('matches tags and skills', () => {
    const agent = makeAgent({
      tags: ['browser-automation'],
      skills: [{ id: 's1', name: 'Web Scraping', description: 'Scrapes pages' }],
    });
    expect(scoreAgent(agent, 'browser-automation')).toBeGreaterThan(0);
    expect(scoreAgent(agent, 'scraping')).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    const agent = makeAgent({ name: 'FireCrawl' });
    expect(scoreAgent(agent, 'FIRECRAWL')).toBe(scoreAgent(agent, 'firecrawl'));
  });

  it('handles skills missing name/description without throwing', () => {
    const agent = makeAgent({
      // Simulates legacy string-form skills mapped defensively
      skills: [{ id: 'x', name: undefined as unknown as string, description: undefined as unknown as string }],
    });
    expect(() => scoreAgent(agent, 'anything')).not.toThrow();
  });
});

describe('searchAgents', () => {
  const agents = [
    makeAgent({ name: 'Alpha', slug: 'alpha', accessMethods: ['api'] }),
    makeAgent({ name: 'Beta', slug: 'beta', accessMethods: ['mcp', 'cli'] }),
    makeAgent({ name: 'Gamma Alpha', slug: 'gamma', accessMethods: ['mcp'] }),
  ];

  it('returns all agents for empty query and no filters', () => {
    expect(searchAgents(agents, '')).toHaveLength(3);
  });

  it('filters by access method (AND semantics)', () => {
    expect(searchAgents(agents, '', ['mcp'])).toHaveLength(2);
    expect(searchAgents(agents, '', ['mcp', 'cli'])).toHaveLength(1);
  });

  it('sorts by relevance: exact name first', () => {
    const results = searchAgents(agents, 'alpha');
    expect(results[0].slug).toBe('alpha');
    expect(results).toHaveLength(2);
  });

  it('excludes zero-score agents', () => {
    const results = searchAgents(agents, 'nonexistent-term-xyz');
    expect(results).toHaveLength(0);
  });

  it('combines access filter with text query', () => {
    const results = searchAgents(agents, 'alpha', ['mcp']);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe('gamma');
  });
});
