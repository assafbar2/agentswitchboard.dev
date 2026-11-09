import { describe, it, expect } from 'vitest';
import { groupOfficialAgents, registryProblems, sourceMatches, vendorForUrl, type OfficialVendor } from './official';
import type { Agent } from './types';

const vendor = (slug: string, sources: string[], extra: Partial<OfficialVendor> = {}): OfficialVendor => ({
  slug,
  name: slug,
  basis: 'public',
  evidence: 'NASDAQ: TEST',
  sources,
  ...extra,
});

describe('sourceMatches', () => {
  it('matches a host and its subdomains', () => {
    expect(sourceMatches('notion.com', 'https://developers.notion.com/docs/mcp')).toBe(true);
    expect(sourceMatches('notion.com', 'https://www.notion.com/')).toBe(true);
    expect(sourceMatches('notion.com', 'https://notion.com.evil.io/')).toBe(false);
    expect(sourceMatches('notion.com', 'https://fakenotion.com/')).toBe(false);
  });

  it('matches a GitHub org by first path segment only', () => {
    expect(sourceMatches('github.com/makenotion', 'https://github.com/makenotion/notion-mcp-server')).toBe(true);
    expect(sourceMatches('github.com/makenotion', 'https://github.com/MakeNotion/x')).toBe(true);
    expect(sourceMatches('github.com/makenotion', 'https://github.com/someone/makenotion')).toBe(false);
    expect(sourceMatches('github.com/makenotion', 'https://gist.github.com/makenotion')).toBe(false);
  });

  it('rejects unparseable URLs', () => {
    expect(sourceMatches('notion.com', 'not a url')).toBe(false);
  });
});

describe('vendorForUrl', () => {
  const vendors = [vendor('notion', ['notion.com', 'github.com/makenotion']), vendor('google', ['google.com'])];

  it('resolves first-party URLs to their vendor', () => {
    expect(vendorForUrl('https://developers.notion.com/docs/mcp', vendors)?.slug).toBe('notion');
  });

  it('does not credit community builds of a brand', () => {
    expect(vendorForUrl('https://github.com/community-dev/notion-mcp', vendors)).toBeNull();
    expect(vendorForUrl('https://smithery.ai/server/notion', vendors)).toBeNull();
  });
});

describe('registryProblems', () => {
  it('accepts a clean registry', () => {
    expect(registryProblems([vendor('a', ['a.com', 'github.com/a']), vendor('b', ['b.com'])])).toEqual([]);
  });

  it('rejects bare shared hosts', () => {
    expect(registryProblems([vendor('a', ['github.com'])])[0]).toMatch(/shared host/);
    expect(registryProblems([vendor('a', ['smithery.ai'])])[0]).toMatch(/shared host/);
  });

  it('rejects sources that overlap across vendors', () => {
    const problems = registryProblems([vendor('ms', ['microsoft.com']), vendor('azure', ['azure.microsoft.com'])]);
    expect(problems[0]).toMatch(/overlap/);
  });

  it('requires a parent for subsidiaries', () => {
    expect(registryProblems([vendor('gh', ['docs.github.com'], { basis: 'subsidiary' })])[0]).toMatch(/parent/);
  });

  it('rejects duplicate slugs', () => {
    expect(registryProblems([vendor('a', ['a.com']), vendor('a', ['b.com'])])[0]).toMatch(/duplicate/);
  });
});

describe('groupOfficialAgents', () => {
  const make = (slug: string, name: string, v?: { slug: string; name: string }) =>
    ({ slug, name, official: !!v, officialVendor: v }) as Agent;
  const google = { slug: 'google', name: 'Google' };
  const notion = { slug: 'notion', name: 'Notion' };

  it('groups by vendor, largest first, agents A→Z, skipping unofficial', () => {
    const groups = groupOfficialAgents([
      make('notion-mcp', 'Notion MCP', notion),
      make('jules', 'Jules', google),
      make('gemini-cli', 'Gemini CLI', google),
      make('community', 'Community MCP'),
    ]);
    expect(groups.map((g) => g.vendor.slug)).toEqual(['google', 'notion']);
    expect(groups[0].agents.map((a) => a.slug)).toEqual(['gemini-cli', 'jules']);
  });
});
