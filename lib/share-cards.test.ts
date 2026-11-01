import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import {
  CARD_DESIGN,
  categoryCard,
  categoryCardImage,
  listingCard,
  listingCardImage,
  sampleIcons,
  siteCard,
  siteCardImage,
} from './share-cards';
import type { Agent, Category } from './types';

const category: Category = {
  id: 'c1',
  name: 'Infrastructure & Ops',
  slug: 'infrastructure',
  description: 'Deploy and run things.',
  sortOrder: 1,
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'id-1',
    name: 'AgentMail',
    slug: 'agentmail',
    description: 'Email inbox API built for AI agents.',
    providerName: 'AgentMail',
    providerUrl: 'https://agentmail.to',
    agentUrl: 'https://agentmail.to',
    categories: [category],
    tags: [],
    skills: [],
    authType: 'apiKey',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: true,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['api', 'mcp', 'browser-extension'],
    iconUrl: '/icons/agentmail.png?v=aca5768d',
    ...overrides,
  };
}

/** An official listing of `vendor` whose icon has content hash `v`. */
function official(slug: string, vendor: string, v: string): Agent {
  return makeAgent({
    slug,
    name: slug,
    providerName: vendor,
    official: true,
    officialVendor: { slug: vendor.toLowerCase(), name: vendor },
    iconUrl: `/icons/${slug}.png?v=${v}`,
  });
}

describe('CARD_DESIGN', () => {
  it('is the hash of lib/og.tsx and assets/fonts, so a new look gets new card URLs', () => {
    const hash = createHash('sha1');
    hash.update(fs.readFileSync(path.join('lib', 'og.tsx'), 'utf8').replace(/\r\n/g, '\n'));
    for (const file of fs.readdirSync(path.join('assets', 'fonts')).sort()) {
      hash.update(fs.readFileSync(path.join('assets', 'fonts', file)));
    }
    expect(
      CARD_DESIGN,
      'The card renderer or its fonts changed: set CARD_DESIGN in lib/share-cards.ts to the expected value'
    ).toBe(hash.digest('hex').slice(0, 8));
  });
});

describe('listingCard', () => {
  it('carries display labels, the primary category and the icon path', () => {
    expect(listingCard(makeAgent())).toEqual({
      name: 'AgentMail',
      provider: 'AgentMail',
      official: false,
      verified: true,
      access: ['API', 'MCP', 'Extension'],
      category: 'Infrastructure & Ops',
      description: 'Email inbox API built for AI agents.',
      icon: '/icons/agentmail.png?v=aca5768d',
    });
  });

  it('has no category or icon when the listing has none', () => {
    const card = listingCard(makeAgent({ categories: [], iconUrl: undefined }));
    expect(card.category).toBeNull();
    expect(card.icon).toBeNull();
  });
});

describe('card images', () => {
  it('serve each page its own versioned 1200x630 PNG', () => {
    const image = listingCardImage('agentmail', listingCard(makeAgent()));
    expect(image.url).toMatch(/^\/agents\/agentmail\/card\.png\?v=[0-9a-f]{8}$/);
    expect(image).toMatchObject({ width: 1200, height: 630, type: 'image/png' });
    expect(image.alt).toBe('AgentMail by AgentMail, on Agent Switchboard');

    const cat = categoryCardImage('infrastructure', categoryCard(category, [makeAgent()], [makeAgent()]));
    expect(cat.url).toMatch(/^\/categories\/infrastructure\/card\.png\?v=[0-9a-f]{8}$/);
    expect(siteCardImage(siteCard([makeAgent()], [category])).url).toMatch(/^\/card\.png\?v=[0-9a-f]{8}$/);
  });

  it('change URL when what the card shows changes, and only then', () => {
    const url = (a: Agent) => listingCardImage(a.slug, listingCard(a)).url;
    expect(url(makeAgent())).toBe(url(makeAgent({ tags: ['email'], updatedAt: '2026-11-01' })));
    expect(url(makeAgent())).not.toBe(url(makeAgent({ description: 'Inboxes for agents.' })));
    expect(url(makeAgent())).not.toBe(url(makeAgent({ iconUrl: '/icons/agentmail.png?v=0123abcd' })));
  });
});

describe('sampleIcons', () => {
  const catalog = [
    official('small-1', 'Small', 'aaaa0001'),
    official('big-product', 'Big', 'bbbb0001'),
    official('big-logo-1', 'Big', 'bbbb0002'),
    official('big-logo-2', 'Big', 'bbbb0002'),
    makeAgent({ slug: 'indie', providerName: 'Indie', iconUrl: '/icons/indie.png?v=cccc0001' }),
    makeAgent({ slug: 'no-icon', providerName: 'Plain', iconUrl: undefined }),
  ];

  it('shows the biggest vendors first, then the rest in catalog order, one icon each', () => {
    expect(sampleIcons(catalog, catalog, 10)).toEqual([
      '/icons/big-logo-1.png?v=bbbb0002',
      '/icons/small-1.png?v=aaaa0001',
      '/icons/indie.png?v=cccc0001',
    ]);
  });

  it("uses the image most of a provider's listings share", () => {
    const [big] = sampleIcons(catalog, catalog, 1);
    expect(big).toBe('/icons/big-logo-1.png?v=bbbb0002');
  });

  it('ranks vendors by their size in the whole catalog, not just in the sample', () => {
    const sample = [catalog[0], catalog[1]];
    expect(sampleIcons(sample, catalog, 10)).toEqual(['/icons/big-product.png?v=bbbb0001', '/icons/small-1.png?v=aaaa0001']);
  });

  it('never repeats an image, and stops at n', () => {
    const twins = [official('one', 'One', 'dddd0001'), official('two', 'Two', 'dddd0001')];
    expect(sampleIcons(twins, twins, 10)).toEqual(['/icons/one.png?v=dddd0001']);
    expect(sampleIcons(catalog, catalog, 2)).toHaveLength(2);
  });
});
