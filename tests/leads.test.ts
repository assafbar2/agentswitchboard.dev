import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { leadLine, logZeroResults, withoutContactDetails } from '@/lib/leads';
import { requestMissingTool, type MissingToolInput } from '@/lib/missing-tool';
import { fixedWindowLimiter } from '@/lib/rate-limit';

const { POST: mcpPost } = await import('@/app/api/[transport]/route');
const agentsRoute = await import('@/app/api/agents/route');
const missingToolRoute = await import('@/app/api/missing-tool/route');

const UA = 'claude-user/1.0';

let logSpy: MockInstance<typeof console.log>;
beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => logSpy.mockRestore());

function leads(): Record<string, unknown>[] {
  return logSpy.mock.calls
    .map(([line]) => {
      try {
        return JSON.parse(String(line));
      } catch {
        return null;
      }
    })
    .filter((line): line is Record<string, unknown> => Boolean(line?.asb_lead));
}

let ip = 0;
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const res = await mcpPost(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'user-agent': UA,
        'x-forwarded-for': `192.0.2.${(++ip % 250) + 1}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ip, method, params }),
    })
  );
  const text = await res.text();
  const data = text
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .pop();
  return JSON.parse(data ? data.slice(5) : text);
}

function postMissingTool(body: unknown, forwardedFor = '203.0.113.50') {
  return missingToolRoute.POST(
    new Request('http://localhost/api/missing-tool', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA, 'x-forwarded-for': forwardedFor },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
}

describe('lead lines', () => {
  it('carry the surface, a coarse client and the words, never the IP or the user-agent', () => {
    const line = leadLine('zero_results', 'rest', { 'user-agent': UA, 'x-forwarded-for': '203.0.113.9' }, {
      q: 'expense  reports\n',
      official: false,
      access: '',
    });
    expect(line).toEqual({ asb_lead: 'zero_results', surface: 'rest', client: 'claude', q: 'expense reports' });
    expect(JSON.stringify(line)).not.toMatch(/203\.0\.113|claude-user/);
  });

  it('drop email addresses and phone numbers from typed text', () => {
    expect(withoutContactDetails('mail jo@acme.io or call +1 (415) 555-0100 about invoices')).toBe(
      'mail [email removed] or call [number removed] about invoices'
    );
  });

  it('mark our own test traffic', () => {
    expect(leadLine('zero_results', 'site', { 'user-agent': 'asb-e2e/1' }, { q: 'x' }).test).toBe(true);
  });

  it('log a search only when it asked for something and found nothing', () => {
    logZeroResults('rest', {}, 3, { q: 'browser' });
    logZeroResults('rest', {}, 0, { q: '', official: false });
    logZeroResults('rest', {}, 0, { q: 'quantum ledger' });
    expect(leads()).toEqual([{ asb_lead: 'zero_results', surface: 'rest', client: 'other', q: 'quantum ledger' }]);
  });
});

describe('zero-result searches', () => {
  it('GET /api/agents logs one with its words and filters', async () => {
    const res = await agentsRoute.GET(
      new Request('http://localhost/api/agents?q=zzqx-no-such-tool&access=cli', { headers: { 'user-agent': UA } })
    );
    expect((await res.json()).total).toBe(0);
    expect(leads()).toEqual([
      { asb_lead: 'zero_results', surface: 'rest', client: 'claude', q: 'zzqx-no-such-tool', access: 'cli' },
    ]);
  });

  it('GET /api/agents with results logs no lead', async () => {
    await agentsRoute.GET(new Request('http://localhost/api/agents?q=browser'));
    expect(leads()).toEqual([]);
  });

  it('MCP search_agents logs one', async () => {
    const { result } = await rpc('tools/call', { name: 'search_agents', arguments: { query: 'zzqx-no-such-tool' } });
    expect(result.structuredContent.total).toBe(0);
    expect(leads()).toEqual([{ asb_lead: 'zero_results', surface: 'mcp', client: 'claude', q: 'zzqx-no-such-tool' }]);
  });
});

describe('missing-tool requests', () => {
  const INPUT: MissingToolInput = { need: 'File expense reports in Expensify', tried: 'expensify', access: ['mcp', 'mcp'] };

  it('are recorded as a lead line and stop at the per-caller limit', () => {
    const log = vi.fn();
    const limits = {
      ip: fixedWindowLimiter({ limit: 1, windowMs: 60_000 }),
      instance: fixedWindowLimiter({ limit: 10, windowMs: 60_000 }),
    };
    const headers = { 'x-forwarded-for': '203.0.113.7' };
    expect(requestMissingTool(INPUT, 'mcp', headers, { limits, log }).status).toBe('recorded');
    expect(log).toHaveBeenCalledWith('missing_tool', 'mcp', headers, {
      need: INPUT.need,
      tried: 'expensify',
      category: undefined,
      access: 'mcp',
    });
    expect(requestMissingTool(INPUT, 'mcp', headers, { limits, log }).status).toBe('rate_limited');
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('MCP request_missing_tool records one', async () => {
    const { result } = await rpc('tools/call', {
      name: 'request_missing_tool',
      arguments: { need: 'Book squash courts at my club', tried: 'squash' },
    });
    expect(result.structuredContent.status).toBe('recorded');
    expect(result.isError).toBeUndefined();
    expect(leads()).toEqual([
      { asb_lead: 'missing_tool', surface: 'mcp', client: 'claude', need: 'Book squash courts at my club', tried: 'squash' },
    ]);
  });

  it('MCP tools/list declares it as a write that changes nothing public', async () => {
    const { result } = await rpc('tools/list');
    const tool = result.tools.find((t: { name: string }) => t.name === 'request_missing_tool');
    expect(tool.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, openWorldHint: false });
    expect(tool.inputSchema.required).toEqual(['need']);
  });

  it('POST /api/missing-tool answers 202 and records it, uncached', async () => {
    const res = await postMissingTool({ need: 'Track parcels across UPS and DHL', category: 'commerce-payments' });
    expect(res.status).toBe(202);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect((await res.json()).status).toBe('recorded');
    expect(leads()).toEqual([
      {
        asb_lead: 'missing_tool',
        surface: 'rest',
        client: 'claude',
        need: 'Track parcels across UPS and DHL',
        category: 'commerce-payments',
      },
    ]);
  });

  it('POST /api/missing-tool refuses bad JSON, a short need and unknown fields', async () => {
    for (const body of ['not json', { need: 'short' }, { need: 'Track parcels across carriers', email: 'a@b.co' }]) {
      const res = await postMissingTool(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('invalid_request');
    }
    expect(leads()).toEqual([]);
  });

  it('POST /api/missing-tool answers 429 past the per-caller limit', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await postMissingTool({ need: `Need number ${i} for a tool` }, '203.0.113.99')).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 202)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
