import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as fs from 'fs';
import * as path from 'path';
import AgentPage, { generateMetadata as agentMetadata, generateStaticParams as agentParams } from '@/app/agents/[slug]/page';
import sitemap from '@/app/sitemap';
import * as agentApiRoute from '@/app/api/agents/[slug]/route';
import * as mcpRoute from '@/app/api/[transport]/route';
import * as missingToolRoute from '@/app/api/missing-tool/route';
import * as agentMdRoute from '@/app/agents/[slug]/md/route';
import * as llmsFullRoute from '@/app/llms-full.txt/route';
import { getAllRetiredListings, getEveryAgent, getOrganicAgents, getRetiredListingBySlug } from '@/lib/catalog';
import { limitations, recommendDecision } from '@/lib/decide';
import { listingFeedbackUrl, missingToolHref, REPO_ISSUES_NEW_URL } from '@/lib/feedback';
import { searchAgents } from '@/lib/search';
import { getTasks } from '@/lib/tasks';
import { formatArchiveDate, tombstoneAlternatives } from '@/lib/tombstones';
import {
  LICENSE_MAX_LENGTH,
  LIFECYCLE_NOTE_MAX_LENGTH,
  LIMITATION_MAX_ITEMS,
  LIMITATION_MAX_LENGTH,
  MAX_MERGED_LIMITATIONS,
  TruthFieldsSchema,
} from '@/lib/truth-fields';
import type { Agent } from '@/lib/types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'A test listing used to exercise truth fields and limitations merging.',
    providerName: 'Example Corp',
    providerUrl: 'https://example.com',
    agentUrl: 'https://example.com/docs',
    categories: [{ id: 'code-devtools', name: 'Code & DevTools', slug: 'code-devtools', sortOrder: 1 }],
    tags: ['testing'],
    skills: [],
    authType: 'apiKey',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['api'],
    ...overrides,
  };
}

describe('TruthFieldsSchema validation', () => {
  it('accepts empty objects and valid combinations of all optional structured fields', () => {
    expect(TruthFieldsSchema.safeParse({}).success).toBe(true);
    expect(
      TruthFieldsSchema.safeParse({
        pricing: 'usage-based',
        pricingUrl: 'https://example.com/pricing',
        openSource: true,
        license: 'Apache-2.0',
        deployment: ['hosted', 'self-hosted', 'local'],
        lifecycle: 'acquired',
        lifecycleNote: 'Acquired in 2026; API continues at the new domain.',
        limitations: ['US only', 'Max 50 requests/day'],
      }).success
    ).toBe(true);
  });

  it('rejects invalid enums, bad URLs, oversized strings, duplicates, and >4 limitations', () => {
    expect(TruthFieldsSchema.safeParse({ pricing: 'cheap' }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ pricingUrl: 'ftp://example.com/pricing' }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ pricingUrl: 'not-a-url' }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ openSource: 'yes' }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ license: '' }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ license: 'x'.repeat(LICENSE_MAX_LENGTH + 1) }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ deployment: [] }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ deployment: ['hosted', 'hosted'] }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ deployment: ['cloud'] }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ lifecycle: 'retired' }).success).toBe(false);
    expect(TruthFieldsSchema.safeParse({ lifecycleNote: 'x'.repeat(LIFECYCLE_NOTE_MAX_LENGTH + 1) }).success).toBe(false);
    expect(
      TruthFieldsSchema.safeParse({
        limitations: Array.from({ length: LIMITATION_MAX_ITEMS + 1 }, (_, i) => `Caveat ${i + 1}`),
      }).success
    ).toBe(false);
    expect(
      TruthFieldsSchema.safeParse({
        limitations: ['x'.repeat(LIMITATION_MAX_LENGTH + 1)],
      }).success
    ).toBe(false);
    expect(TruthFieldsSchema.safeParse({ unknownField: true }).success).toBe(false);
  });
});

describe('limitations merge in lib/decide.ts', () => {
  it('places authored limitations first, deduplicates against mechanical ones, and bounds total count', () => {
    const agent = makeAgent({
      authType: 'apiKey',
      verified: false,
      accessMethods: ['api'],
      limitations: [
        'US shipping addresses only',
        'No MCP server.',
        'not verified yet',
        'US shipping addresses only!',
      ],
    });
    const merged = limitations(agent);
    expect(merged).toEqual([
      'US shipping addresses only',
      'No MCP server.',
      'not verified yet',
      'needs an API key from Example Corp',
    ]);
  });

  it(`caps merged authored + mechanical limitations at ${MAX_MERGED_LIMITATIONS}`, () => {
    const agent = makeAgent({
      authType: 'oauth2',
      verified: false,
      accessMethods: ['mcp'],
      mcpCommand: 'npx -y @example/mcp',
      limitations: ['Caveat one', 'Caveat two', 'Caveat three', 'Caveat four'],
    });
    const merged = limitations(agent);
    expect(merged).toHaveLength(MAX_MERGED_LIMITATIONS);
    expect(merged.slice(0, 4)).toEqual(['Caveat one', 'Caveat two', 'Caveat three', 'Caveat four']);
    expect(merged.slice(4)).toEqual([
      'needs a Example Corp sign-in',
      'runs only on your own computer, with no hosted server',
    ]);
  });
});

describe('Rye worked example across content, REST, MCP, Markdown, and listing page', () => {
  it('stores verified Jolly Labs / Rye V2 structured fields without touching featured/sponsored/verified', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/agents/rye.json'), 'utf8'));
    expect(raw.lifecycle).toBe('acquired');
    expect(raw.lifecycleNote).toMatch(/Jolly Labs/i);
    expect(raw.agentUrl).toMatch(/^https:\/\/docs\.commerce\.jolly\.dev\//);
    expect(raw.apiBaseUrl).toBe('https://api.commerce.jolly.dev/api/v1/');
    expect(raw.pricing).toBe('usage-based');
    expect(raw.pricingUrl).toBe('https://rye.com/pricing');
    expect(raw.deployment).toEqual(['hosted']);
    expect(raw.limitations.length).toBeGreaterThanOrEqual(3);
    expect(raw.limitations.length).toBeLessThanOrEqual(LIMITATION_MAX_ITEMS);
    expect(raw.verified).toBe(false);
    expect(raw.featured).toBe(false);
    expect(raw.sponsored).toBeUndefined();
  });

  it('exposes structured truth fields and merged limitations on GET /api/agents/rye', async () => {
    const res = await agentApiRoute.GET(new Request('http://localhost/api/agents/rye', { headers: { 'x-forwarded-for': '203.0.113.10' } }), {
      params: Promise.resolve({ slug: 'rye' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      slug: 'rye',
      pricing: 'usage-based',
      pricingUrl: 'https://rye.com/pricing',
      openSource: false,
      license: null,
      deployment: ['hosted'],
      lifecycle: 'acquired',
      apiBaseUrl: 'https://api.commerce.jolly.dev/api/v1/',
    });
    expect(body.lifecycleNote).toMatch(/Jolly Labs/i);
    expect(body.limitations).toContain('US shipping addresses and physical products only');
    expect(body.limitations).toContain('needs an API key from Rye');
  });

  it('exposes structured truth fields and limitations on MCP get_agent organically', async () => {
    const res = await mcpRoute.POST(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          'x-forwarded-for': '203.0.113.11',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'get_agent', arguments: { slug: 'rye' } },
        }),
      })
    );
    const text = await res.text();
    const dataLine = text
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .pop();
    const parsed = JSON.parse(dataLine ? dataLine.slice(5) : text);
    const structured = parsed.result.structuredContent;
    expect(structured).toMatchObject({
      slug: 'rye',
      pricing: 'usage-based',
      pricingUrl: 'https://rye.com/pricing',
      openSource: false,
      deployment: ['hosted'],
      lifecycle: 'acquired',
    });
    expect(structured.limitations).toContain('US shipping addresses and physical products only');
    expect(structured).not.toHaveProperty('featured');
    expect(structured).not.toHaveProperty('sponsored');
  });

  it('includes structured truth fields and limitations in /agents/rye.md', async () => {
    const res = await agentMdRoute.GET(new Request('http://localhost/agents/rye.md'), {
      params: Promise.resolve({ slug: 'rye' }),
    });
    expect(res.status).toBe(200);
    const md = await res.text();
    expect(md).toContain('- **Pricing:** Usage-based (https://rye.com/pricing)');
    expect(md).toContain('- **Open source:** No');
    expect(md).toContain('- **Hosting:** Hosted');
    expect(md).toContain('- **Lifecycle:** Acquired — Acquired by Jolly Labs');
    expect(md).toContain('## Limitations');
    expect(md).toContain('- US shipping addresses and physical products only');
  });

  it('renders lifecycle notice, Limitations block, truth rows, and feedback link on /agents/rye', async () => {
    const html = renderToStaticMarkup(await AgentPage({ params: Promise.resolve({ slug: 'rye' }) }));
    expect(html).toContain('Acquired');
    expect(html).toContain('Acquired by Jolly Labs');
    expect(html).toContain('Usage-based');
    expect(html).toContain('Open source');
    expect(html).toContain('Hosting');
    expect(html).toContain('Hosted');
    expect(html).toContain('Limitations');
    expect(html).toContain('US shipping addresses and physical products only');
    expect(html).toContain('Report an error or suggest an update');
    expect(html).toContain('https://github.com/assafbar2/agentswitchboard.dev/issues/new?');
  });
});

describe('Tombstones for retired slugs', () => {
  it('loads archived listings with removal dates and reasons', async () => {
    const retired = await getAllRetiredListings();
    const slugs = retired.map((r) => r.slug);
    expect(slugs).toContain('gpt-pilot');
    expect(slugs).toContain('zcode');

    const gptPilot = await getRetiredListingBySlug('gpt-pilot');
    expect(gptPilot).not.toBeNull();
    expect(gptPilot!.archivedAt).toBe('2026-11-13');
    expect(gptPilot!.reason).toMatch(/malware/i);
    expect(formatArchiveDate('2026-11-13')).toBe('Nov 13, 2026');
  });

  it('generates static params and noindex, follow metadata for retired slugs', async () => {
    const params = await agentParams();
    const slugs = new Set(params.map((p) => p.slug));
    expect(slugs.has('gpt-pilot')).toBe(true);
    expect(slugs.has('zcode')).toBe(true);

    for (const slug of ['gpt-pilot', 'zcode']) {
      const meta = await agentMetadata({ params: Promise.resolve({ slug }) });
      expect(meta.title).toMatch(/Archived Listing/);
      expect(meta.robots).toEqual({ index: false, follow: true });
    }
  });

  it('picks 2-3 organic live alternatives from the same category/task and ignores placements', async () => {
    const organic = await getOrganicAgents();
    const placed = organic.map((a, i) =>
      i % 2 === 0 ? { ...a, featured: true, sponsored: true } : { ...a, featured: false, sponsored: false }
    );
    const tasks = getTasks();

    for (const slug of ['gpt-pilot', 'zcode']) {
      const retired = (await getRetiredListingBySlug(slug))!;
      const altsOrganic = tombstoneAlternatives(retired, organic, tasks);
      const altsPlaced = tombstoneAlternatives(retired, placed, tasks);

      expect(altsOrganic.length).toBeGreaterThanOrEqual(2);
      expect(altsOrganic.length).toBeLessThanOrEqual(3);
      expect(altsOrganic.every((a) => a.status === 'published')).toBe(true);
      expect(altsOrganic.every((a) => a.slug !== slug)).toBe(true);
      expect(altsOrganic.every((a) => a.categories.some((c) => c.slug === 'code-devtools'))).toBe(true);
      expect(altsPlaced.map((a) => a.slug)).toEqual(altsOrganic.map((a) => a.slug));
    }

    // Duplicate removal note explicitly names its live replacement first.
    const fxAgent = (await getRetiredListingBySlug('fx-agent'))!;
    const fxAlts = tombstoneAlternatives(fxAgent, organic, tasks);
    expect(fxAlts[0]?.slug).toBe('vercel-fx');
  });

  it('renders clean tombstone pages for /agents/gpt-pilot and /agents/zcode without linking to archived URL as CTA', async () => {
    const gptHtml = renderToStaticMarkup(await AgentPage({ params: Promise.resolve({ slug: 'gpt-pilot' }) }));
    expect(gptHtml).toContain('Archived listing');
    expect(gptHtml).toContain('GPT Pilot');
    expect(gptHtml).toContain('Nov 13, 2026');
    expect(gptHtml).toMatch(/credential-stealing malware/i);
    expect(gptHtml).toContain('Active alternatives');
    expect(gptHtml).not.toContain('Visit Agent');

    const zcodeHtml = renderToStaticMarkup(await AgentPage({ params: Promise.resolve({ slug: 'zcode' }) }));
    expect(zcodeHtml).toContain('Archived listing');
    expect(zcodeHtml).toContain('ZCode');
    expect(zcodeHtml).toContain('Nov 13, 2026');
    expect(zcodeHtml).toContain('Active alternatives');
    expect(zcodeHtml).not.toContain('Visit Agent');
  });

  it('keeps retired slugs excluded from sitemap, search, recommend, /llms-full.txt, and /agents/<slug>.md', async () => {
    const [entries, catalog, organic, llmsFullRes] = await Promise.all([
      sitemap(),
      getEveryAgent(),
      getOrganicAgents(),
      llmsFullRoute.GET(),
    ]);
    const sitemapPaths = new Set(entries.map((e) => new URL(e.url).pathname));
    const catalogSlugs = new Set(catalog.map((a) => a.slug));
    const llmsFull = await llmsFullRes.text();

    for (const slug of ['gpt-pilot', 'zcode']) {
      expect(sitemapPaths.has(`/agents/${slug}`)).toBe(false);
      expect(catalogSlugs.has(slug)).toBe(false);
      expect(searchAgents(catalog, slug).some((a) => a.slug === slug)).toBe(false);
      expect(llmsFull).not.toContain(`/agents/${slug}.md`);

      const mdRes = await agentMdRoute.GET(new Request(`http://localhost/agents/${slug}.md`), {
        params: Promise.resolve({ slug }),
      });
      expect(mdRes.status).toBe(404);
    }

    const rec = recommendDecision('coding agent like gpt-pilot', getTasks(), organic);
    if (rec.ok) {
      const slugs = rec.body.recommendations.flatMap((r) => [r.pick.slug, ...r.alternatives.map((a) => a.slug)]);
      expect(slugs).not.toContain('gpt-pilot');
      expect(slugs).not.toContain('zcode');
    }
  });
});

describe('Zero-cost feedback loops', () => {
  it('builds a pre-filled GitHub issue URL with slug, title, label, and template fields', () => {
    const url = new URL(
      listingFeedbackUrl({
        slug: 'rye',
        name: 'Rye',
        agentUrl: 'https://docs.commerce.jolly.dev/api-v2/introduction',
      })
    );
    expect(`${url.origin}${url.pathname}`).toBe(REPO_ISSUES_NEW_URL);
    expect(url.searchParams.get('title')).toBe('[Update] Rye (rye)');
    expect(url.searchParams.get('labels')).toBe('listing-update');
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('https://agentswitchboard.dev/agents/rye');
    expect(body).toContain('content/agents/rye.json');
    expect(body).toContain('https://docs.commerce.jolly.dev/api-v2/introduction');
    expect(body).toContain('### What needs updating?');
    expect(body).toContain('### Official source or docs link');
  });

  it('builds /request links with optional pre-filled search context', () => {
    expect(missingToolHref()).toBe('/request');
    expect(missingToolHref({ tried: 'expensify mcp', category: 'finance' })).toBe(
      '/request?tried=expensify+mcp&category=finance'
    );
  });

  it('POST /api/missing-tool validates payloads, records valid requests, and enforces per-IP rate limits', async () => {
    const post = (body: unknown, ip: string) =>
      missingToolRoute.POST(
        new Request('http://localhost/api/missing-tool', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: typeof body === 'string' ? body : JSON.stringify(body),
        })
      );

    // Invalid: too short
    const bad = await post({ need: 'short' }, '198.51.100.201');
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: 'invalid_request' });

    // Invalid: unknown field rejected by strict schema
    const strictFail = await post(
      { need: 'An MCP server to submit expense reports in Expensify', extra: 'nope' },
      '198.51.100.201'
    );
    expect(strictFail.status).toBe(400);

    // Valid full form payload
    const ok = await post(
      {
        need: 'An MCP server that creates and submits expense reports in Expensify',
        tried: 'expensify expense report',
        category: 'productivity',
        access: ['mcp', 'api'],
      },
      '198.51.100.202'
    );
    expect(ok.status).toBe(202);
    expect(await ok.json()).toMatchObject({ status: 'recorded' });

    // Rate limit enforcement (10/hour per IP)
    const rateIp = '198.51.100.203';
    for (let i = 0; i < 10; i++) {
      const res = await post({ need: `Need number ${i + 1} for an agent workflow tool` }, rateIp);
      expect(res.status).toBe(202);
    }
    const limited = await post({ need: 'Eleventh request within the same hour window' }, rateIp);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    expect(await limited.json()).toMatchObject({ status: 'rate_limited' });
  });
});
