import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_BADGE_TIERS, badgeMeta, badgeSnippets, badgeTier } from '@/lib/badges';

const ROOT = path.resolve(__dirname, '..');

describe('static SVG badges', () => {
  it('ships crisp static SVG files for every badge tier under public/badges/', () => {
    for (const tier of ALL_BADGE_TIERS) {
      const meta = badgeMeta(tier);
      const file = path.join(ROOT, 'public', meta.path.replace(/^\/+/, ''));
      expect(fs.existsSync(file), meta.path).toBe(true);

      const svg = fs.readFileSync(file, 'utf8');
      expect(svg.length, meta.path).toBeGreaterThan(200);
      expect(svg.length, meta.path).toBeLessThan(4096);
      expect(svg).toMatch(/^<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      expect(svg.trim()).toMatch(/<\/svg>$/);
      expect(svg).toContain(`<title>${meta.alt}</title>`);
      expect(svg).toContain(`width="${meta.width}"`);
      expect(svg).toContain(`height="${meta.height}"`);
      // Static badges must never execute scripts or reference external assets.
      expect(svg).not.toMatch(/<script/i);
      expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)/i);
    }
  });
});

describe('badgeTier and badgeSnippets', () => {
  it('picks official over verified over listed', () => {
    expect(badgeTier({ official: true, verified: true })).toBe('official');
    expect(badgeTier({ official: true, verified: false })).toBe('official');
    expect(badgeTier({ official: false, verified: true })).toBe('verified');
    expect(badgeTier({ official: false, verified: false })).toBe('listed');
  });

  it('builds Markdown and HTML embed snippets linking back to the listing page', () => {
    const official = badgeSnippets({ slug: 'firecrawl', official: true, verified: true });
    expect(official.tier).toBe('official');
    expect(official.imageUrl).toBe('https://agentswitchboard.dev/badges/official.svg');
    expect(official.listingUrl).toBe('https://agentswitchboard.dev/agents/firecrawl');
    expect(official.markdown).toBe(
      '[![Official on Agent Switchboard](https://agentswitchboard.dev/badges/official.svg)](https://agentswitchboard.dev/agents/firecrawl)'
    );
    expect(official.html).toContain('href="https://agentswitchboard.dev/agents/firecrawl"');
    expect(official.html).toContain('src="https://agentswitchboard.dev/badges/official.svg"');
    expect(official.html).toContain('alt="Official on Agent Switchboard"');

    const verified = badgeSnippets({ slug: 'agentmail', official: false, verified: true });
    expect(verified.tier).toBe('verified');
    expect(verified.markdown).toBe(
      '[![Verified on Agent Switchboard](https://agentswitchboard.dev/badges/verified.svg)](https://agentswitchboard.dev/agents/agentmail)'
    );

    const listed = badgeSnippets({ slug: 'demo-tool', official: false, verified: false });
    expect(listed.tier).toBe('listed');
    expect(listed.markdown).toBe(
      '[![Listed on Agent Switchboard](https://agentswitchboard.dev/badges/listed.svg)](https://agentswitchboard.dev/agents/demo-tool)'
    );
  });
});
