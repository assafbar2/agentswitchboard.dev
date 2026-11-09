import { describe, expect, it } from 'vitest';
import { organicOrder, wantsOrganic, withoutPlacement } from './organic';
import type { Agent } from './types';

const agent = (name: string, featured: boolean) => ({ name, slug: name.toLowerCase(), featured }) as unknown as Agent;

describe('organicOrder', () => {
  it('lists A→Z whatever is featured', () => {
    const catalog = [agent('Zed', true), agent('Beta', true), agent('Alpha', false)];
    expect(organicOrder(catalog).map((a) => a.name)).toEqual(['Alpha', 'Beta', 'Zed']);
    expect(catalog.map((a) => a.name)).toEqual(['Zed', 'Beta', 'Alpha']);
  });

  it('returns the same array for the same catalog, so identity-keyed indexes are reused', () => {
    const catalog = [agent('B', true), agent('A', false)];
    expect(organicOrder(catalog)).toBe(organicOrder(catalog));
  });
});

describe('withoutPlacement', () => {
  it('drops placement fields at any depth and keeps the rest', () => {
    const body = {
      total: 1,
      agents: [{ slug: 'a', featured: true, sponsored: true, sponsorLabel: 'Sponsored', tier: 'premium', official: false }],
      agent: { slug: 'b', featured: false, featuredUntil: '2026-12-31' },
    };
    expect(withoutPlacement(body)).toEqual({ total: 1, agents: [{ slug: 'a', official: false }], agent: { slug: 'b' } });
    expect(body.agents[0].featured).toBe(true);
  });
});

describe('wantsOrganic', () => {
  it('is on for order=organic in any case, and off otherwise', () => {
    expect(wantsOrganic(new URLSearchParams('order=Organic'))).toBe(true);
    expect(wantsOrganic(new URLSearchParams('order=featured'))).toBe(false);
    expect(wantsOrganic(new URLSearchParams(''))).toBe(false);
  });
});
