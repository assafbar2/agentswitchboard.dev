import { describe, it, expect } from 'vitest';
import { slugify, truncate, pluralize, authTypeLabel } from './utils';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('strips special characters and trims hyphens', () => {
    expect(slugify('  A2A: Agent!! ')).toBe('a2a-agent');
  });
});

describe('truncate', () => {
  it('returns text unchanged when under limit', () => {
    expect(truncate('short', 10)).toBe('short');
  });
  it('adds ellipsis when over limit', () => {
    const out = truncate('a'.repeat(20), 10);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('pluralize', () => {
  it('singular for 1', () => expect(pluralize(1, 'agent')).toBe('agent'));
  it('plural for many', () => expect(pluralize(2, 'agent')).toBe('agents'));
  it('custom plural', () => expect(pluralize(2, 'entry', 'entries')).toBe('entries'));
});

describe('authTypeLabel', () => {
  it('maps known types', () => {
    expect(authTypeLabel('apiKey')).toBe('API Key');
    expect(authTypeLabel('oauth2')).toBe('OAuth 2.0');
    expect(authTypeLabel('none')).toBe('None');
  });
  it('passes through unknown types', () => {
    expect(authTypeLabel('magic')).toBe('magic');
  });
});
