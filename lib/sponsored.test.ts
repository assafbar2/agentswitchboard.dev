import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import { pickHomepageAgents, sponsoredAgents } from './homepage';
import { putThrough } from './operator';
import { OPERATOR_EXAMPLES } from './request-parts';
import { getAlternatives } from './related';
import { searchAgents, sortAgents, SORT_ORDERS, taskMatches } from './search';
import { getTasks } from './tasks';
import type { Agent } from './types';

// Paying changes the label and the Sponsored slot, nothing that ranks or picks:
// flipping every listing's flag must leave every answer as it was.
const slugs = (agents: readonly (Agent | null)[]) => agents.map((a) => a?.slug ?? null);
const flipped = (catalog: Agent[]) => catalog.map((a) => ({ ...a, sponsored: !a.sponsored }));

describe('sponsored never changes what ranks or picks listings', () => {
  it('starts with the three approved listings', async () => {
    expect(slugs(sponsoredAgents(await getEveryAgent()))).toEqual(['agentswitchboard', 'agentmail', 'barnir-hired']);
  });

  it('search results and their order, for every sort', async () => {
    const catalog = await getEveryAgent();
    const other = flipped(catalog);
    for (const query of ['', 'email', 'agent directory', 'job fit career', 'mcp postgres', 'inbox api']) {
      for (const sort of SORT_ORDERS) {
        expect(slugs(sortAgents(searchAgents(other, query), sort)), `${query} ${sort}`).toEqual(
          slugs(sortAgents(searchAgents(catalog, query), sort))
        );
      }
    }
  });

  it('every task, the alternatives to each sponsored listing, and the Operator', async () => {
    const catalog = await getEveryAgent();
    const other = flipped(catalog);
    for (const task of getTasks()) {
      expect(slugs(taskMatches(other, task)), task.slug).toEqual(slugs(taskMatches(catalog, task)));
    }
    for (const agent of sponsoredAgents(catalog)) {
      const twin = other.find((a) => a.slug === agent.slug)!;
      expect(getAlternatives(twin, other).map((a) => a.agent.slug)).toEqual(
        getAlternatives(agent, catalog).map((a) => a.agent.slug)
      );
    }
    for (const request of OPERATOR_EXAMPLES) {
      const picks = (c: Agent[]) => putThrough(request, getTasks(), c).parts.map((p) => p.pick?.slug ?? null);
      expect(picks(other), request).toEqual(picks(catalog));
    }
  });
});

describe('the homepage keeps paid placements out of the editor’s picks', () => {
  const agent = (slug: string, over: Partial<Agent> = {}): Agent =>
    ({ id: slug, slug, name: slug, featured: false, createdAt: '2026-01-01T00:00:00Z', ...over }) as Agent;

  it('skips a sponsored listing in placements, in featured and in the newest fill', () => {
    const agents = [
      agent('paid', { sponsored: true, featured: true, createdAt: '2026-09-30T00:00:00Z' }),
      agent('pick'),
      agent('fresh', { createdAt: '2026-09-20T00:00:00Z' }),
    ];
    const now = '2026-10-01T00:00:00Z';
    expect(pickHomepageAgents(agents, ['paid', 'pick'], now, 2).map((h) => [h.agent.slug, h.label])).toEqual([
      ['pick', 'editors-pick'],
      ['fresh', 'new'],
    ]);
    expect(pickHomepageAgents(agents, undefined, now, 1).map((h) => h.agent.slug)).toEqual(['fresh']);
  });

  it('lists the Sponsored slot A→Z', () => {
    expect(slugs(sponsoredAgents([agent('zed', { sponsored: true }), agent('free'), agent('ace', { sponsored: true })]))).toEqual([
      'ace',
      'zed',
    ]);
  });
});
