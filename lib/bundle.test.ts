import { describe, expect, it } from 'vitest';
import { bundleItem, bundleNotes, connectBundle } from './bundle';
import { sharedStack } from './shared-stack';
import { MY_STACK_MAX } from './stack-link';
import type { Agent } from './types';

function listing(slug: string, overrides: Partial<Agent> = {}): Agent {
  const name = slug.replace(/(^|-)(\w)/g, (_, sep: string, c: string) => `${sep ? ' ' : ''}${c.toUpperCase()}`);
  return {
    id: slug,
    name,
    slug,
    description: `${name} is a listing used by the bundle tests.`,
    providerName: 'Example Inc',
    providerUrl: 'https://example.com',
    agentUrl: `https://example.com/${slug}`,
    categories: [],
    tags: [],
    skills: [],
    authType: 'none',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['mcp'],
    ...overrides,
  };
}

const hosted = listing('hosted', { mcpEndpoint: 'https://mcp.example.com/mcp', authType: 'oauth2' });
const local = listing('local', { mcpCommand: 'npx -y @example/mcp@latest' });
const guided = listing('guided', { quickstartUrl: 'https://docs.example.com/mcp' });
const cli = listing('cli-only', { accessMethods: ['cli'], install: { type: 'npm', command: 'npm i -g example' } });

describe('bundleItem', () => {
  it('puts a hosted server in the config by its address, with who hosts it and how you sign in', () => {
    expect(bundleItem(hosted)).toMatchObject({
      how: 'config',
      server: { url: 'https://mcp.example.com/mcp' },
      claudeCodeCommand: 'claude mcp add --transport http hosted https://mcp.example.com/mcp',
      note: 'Hosted by Example Inc. You sign in with Example Inc when you first connect.',
    });
  });

  it('prefers the hosted address when the docs give a command too, as the listing page does', () => {
    const both = listing('both', { mcpEndpoint: 'https://mcp.example.com/mcp', mcpCommand: 'npx example-mcp' });
    expect(bundleItem(both).server).toEqual({ url: 'https://mcp.example.com/mcp' });
  });

  it('puts a local server in the config by its command, with what it needs installed', () => {
    expect(bundleItem(local)).toMatchObject({
      how: 'config',
      server: { command: 'npx', args: ['-y', '@example/mcp@latest'] },
      claudeCodeCommand: 'claude mcp add local -- npx -y @example/mcp@latest',
      note: 'Runs on your computer through npx, so it needs Node.js. No sign-in needed.',
    });
    expect(bundleItem(listing('uv', { mcpCommand: 'uvx example-mcp', authType: 'apiKey' })).note).toBe(
      'Runs on your computer through uvx, so it needs uv. It needs an API key from Example Inc; its setup guide says where the key goes.'
    );
    expect(bundleItem(listing('binary', { mcpCommand: 'example-mcp --stdio' })).note).toBe(
      'Runs on your computer. No sign-in needed.'
    );
  });

  it('sends an MCP server whose docs give no address or command to its setup guide', () => {
    expect(bundleItem(guided)).toMatchObject({
      how: 'guide',
      server: null,
      claudeCodeCommand: null,
      docsUrl: 'https://docs.example.com/mcp',
      note: "Its docs don't print a server address or command to copy, so set it up from its guide.",
    });
    expect(bundleItem(listing('no-docs')).docsUrl).toBe('https://example.com/no-docs');
  });

  it('says how to reach a listing without an MCP server', () => {
    expect(bundleItem(cli)).toMatchObject({ how: 'other', server: null, note: 'No MCP server. Install its CLI with: npm i -g example' });
    const api = listing('api-only', { accessMethods: ['api'], apiBaseUrl: 'https://api.example.com/v1', authType: 'bearer' });
    expect(bundleItem(api).note).toBe('No MCP server. Its API is at https://api.example.com/v1, with a token from Example Inc.');
    const both = listing('cli-and-api', { accessMethods: ['api', 'cli'] });
    expect(bundleItem(both).note).toBe('No MCP server. It has a CLI and an API: see its docs.');
    expect(bundleItem(listing('none', { accessMethods: [] })).note).toBe('No MCP server: see its docs.');
  });
});

describe('connectBundle', () => {
  it('keeps the order, keys the config by slug and holds only the listings it can connect', () => {
    const bundle = connectBundle([guided, hosted, cli, local]);
    expect(bundle.items.map((i) => [i.agent.slug, i.how])).toEqual([
      ['guided', 'guide'],
      ['hosted', 'config'],
      ['cli-only', 'other'],
      ['local', 'config'],
    ]);
    expect(bundle.config).toEqual({
      mcpServers: {
        hosted: { url: 'https://mcp.example.com/mcp' },
        local: { command: 'npx', args: ['-y', '@example/mcp@latest'] },
      },
    });
    expect(Object.keys(bundle.config!.mcpServers)).toEqual(['hosted', 'local']);
    expect(bundle.claudeCode).toEqual([
      'claude mcp add --transport http hosted https://mcp.example.com/mcp',
      'claude mcp add local -- npx -y @example/mcp@latest',
    ]);
  });

  it('asks a coding agent to set up the guide-only servers, one or several', () => {
    expect(connectBundle([guided]).setupPrompt).toBe(
      'Connect Guided as an MCP server, following its setup instructions at https://docs.example.com/mcp'
    );
    const other = listing('other-guided');
    expect(connectBundle([guided, other]).setupPrompt).toBe(
      "Connect these as MCP servers, following each one's setup instructions: Guided at https://docs.example.com/mcp; Other Guided at https://example.com/other-guided"
    );
    expect(connectBundle([hosted]).setupPrompt).toBeNull();
  });

  it('has no config when nothing in it has an address or command', () => {
    const bundle = connectBundle([guided, cli]);
    expect(bundle.config).toBeNull();
    expect(bundle.claudeCode).toEqual([]);
  });
});

describe('bundleNotes', () => {
  const retired = new Map([['gone', 'Gone Tool']]);

  it('names what a stack leaves out: unknown and repeated slugs, gone listings, and any past the cap', () => {
    const many = Array.from({ length: MY_STACK_MAX + 2 }, (_, i) => listing(`tool-${i}`));
    const catalog = [hosted, ...many];
    const stack = sharedStack(['hosted', 'hosted', 'nope', 'gone', ...many.map((a) => a.slug)], '', catalog, retired);
    expect(bundleNotes(stack)).toEqual([
      'Hosted was named twice; it is shown once.',
      '“nope” isn’t a listing in the directory, so it is left out.',
      'Gone Tool is no longer listed, so it is left out.',
      '4 more listings are left out: a stack holds up to 10.',
    ]);
  });

  it('is empty for a stack that keeps everything it names', () => {
    expect(bundleNotes(sharedStack(['hosted', 'local'], '', [hosted, local], retired))).toEqual([]);
  });
});
