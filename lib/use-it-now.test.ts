import { describe, expect, it } from 'vitest';
import type { Agent } from './types';
import { commandConfig, displayUrl, howToUse, howToUseJson, howToUseRows, howToUseProblems } from './use-it-now';

const base: Agent = {
  id: 'x',
  name: 'Example',
  slug: 'example-mcp',
  description: 'An example listing used by the Use it now tests.',
  providerName: 'Example Inc',
  providerUrl: 'https://example.com',
  agentUrl: 'https://example.com/product',
  categories: [],
  tags: [],
  skills: [],
  authType: 'oauth2',
  supportsStreaming: false,
  supportsPushNotifications: false,
  status: 'published',
  featured: false,
  verified: false,
  official: false,
  tier: 'free',
  discoveredBy: 'manual',
  accessMethods: ['mcp'],
};

const decodeCursorConfig = (url: string) => JSON.parse(atob(new URL(url).searchParams.get('config')!));

describe('useItNow', () => {
  it('builds a hosted server config, install links and the Claude Code command from mcpEndpoint', () => {
    const { mcp } = howToUse({ ...base, mcpEndpoint: 'https://mcp.example.com/mcp' });
    expect(mcp?.clientConfig).toEqual({ mcpServers: { 'example-mcp': { url: 'https://mcp.example.com/mcp' } } });
    expect(mcp?.cursorInstallUrl).toMatch(/^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=example-mcp&config=/);
    expect(decodeCursorConfig(mcp!.cursorInstallUrl!)).toEqual({ url: 'https://mcp.example.com/mcp' });
    const claude = new URL(mcp!.claudeConnectorUrl!);
    expect(claude.origin + claude.pathname).toBe('https://claude.ai/customize/connectors');
    expect(claude.searchParams.get('connectorName')).toBe('Example');
    expect(claude.searchParams.get('connectorUrl')).toBe('https://mcp.example.com/mcp');
    expect(mcp?.claudeCodeCommand).toBe('claude mcp add --transport http example-mcp https://mcp.example.com/mcp');
  });

  it('uses the SSE transport for an /sse address', () => {
    const { mcp } = howToUse({ ...base, mcpEndpoint: 'https://mcp.example.com/sse' });
    expect(mcp?.claudeCodeCommand).toBe('claude mcp add --transport sse example-mcp https://mcp.example.com/sse');
  });

  it('turns a local command into command and args, with no Claude connector', () => {
    const { mcp } = howToUse({ ...base, mcpCommand: 'npx -y @example/mcp@latest' });
    expect(mcp?.clientConfig).toEqual({ mcpServers: { 'example-mcp': { command: 'npx', args: ['-y', '@example/mcp@latest'] } } });
    expect(decodeCursorConfig(mcp!.cursorInstallUrl!)).toEqual({ command: 'npx', args: ['-y', '@example/mcp@latest'] });
    expect(mcp?.claudeConnectorUrl).toBeNull();
    expect(mcp?.claudeCodeCommand).toBe('claude mcp add example-mcp -- npx -y @example/mcp@latest');
  });

  it('prefers the hosted server when both are known', () => {
    const { mcp } = howToUse({ ...base, mcpEndpoint: 'https://mcp.example.com/mcp', mcpCommand: 'npx -y @example/mcp' });
    expect(mcp?.clientConfig?.mcpServers['example-mcp']).toEqual({ url: 'https://mcp.example.com/mcp' });
    expect(mcp?.command).toBe('npx -y @example/mcp');
  });

  it('without an address or command, offers a setup prompt and the instructions, nothing invented', () => {
    const { mcp } = howToUse(base);
    expect(mcp?.clientConfig).toBeNull();
    expect(mcp?.cursorInstallUrl).toBeNull();
    expect(mcp?.claudeCodeCommand).toBeNull();
    expect(mcp?.docsUrl).toBe('https://example.com/product');
    expect(mcp?.setupPrompt).toBe('Connect Example as an MCP server, following its setup instructions at https://example.com/product');
  });

  it('links the quickstart page instead of the homepage when there is one', () => {
    const use = howToUse({ ...base, accessMethods: ['mcp', 'cli', 'api'], quickstartUrl: 'https://docs.example.com/start' });
    expect(use.mcp?.docsUrl).toBe('https://docs.example.com/start');
    expect(use.cli?.docsUrl).toBe('https://docs.example.com/start');
    expect(use.api?.docsUrl).toBe('https://docs.example.com/start');
  });

  it('has one part per access method the listing has', () => {
    const use = howToUse({
      ...base,
      accessMethods: ['api', 'cli', 'browser-extension'],
      authType: 'apiKey',
      install: { type: 'npm', command: 'npm install -g example-cli' },
      apiBaseUrl: 'https://api.example.com/v1',
    });
    expect(use.mcp).toBeNull();
    expect(use.cli).toEqual({ install: { type: 'npm', command: 'npm install -g example-cli' }, docsUrl: 'https://example.com/product' });
    expect(use.api).toEqual({ baseUrl: 'https://api.example.com/v1', auth: 'An API key from Example Inc', docsUrl: 'https://example.com/product' });
    expect(use.extension).toEqual({ url: 'https://example.com/product' });
  });

  it('as JSON, opens with the Try this first prompts', () => {
    const json = howToUseJson({
      ...base,
      skills: [{ id: 'search-files', name: 'Search files', description: 'Searches files by keyword across the workspace.' }],
    });
    expect(json.tryThisFirst?.lead).toBe('Ask your assistant, with Example connected:');
    expect(json.tryThisFirst?.prompts).toEqual([{ skill: 'search-files', text: "Use Example to search files: ‹what you're looking for›" }]);
    expect(json.mcp?.setupPrompt).toContain('Connect Example');
  });

  it('as rows, leaves out what is missing', () => {
    expect(howToUseRows(howToUse({ ...base, mcpEndpoint: 'https://mcp.example.com/mcp' })).map(([k]) => k)).toEqual([
      'mcp.endpoint',
      'mcp.config',
      'mcp.claude-code',
      'mcp.docs',
    ]);
    expect(howToUseRows(howToUse(base)).map(([k]) => k)).toEqual(['mcp.setup-prompt', 'mcp.docs']);
    expect(howToUseRows(howToUse({ ...base, accessMethods: ['cli'], install: { type: 'brew', command: 'brew install example' } }))).toEqual([
      ['cli.install (Homebrew)', 'brew install example'],
      ['cli.docs', 'https://example.com/product'],
    ]);
  });
});

describe('commandConfig', () => {
  it('splits on whitespace', () => {
    expect(commandConfig('docker run -i --rm ghcr.io/example/mcp')).toEqual({ command: 'docker', args: ['run', '-i', '--rm', 'ghcr.io/example/mcp'] });
  });
});

describe('displayUrl', () => {
  it('drops the scheme, www and a trailing slash, and shortens long ones', () => {
    expect(displayUrl('https://www.example.com/docs/mcp/')).toBe('example.com/docs/mcp');
    expect(displayUrl(`https://example.com/${'a'.repeat(80)}`)).toHaveLength(60);
  });
});

describe('howToUseProblems', () => {
  const ok = { accessMethods: ['mcp', 'cli', 'api'] as Agent['accessMethods'] };

  it('accepts real values', () => {
    expect(
      howToUseProblems({
        ...ok,
        mcpEndpoint: 'https://mcp.linear.app/mcp',
        mcpCommand: 'npx -y @playwright/mcp@latest',
        install: { type: 'binary', command: 'curl -fsSL https://claude.ai/install.sh | bash' },
        quickstartUrl: 'https://docs.example.com/start',
        apiBaseUrl: 'https://api.example.com/v1',
      })
    ).toEqual([]);
  });

  it('rejects placeholders and local addresses', () => {
    expect(howToUseProblems({ ...ok, mcpEndpoint: 'https://<your-domain>.example.com/mcp' })[0]).toMatch(/placeholder/);
    expect(howToUseProblems({ ...ok, apiBaseUrl: 'https://{region}.example.com' })[0]).toMatch(/placeholder/);
    expect(howToUseProblems({ ...ok, mcpEndpoint: 'https://localhost:3000/mcp' })[0]).toMatch(/local address/);
    expect(howToUseProblems({ ...ok, install: { type: 'npm', command: 'npm install -g example@<version>' } })[0]).toMatch(/placeholder/);
  });

  it('needs the matching access method', () => {
    expect(howToUseProblems({ accessMethods: ['api'], mcpEndpoint: 'https://mcp.example.com/mcp' })).toEqual([
      'mcpEndpoint needs "mcp" in accessMethods',
    ]);
    expect(howToUseProblems({ accessMethods: ['mcp'], install: { type: 'npm', command: 'npm i -g example' } })).toEqual([
      'install needs "cli" in accessMethods',
    ]);
    expect(howToUseProblems({ accessMethods: ['mcp'], apiBaseUrl: 'https://api.example.com' })).toEqual(['apiBaseUrl needs "api" in accessMethods']);
  });

  it('keeps local commands to plain arguments', () => {
    expect(howToUseProblems({ ...ok, mcpCommand: 'npx -y example && rm -rf /' })[0]).toMatch(/plain arguments/);
    expect(howToUseProblems({ ...ok, mcpCommand: 'node server.js' })[0]).toMatch(/plain arguments/);
    expect(howToUseProblems({ ...ok, mcpCommand: 'npx -y "quoted"' })[0]).toMatch(/plain arguments/);
  });

  it('checks the install command matches its type', () => {
    expect(howToUseProblems({ ...ok, install: { type: 'brew', command: 'npm install -g example' } })).toEqual([
      'install.command "npm install -g example" doesn\'t look like a brew install',
    ]);
  });
});
