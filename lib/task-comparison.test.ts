import { describe, expect, it } from 'vitest';
import { bestFor, comparedAsOf, pickIf } from './task-comparison';
import type { Agent } from './types';

function agent(over: Partial<Agent> = {}): Agent {
  return {
    id: 'a',
    slug: 'a',
    name: 'A',
    official: false,
    authType: 'apiKey',
    accessMethods: ['api'],
    tags: ['sql'],
    categories: [{ id: 'c', name: 'Data', slug: 'data', sortOrder: 0 }],
    ...over,
  } as Agent;
}

describe('bestFor', () => {
  it('takes the skill from the why line', () => {
    expect(bestFor('Run queries: runs SQL against Postgres', agent())).toBe('Run queries');
  });

  it('falls back to the first tag, then the first category, when there is no short skill', () => {
    expect(bestFor(null, agent())).toBe('sql');
    expect(bestFor(`${'x'.repeat(49)}: too long`, agent())).toBe('sql');
    expect(bestFor(null, agent({ tags: [] }))).toBe('Data');
  });
});

describe('pickIf', () => {
  it('reads only the listing’s own access facts, in order', () => {
    expect(pickIf(agent({ official: true, mcpEndpoint: 'https://x/mcp' }))).toBe("you want the vendor's own hosted server");
    expect(pickIf(agent({ official: true }))).toBe("you want the vendor's own tool");
    expect(pickIf(agent({ authType: 'none', mcpEndpoint: 'https://x/mcp' }))).toBe('you want to try it with no sign-up');
    expect(pickIf(agent({ mcpEndpoint: 'https://x/mcp' }))).toBe('you want a hosted MCP, nothing to install');
    expect(pickIf(agent({ accessMethods: ['api', 'cli'] }))).toBe('you work from a terminal');
    expect(pickIf(agent())).toBe('you are building on its API');
  });

  it('ignores featured and sponsored', () => {
    expect(pickIf(agent({ featured: true, sponsored: true }))).toBe(pickIf(agent()));
  });
});

describe('comparedAsOf', () => {
  it('is the newest change among the listings, not the build day', () => {
    expect(
      comparedAsOf([
        agent({ updatedAt: '2026-10-02T10:00:00Z' }),
        agent({ updatedAt: '2026-11-05T08:00:00Z' }),
        agent({ updatedAt: undefined, createdAt: '2026-09-01T00:00:00Z' }),
      ])
    ).toBe('2026-11-05');
  });

  it('is null when no listing has a date', () => {
    expect(comparedAsOf([agent()])).toBeNull();
    expect(comparedAsOf([])).toBeNull();
  });
});
