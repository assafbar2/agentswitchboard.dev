import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getRewrittenUrl,
  isRewrite,
  unstable_doesMiddlewareMatch,
} from 'next/experimental/testing/server';
import {
  EDGE_LOGGED_HEADER,
  MAX_EVENT_VALUE_LENGTH,
  bucketClient,
  logConsumer,
  surfaceFor,
  type ClientBucket,
} from '@/lib/log';
import { config as proxyConfig, proxy } from '@/proxy';

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  after: vi.fn(),
}));

vi.mock('@vercel/analytics/server', () => ({ track: mocks.track }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: mocks.after,
}));

const UA = {
  claudeUser: 'Claude-User (claude-code/1.0.83; +https://support.anthropic.com/)',
  claudeCode: 'claude-code/2.0.14',
  claudeBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  chatgptUser:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  openaiMcp: 'openai-mcp/1.0.0',
  oaiSearch: 'Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
  cursor:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/1.4.2 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36',
  windsurf:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Windsurf/1.12.0 Chrome/132.0.6834.210 Electron/34.5.1 Safari/537.36',
  vscode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.104.0 Chrome/138.0.7204.100 Electron/37.2.3 Safari/537.36',
  mcpRemote: 'mcp-remote/0.1.29',
  httpx: 'python-httpx/0.28.1',
  requests: 'python-requests/2.32.3',
  urllib: 'Python-urllib/3.12',
  node: 'node',
  nodeFetch: 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
  axios: 'axios/1.7.9',
  curl: 'curl/8.7.1',
  chrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  headless:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36',
  go: 'Go-http-client/2.0',
} as const;

describe('bucketClient', () => {
  it.each<[string, string | null | undefined, ClientBucket]>([
    ['Claude-User', UA.claudeUser, 'claude'],
    ['Claude Code', UA.claudeCode, 'claude'],
    ['ClaudeBot', UA.claudeBot, 'claude'],
    ['ChatGPT-User', UA.chatgptUser, 'chatgpt-openai'],
    ['OpenAI MCP client', UA.openaiMcp, 'chatgpt-openai'],
    ['OAI-SearchBot', UA.oaiSearch, 'chatgpt-openai'],
    ['Cursor', UA.cursor, 'cursor'],
    ['Windsurf', UA.windsurf, 'windsurf'],
    ['VS Code', UA.vscode, 'vscode'],
    ['mcp-remote', UA.mcpRemote, 'mcp-remote'],
    ['httpx', UA.httpx, 'python'],
    ['requests', UA.requests, 'python'],
    ['urllib', UA.urllib, 'python'],
    ['Node fetch (undici)', UA.node, 'node'],
    ['node-fetch', UA.nodeFetch, 'node'],
    ['axios', UA.axios, 'node'],
    ['curl', UA.curl, 'curl'],
    ['Chrome', UA.chrome, 'browser'],
    ['Firefox', UA.firefox, 'browser'],
    ['Googlebot', UA.googlebot, 'other'],
    ['headless Chrome', UA.headless, 'other'],
    ['Go', UA.go, 'other'],
    ['empty', '', 'other'],
    ['null', null, 'other'],
    ['undefined', undefined, 'other'],
  ])('%s → %s', (_name, ua, expected) => {
    expect(bucketClient(ua)).toBe(expected);
  });
});

describe('surfaceFor', () => {
  it.each([
    ['/api/mcp', 'mcp'],
    ['/api/agents', 'rest'],
    ['/api/agents/[slug]', 'rest'],
    ['/api/categories', 'rest'],
    ['/agents.json', 'doc'],
    ['/llms.txt', 'doc'],
    ['/', 'doc'],
  ])('%s → %s', (route, expected) => {
    expect(surfaceFor(route)).toBe(expected);
  });
});

type AfterTask = () => Promise<unknown> | unknown;
let afterTasks: AfterTask[] = [];
let logSpy: MockInstance<typeof console.log>;

/** Runs what after() was given, as Next does once the response is sent. */
async function runAfterTasks(): Promise<void> {
  const tasks = afterTasks;
  afterTasks = [];
  for (const task of tasks) await task();
}

/** Lets fire-and-forget promises settle and any unhandled rejection surface. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function consumerLines(): Record<string, unknown>[] {
  return logSpy.mock.calls
    .map(([arg]) => {
      try {
        return JSON.parse(String(arg)) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((line): line is Record<string, unknown> => line?.asb_consumer === true);
}

function request(headers: Record<string, string> = {}, url = 'https://agentswitchboard.dev/api/mcp'): Request {
  return new Request(url, { headers });
}

beforeEach(() => {
  afterTasks = [];
  vi.stubEnv('VERCEL_URL', 'agentswitchboard-test.vercel.app');
  vi.stubEnv('VERCEL_WEB_ANALYTICS_ENDPOINT', '');
  mocks.track.mockReset().mockResolvedValue(undefined);
  mocks.after.mockReset().mockImplementation((task: AfterTask) => {
    afterTasks.push(task);
  });
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('logConsumer', () => {
  it('writes the asb_consumer line with the bucketed client', () => {
    logConsumer('/api/agents', request({ 'user-agent': UA.claudeCode, referer: 'https://example.com/' }), {
      q: 'postgres',
    });

    expect(consumerLines()).toEqual([
      {
        asb_consumer: true,
        route: '/api/agents',
        ua: UA.claudeCode,
        client: 'claude',
        referer: 'https://example.com/',
        q: 'postgres',
      },
    ]);
  });

  it('logs ua "unknown" and client "other" when there is no user-agent', () => {
    logConsumer('/api/categories', request());
    expect(consumerLines()).toEqual([
      { asb_consumer: true, route: '/api/categories', ua: 'unknown', client: 'other' },
    ]);
  });

  it('sends agent_call from after(), with the request headers but no cookies', async () => {
    logConsumer(
      '/api/mcp',
      request({
        'user-agent': UA.cursor,
        'x-forwarded-for': '203.0.113.7',
        cookie: 'session=secret',
        authorization: 'Bearer secret',
      }),
      { method: 'tools/call', tool: 'search_agents' }
    );

    // Nothing is sent before the response.
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.track).not.toHaveBeenCalled();

    await runAfterTasks();

    expect(mocks.track).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledWith(
      'agent_call',
      { surface: 'mcp', route: '/api/mcp', tool: 'search_agents', client: 'cursor' },
      { headers: { 'user-agent': UA.cursor, 'x-forwarded-for': '203.0.113.7' } }
    );
  });

  it('uses the JSON-RPC method as the tool when no tool was called, else an empty string', async () => {
    logConsumer('/api/mcp', request({ 'user-agent': UA.node }), { method: 'tools/list' });
    logConsumer('/api/agents', request({ 'user-agent': UA.curl }), { q: 'postgres' });
    await runAfterTasks();

    expect(mocks.track.mock.calls.map(([, props]) => props)).toEqual([
      { surface: 'mcp', route: '/api/mcp', tool: 'tools/list', client: 'node' },
      { surface: 'rest', route: '/api/agents', tool: '', client: 'curl' },
    ]);
  });

  it('keeps every event value within the 255-character limit, with at most 4 properties', async () => {
    logConsumer('/api/mcp/' + 'r'.repeat(400), request({ 'user-agent': 'x'.repeat(1000) }), {
      method: 'm'.repeat(1000),
    });
    await runAfterTasks();

    const [, props] = mocks.track.mock.calls[0] as [string, Record<string, unknown>];
    expect(Object.keys(props).length).toBeLessThanOrEqual(4);
    for (const value of Object.values(props)) {
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeLessThanOrEqual(MAX_EVENT_VALUE_LENGTH);
    }
    expect(props.tool).toBe('m'.repeat(MAX_EVENT_VALUE_LENGTH));
  });

  it('never throws or rejects when track() rejects', async () => {
    mocks.track.mockRejectedValue(new Error('analytics down'));
    expect(() => logConsumer('/api/agents', request({ 'user-agent': UA.curl }))).not.toThrow();
    await expect(runAfterTasks()).resolves.toBeUndefined();
    expect(mocks.track).toHaveBeenCalledTimes(1);
  });

  it('never throws or rejects when track() throws synchronously', async () => {
    mocks.track.mockImplementation(() => {
      throw new Error('bad input');
    });
    expect(() => logConsumer('/api/agents', request({ 'user-agent': UA.curl }))).not.toThrow();
    await expect(runAfterTasks()).resolves.toBeUndefined();
  });

  it('falls back to fire-and-forget when after() is unavailable, and swallows a rejection there', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      mocks.after.mockImplementation(() => {
        throw new Error('`after` was called outside a request scope.');
      });
      mocks.track.mockRejectedValue(new Error('analytics down'));

      expect(() => logConsumer('/api/agents', request({ 'user-agent': UA.httpx }))).not.toThrow();
      await flush();

      expect(mocks.track).toHaveBeenCalledTimes(1);
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('never throws when the extra fields cannot be serialized', async () => {
    expect(() =>
      logConsumer('/api/agents', request({ 'user-agent': UA.curl }), { big: BigInt(1) })
    ).not.toThrow();
    await runAfterTasks();
    expect(mocks.track).toHaveBeenCalledTimes(1);
  });

  it('still logs, but skips the event, when no analytics endpoint is configured', () => {
    vi.stubEnv('VERCEL_URL', '');
    logConsumer('/api/agents', request({ 'user-agent': UA.curl }));
    expect(consumerLines()).toHaveLength(1);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('does not count a doc request the proxy already counted', () => {
    logConsumer('/agents.json', request({ 'user-agent': UA.curl, [EDGE_LOGGED_HEADER]: '1' }));
    expect(consumerLines()).toHaveLength(0);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it('ignores the proxy marker on API routes, so it cannot hide API or MCP calls', () => {
    logConsumer('/api/agents', request({ 'user-agent': UA.curl, [EDGE_LOGGED_HEADER]: '1' }));
    logConsumer('/api/mcp', request({ 'user-agent': UA.curl, [EDGE_LOGGED_HEADER]: '1' }));
    expect(consumerLines().map((line) => line.route)).toEqual(['/api/agents', '/api/mcp']);
  });
});

describe('proxy', () => {
  function proxyRequest(path: string, init: { method?: string; headers?: Record<string, string> } = {}) {
    return new NextRequest(new URL(path, 'https://agentswitchboard.dev'), init);
  }

  it.each([
    '/',
    '/llms.txt',
    '/agents.json',
    '/index.md',
    '/skill.md',
    '/SKILL.md',
    '/openapi.json',
    '/.well-known/mcp.json',
    '/.well-known/webmcp.json',
  ])('runs for machine doc %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url })).toBe(true);
  });

  it.each(['/browse', '/agents/cursor', '/api/agents', '/api/mcp', '/privacy'])(
    'does not run for %s',
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url })).toBe(false);
    }
  );

  it('rewrites / to /index.md for Accept: text/markdown, sets Vary, and counts it', async () => {
    const res = proxy(
      proxyRequest('/', { headers: { accept: 'text/markdown', 'user-agent': UA.claudeUser } })
    );

    expect(isRewrite(res)).toBe(true);
    expect(getRewrittenUrl(res)).toBe('https://agentswitchboard.dev/index.md');
    expect(res.headers.get('vary')).toBe('Accept, Accept-Encoding');
    expect(consumerLines()).toMatchObject([{ route: '/', client: 'claude' }]);

    await runAfterTasks();
    expect(mocks.track).toHaveBeenCalledWith(
      'agent_call',
      { surface: 'doc', route: '/', tool: '', client: 'claude' },
      expect.anything()
    );
  });

  it('passes HTML requests for / straight through with Vary and does not count them', () => {
    const res = proxy(
      proxyRequest('/', { headers: { accept: 'text/html,text/markdown;q=0.9', 'user-agent': UA.chrome } })
    );

    expect(isRewrite(res)).toBe(false);
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.headers.get('vary')).toBe('Accept, Accept-Encoding');
    expect(consumerLines()).toHaveLength(0);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it('counts a machine doc read and leaves the response untouched apart from the upstream marker', async () => {
    const res = proxy(proxyRequest('/llms.txt', { headers: { 'user-agent': UA.httpx } }));

    expect(isRewrite(res)).toBe(false);
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(res.headers.get('vary')).toBeNull();
    expect(res.headers.get(`x-middleware-request-${EDGE_LOGGED_HEADER}`)).toBe('1');
    expect(consumerLines()).toMatchObject([{ route: '/llms.txt', client: 'python' }]);

    await runAfterTasks();
    expect(mocks.track).toHaveBeenCalledWith(
      'agent_call',
      { surface: 'doc', route: '/llms.txt', tool: '', client: 'python' },
      { headers: { 'user-agent': UA.httpx } }
    );
  });

  it('does not count CORS preflights or HEAD checks', () => {
    proxy(proxyRequest('/skill.md', { method: 'OPTIONS' }));
    proxy(proxyRequest('/agents.json', { method: 'HEAD' }));
    expect(consumerLines()).toHaveLength(0);
    expect(mocks.after).not.toHaveBeenCalled();
  });
});
