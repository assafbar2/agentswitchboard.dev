import { describe, it, expect } from 'vitest';
import { absoluteIconUrl, iconPath, iconVersion, smallIconPath } from './icons';

describe('icon paths', () => {
  const record = { v: 'aca5768d', source: 'https://www.agentmail.to/favicon.ico' };

  it('serves the local copy, versioned by its hash, never the source', () => {
    expect(iconPath('agentmail', record)).toBe('/icons/agentmail.png?v=aca5768d');
  });

  it('reads the version back from the path', () => {
    expect(iconVersion(iconPath('agentmail', record))).toBe('aca5768d');
  });

  it('maps to the 48px copy with the same version', () => {
    expect(smallIconPath(iconPath('agentmail', record))).toBe('/icons/sm/agentmail.png?v=aca5768d');
  });

  it('makes the path absolute for the APIs, or null without an icon', () => {
    expect(absoluteIconUrl('/icons/agentmail.png?v=aca5768d', 'https://agentswitchboard.dev')).toBe(
      'https://agentswitchboard.dev/icons/agentmail.png?v=aca5768d'
    );
    expect(absoluteIconUrl(undefined)).toBeNull();
  });
});
