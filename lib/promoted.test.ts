import { describe, expect, it } from 'vitest';
import { labeledName, promotedFirst, promotion } from './promoted';
import type { Agent } from './types';

const agent = (name: string, placement: Partial<Agent> = {}) =>
  ({ name, slug: name.toLowerCase(), featured: false, ...placement }) as unknown as Agent;

const DAY = '2026-11-14';

describe('promotion', () => {
  it('labels a Sponsored slot first, then a Featured placement through its last day', () => {
    expect(promotion(agent('A', { sponsored: true, featured: true }), DAY)).toBe('Sponsored');
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
