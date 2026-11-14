import { describe, expect, it } from 'vitest';
import { checkedMonth, lastChecked, verifiedNote } from './verified';

describe('verified date', () => {
  it('is the last update of a Verified listing, and null for one that is not', () => {
    expect(lastChecked({ verified: true, updatedAt: '2026-11-13T09:00:00Z', createdAt: '2026-03-01T00:00:00Z' })).toBe('2026-11-13');
    expect(lastChecked({ verified: true, createdAt: '2026-03-01T00:00:00Z' })).toBe('2026-03-01');
    expect(lastChecked({ verified: false, updatedAt: '2026-11-13T09:00:00Z' })).toBeNull();
    expect(lastChecked({ verified: true })).toBeNull();
  });

  it('says what was checked and the month, as written', () => {
    expect(checkedMonth('2026-11-30T23:59:59Z')).toBe('Nov 2026');
    expect(verifiedNote('2026-11-13')).toBe('Verified: link and access path checked, Nov 2026');
    expect(verifiedNote(null)).toBe('Verified: link and access path checked');
  });
});
