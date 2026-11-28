/**
 * Verifies /llms-full.txt and /agents/<slug>.md return 200 with clean,
 * structured, strictly organic output (unaffected by featured/sponsored
 * placements and free of placement labels).
 */
import { afterAll, describe, expect, it, vi } from 'vitest';

const placement = vi.hoisted(() => ({ on: false }));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const AGENT_FILE = /[\\/]content[\\/]agents[\\/]([^\\/]+)\.json$/;
  let parity = 0;
  const flagged = new Map<string, boolean>();
  const readFile = (async (file: unknown, ...rest: unknown[]) => {
    const raw = await (actual.promises.readFile as (...a: unknown[]) => Promise<string>)(file, ...rest);
    const match = typeof file === 'string' ? AGENT_FILE.exec(file) : null;
    if (!placement.on || !match) return raw;
    if (!flagged.has(match[1])) flagged.set(match[1], parity++ % 2 === 0);
    if (!flagged.get(match[1])) return raw;
    return JSON.stringify({
      ...JSON.parse(raw),
      featured: true,
      featuredUntil: '2999-01-01',
      sponsored: true,
      sponsorLabel: 'Sponsored',
      tier: 'premium',
    });
  }) as typeof actual.promises.readFile;
  const promises = { ...actual.promises, readFile };
  return { ...actual, promises, default: { ...actual, promises } };
});

const llmsFullRoute = await import('@/app/llms-full.txt/route');
const agentMdRoute = await import('@/app/agents/[slug]/md/route');
const llmsTxtRoute = await import('@/app/llms.txt/route');

afterAll(() => {
  placement.on = false;
});

async function both<T>(fn: () => Promise<T>): Promise<{ organic: T; placed: T }> {
  placement.on = false;
  const organic = await fn();
  placement.on = true;
  const placed = await fn();
  placement.on = false;
  return { organic, placed };
}

describe('/llms-full.txt', () => {
  it('returns 200 plain text with tasks, categories, stacks, MCP/REST endpoints, and stays strictly organic', async () => {
    const { organic, placed } = await both(async () => {
      const res = await llmsFullRoute.GET();
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
        cors: res.headers.get('access-control-allow-origin'),
        body: await res.text(),
      };
    });

    expect(organic.status).toBe(200);
    expect(organic.contentType).toMatch(/^text\/plain/);
    expect(organic.cors).toBe('*');
    expect(organic.body).toMatch(/^# Agent Switchboard — Full LLM Reference/);
    expect(organic.body).toContain('https://agentswitchboard.dev/api/mcp');
    expect(organic.body).toContain('https://agentswitchboard.dev/agents/<slug>.md');
    expect(organic.body).toContain('## Categories (');
    expect(organic.body).toContain('## Tasks (');
    expect(organic.body).toContain('## Curated Stacks (');
    expect(organic.body).toContain('## Official MCP Servers with Copy-Ready Configs (');
    // Compact enough for LLM context windows without blowing up build limits.
    expect(organic.body.length).toBeGreaterThan(20_000);
    expect(organic.body.length).toBeLessThan(250_000);
    // Strictly organic: identical output regardless of placements.
    expect(placed.body).toBe(organic.body);
    expect(placed.body).not.toMatch(/\((Featured|Sponsored)\)/);
  });

  it('is linked from /llms.txt along with /agents/<slug>.md', async () => {
    const res = await llmsTxtRoute.GET();
    const body = await res.text();
    expect(body).toContain('https://agentswitchboard.dev/llms-full.txt');
    expect(body).toContain('https://agentswitchboard.dev/agents/<slug>.md');
  });
});

describe('/agents/[slug].md', () => {
  it('returns 200 markdown with verified facts, Use it now config, skills, limitations, and canonical Link', async () => {
    const { organic, placed } = await both(async () => {
      const res = await agentMdRoute.GET(new Request('http://localhost/agents/playwright-mcp.md'), {
        params: Promise.resolve({ slug: 'playwright-mcp' }),
      });
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
        link: res.headers.get('link'),
        cors: res.headers.get('access-control-allow-origin'),
        body: await res.text(),
      };
    });

    expect(organic.status).toBe(200);
    expect(organic.contentType).toMatch(/^text\/markdown/);
    expect(organic.link).toBe('<https://agentswitchboard.dev/agents/playwright-mcp>; rel="canonical"');
    expect(organic.cors).toBe('*');
    expect(organic.body).toMatch(/^# Playwright MCP/);
    expect(organic.body).toContain('## Facts');
    expect(organic.body).toContain('## Use it now');
    expect(organic.body).toContain('## Skills');
    expect(organic.body).toContain('## For agents');
    expect(organic.body).toContain('"mcpServers"');
    expect(organic.body).toContain('- **Last checked:** ');
    expect(organic.body).toContain('- **Official:** Yes');
    expect(placed.body).toBe(organic.body);
  });

  it('omits featured and sponsored labels even on a sponsored listing (agentmail)', async () => {
    const { organic, placed } = await both(async () => {
      const res = await agentMdRoute.GET(new Request('http://localhost/agents/agentmail.md'), {
        params: Promise.resolve({ slug: 'agentmail' }),
      });
      return { status: res.status, body: await res.text() };
    });

    expect(organic.status).toBe(200);
    expect(organic.body).toMatch(/^# AgentMail/);
    expect(organic.body).toContain('https://mcp.agentmail.to/mcp');
    expect(organic.body).toContain('## Limitations');
    expect(organic.body).not.toMatch(/\b(sponsored|featured|premium)\b/i);
    expect(placed.body).toBe(organic.body);
  });

  it('returns 404 for unknown or archived slugs', async () => {
    const unknown = await agentMdRoute.GET(new Request('http://localhost/agents/does-not-exist.md'), {
      params: Promise.resolve({ slug: 'does-not-exist' }),
    });
    expect(unknown.status).toBe(404);

    const archived = await agentMdRoute.GET(new Request('http://localhost/agents/midjourney.md'), {
      params: Promise.resolve({ slug: 'midjourney' }),
    });
    expect(archived.status).toBe(404);
  });
});
