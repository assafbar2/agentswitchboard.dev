import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitAgent, type SubmitState } from '@/app/submit/actions';

const GITHUB_ISSUES = 'https://api.github.com/repos/assafbar2/agentswitchboard.dev/issues';
const AGENTMAIL_SEND =
  'https://api.agentmail.to/v0/inboxes/barnir%40agentmail.to/messages/send';
const ISSUE_URL = 'https://github.com/assafbar2/agentswitchboard.dev/issues/321';
const EMAIL = 'Vendor.Person+agents@example.com';
const idle: SubmitState = { status: 'idle', message: '' };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

function githubCreated(): Response {
  return new Response(JSON.stringify({ html_url: ISSUE_URL, number: 321 }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

type FetchArgs = [input: string | URL | Request, init?: RequestInit];

function callsTo(mock: ReturnType<typeof vi.fn>, url: string): FetchArgs[] {
  return (mock.mock.calls as FetchArgs[]).filter(([input]) => String(input) === url);
}

function githubPayload(mock: ReturnType<typeof vi.fn>): { title: string; body: string } {
  const [call] = callsTo(mock, GITHUB_ISSUES);
  expect(call).toBeDefined();
  return JSON.parse(String(call[1]?.body));
}

/** Every string passed to any console method during the test, joined. */
function consoleOutput(spies: ReturnType<typeof vi.spyOn>[]): string {
  return spies
    .flatMap((spy) => spy.mock.calls.flat())
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg) ?? String(arg)))
    .join('\n');
}

describe('submitAgent', () => {
  let consoleSpies: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    vi.stubEnv('GITHUB_ISSUES_TOKEN', 'test-github-token');
    vi.stubEnv('AGENTMAIL_API_KEY', 'test-agentmail-key');
    consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {})
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('never puts the submitter email in the public GitHub issue', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input) === GITHUB_ISSUES ? githubCreated() : new Response('{}', { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    // The submitter also pastes their own address into the description, in a different case.
    const ask = `Taskfolk — https://taskfolk.example, MCP + API. Reach me at ${EMAIL.toLowerCase()} for keys.`;
    const result = await submitAgent(idle, form({ ask, email: EMAIL }));

    expect(result.status).toBe('ok');
    const { title, body } = githubPayload(fetchMock);
    for (const text of [title, body]) {
      expect(text.toLowerCase()).not.toContain(EMAIL.toLowerCase());
      expect(text).not.toContain('example.com');
    }
    expect(body).toContain('https://taskfolk.example');
  });

  it('sends the email privately to the maintainer inbox via AgentMail', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input) === GITHUB_ISSUES ? githubCreated() : new Response('{}', { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await submitAgent(idle, form({ ask: 'Taskfolk — https://taskfolk.example, MCP + API.', email: EMAIL }));

    const [call] = callsTo(fetchMock, AGENTMAIL_SEND);
    expect(call).toBeDefined();
    const init = call[1]!;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-agentmail-key');
    const payload = JSON.parse(String(init.body));
    expect(payload.to).toEqual(['barnir@agentmail.to']);
    expect(typeof payload.subject).toBe('string');
    expect(payload.text).toContain(EMAIL);
    expect(payload.text).toContain(ISSUE_URL);
    expect(payload.text).toContain('https://taskfolk.example');
  });

  it('returns the public issue URL on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) =>
        String(input) === GITHUB_ISSUES ? githubCreated() : new Response('{}', { status: 200 })
      )
    );

    const result = await submitAgent(idle, form({ ask: 'Taskfolk — https://taskfolk.example, MCP + API.', email: EMAIL }));

    expect(result).toMatchObject({ status: 'ok', issueUrl: ISSUE_URL });
  });

  it('still succeeds when the private send throws', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === GITHUB_ISSUES) return githubCreated();
      throw new TypeError(`fetch failed for ${EMAIL}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitAgent(idle, form({ ask: 'Taskfolk — https://taskfolk.example, MCP + API.', email: EMAIL }));

    expect(callsTo(fetchMock, AGENTMAIL_SEND)).toHaveLength(1);
    expect(result).toMatchObject({ status: 'ok', issueUrl: ISSUE_URL });
    expect(consoleOutput(consoleSpies)).not.toContain(EMAIL);
  });

  it('still succeeds when the private send returns an error status', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) =>
      String(input) === GITHUB_ISSUES
        ? githubCreated()
        : new Response(JSON.stringify({ error: `bad recipient ${EMAIL}` }), { status: 500 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitAgent(idle, form({ ask: 'Taskfolk — https://taskfolk.example, MCP + API.', email: EMAIL }));

    expect(result).toMatchObject({ status: 'ok', issueUrl: ISSUE_URL });
    expect(consoleOutput(consoleSpies)).not.toContain(EMAIL);
  });

  it('without an AgentMail key, files only the public issue and never logs the email', async () => {
    vi.stubEnv('AGENTMAIL_API_KEY', '');
    const fetchMock = vi.fn(async () => githubCreated());
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitAgent(idle, form({ ask: 'Taskfolk — https://taskfolk.example, MCP + API.', email: EMAIL }));

    expect(result.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(callsTo(fetchMock, GITHUB_ISSUES)).toHaveLength(1);
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(EMAIL);
    expect(consoleOutput(consoleSpies)).not.toContain(EMAIL);
  });

  it('reports an error, without trying the private send, when GitHub rejects the issue', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitAgent(idle, form({ ask: 'Taskfolk — https://taskfolk.example, MCP + API.', email: EMAIL }));

    expect(result.status).toBe('error');
    expect(callsTo(fetchMock, AGENTMAIL_SEND)).toHaveLength(0);
  });
});
