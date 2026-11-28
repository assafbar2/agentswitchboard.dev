import { describe, expect, it } from 'vitest';
import { pickHomepageAgents, sponsoredAgents } from './homepage';
import type { Agent } from './types';

const agent = (slug: string, over: Partial<Agent> = {}): Agent =>
  ({ id: slug, slug, name: slug, featured: false, createdAt: '2026-01-01T00:00:00Z', ...over }) as Agent;

const NOW = '2026-09-25T15:21:00.000Z';

describe('pickHomepageAgents', () => {
  it('uses placements in order, first is the Editor’s Pick, rest filled by newest', () => {
    const agents = [
      agent('a-first', { featured: true }),
      agent('agentmail', { featured: true }),
      agent('here-now', { featured: true }),
      agent('fresh', { createdAt: '2026-09-25T00:00:00Z' }),
    ];
    const out = pickHomepageAgents(agents, ['agentmail', 'here-now', 'missing-slug'], NOW, 3);
    expect(out.map((h) => [h.agent.slug, h.label])).toEqual([
      ['agentmail', 'editors-pick'],
      ['here-now', 'featured'],
      ['fresh', 'new'],
    ]);
  });

  it('without placements, orders featured by newest instead of alphabetically', () => {
    const agents = [
      agent('aaa-old', { featured: true, createdAt: '2026-03-01T00:00:00Z' }),
      agent('zzz-new', { featured: true, createdAt: '2026-09-20T00:00:00Z' }),
    ];
    expect(pickHomepageAgents(agents, undefined, NOW, 2).map((h) => h.agent.slug)).toEqual(['zzz-new', 'aaa-old']);
  });

  it('keeps featured agents live on their final featuredUntil day even when given a full ISO timestamp', () => {
    const agents = [
      agent('last-day', { featured: true, featuredUntil: '2026-09-25' }),
      agent('other', { createdAt: '2026-09-01T00:00:00Z' }),
    ];
    expect(pickHomepageAgents(agents, undefined, NOW, 1)).toEqual([{ agent: agents[0], label: 'editors-pick' }]);
    expect(pickHomepageAgents(agents, undefined, '2026-09-26', 1)).toEqual([{ agent: agents[1], label: 'new' }]);
  });

  it('drops featured agents whose featuredUntil has passed', () => {
    const agents = [
      agent('expired', { featured: true, featuredUntil: '2026-01-01' }),
      agent('other', { createdAt: '2026-09-01T00:00:00Z' }),
    ];
    const out = pickHomepageAgents(agents, undefined, NOW, 1);
    expect(out).toEqual([{ agent: agents[1], label: 'new' }]);
  });

  it('respects sponsoredUntil in sponsoredAgents and homepage picks', () => {
    const agents = [
      agent('live-sponsor', { sponsored: true, sponsoredUntil: '2026-09-25' }),
      agent('expired-sponsor', { sponsored: true, sponsoredUntil: '2026-09-24', featured: true }),
    ];
    expect(sponsoredAgents(agents, '2026-09-25').map((a) => a.slug)).toEqual(['live-sponsor']);
    expect(sponsoredAgents(agents, '2026-09-26').map((a) => a.slug)).toEqual([]);
    expect(pickHomepageAgents(agents, undefined, '2026-09-25', 1).map((h) => h.agent.slug)).toEqual(['expired-sponsor']);
  });
});
