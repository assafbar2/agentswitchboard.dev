import { describe, expect, it } from 'vitest';
import { isFeaturedLive, isSponsoredLive, labeledName, promotedFirst, promotion } from './promoted';
import type { Agent } from './types';

const agent = (name: string, placement: Partial<Agent> = {}) =>
  ({ name, slug: name.toLowerCase(), featured: false, ...placement }) as unknown as Agent;

const DAY = '2026-11-14';

describe('isFeaturedLive and isSponsoredLive', () => {
  it('treats featuredUntil and sponsoredUntil as inclusive UTC YYYY-MM-DD bounds', () => {
    expect(isFeaturedLive(agent('A', { featured: true }), DAY)).toBe(true);
    expect(isFeaturedLive(agent('B', { featured: true, featuredUntil: DAY }), DAY)).toBe(true);
    expect(isFeaturedLive(agent('C', { featured: true, featuredUntil: '2026-11-13' }), DAY)).toBe(false);
    expect(isFeaturedLive(agent('D', { featured: false, featuredUntil: '2026-12-31' }), DAY)).toBe(false);

    expect(isSponsoredLive(agent('E', { sponsored: true }), DAY)).toBe(true);
    expect(isSponsoredLive(agent('F', { sponsored: true, sponsoredUntil: DAY }), DAY)).toBe(true);
    expect(isSponsoredLive(agent('G', { sponsored: true, sponsoredUntil: '2026-11-13' }), DAY)).toBe(false);
    expect(isSponsoredLive(agent('H', { sponsored: false, sponsoredUntil: '2026-12-31' }), DAY)).toBe(false);
  });
});

describe('promotion', () => {
  it('labels an active Sponsored slot first, then an active Featured placement through its last day', () => {
    expect(promotion(agent('A', { sponsored: true, featured: true }), DAY)).toBe('Sponsored');
    expect(promotion(agent('A2', { sponsored: true, sponsoredUntil: DAY }), DAY)).toBe('Sponsored');
    expect(promotion(agent('A3', { sponsored: true, sponsoredUntil: '2026-11-13', featured: true }), DAY)).toBe('Featured');
    expect(promotion(agent('A4', { sponsored: true, sponsoredUntil: '2026-11-13' }), DAY)).toBeNull();
    expect(promotion(agent('B', { featured: true }), DAY)).toBe('Featured');
    expect(promotion(agent('C', { featured: true, featuredUntil: DAY }), DAY)).toBe('Featured');
    expect(promotion(agent('D', { featured: true, featuredUntil: '2026-11-13' }), DAY)).toBeNull();
    expect(promotion(agent('E'), DAY)).toBeNull();
  });
});

describe('promotedFirst', () => {
  it('moves promoted listings to the front, each group keeping its order', () => {
    const ranked = [agent('Plain1'), agent('Featured', { featured: true }), agent('Plain2'), agent('Sponsored', { sponsored: true })];
    expect(promotedFirst(ranked, DAY).map((a) => a.name)).toEqual(['Featured', 'Sponsored', 'Plain1', 'Plain2']);
  });

  it('leaves a list with nothing promoted as it is, in a new array', () => {
    const ranked = [agent('B'), agent('A')];
    const out = promotedFirst(ranked, DAY);
    expect(out).toEqual(ranked);
    expect(out).not.toBe(ranked);
  });
});

describe('labeledName', () => {
  it('names a promoted listing with its label', () => {
    expect(labeledName(agent('AgentMail', { sponsored: true }), DAY)).toBe('AgentMail (Sponsored)');
    expect(labeledName(agent('Plain'), DAY)).toBe('Plain');
  });
});
