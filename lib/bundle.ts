/**
 * The connect bundle: one MCP client config for every listing in a stack whose
 * docs give a server address or command, and how to connect the rest. GET
 * /api/bundle, the MCP connect_bundle tool and the stack pages show it.
 *
 * Each part comes from the listing's Use it now panel (lib/use-it-now.ts), so
 * the bundle never holds an address or command its listing page doesn't.
 */

import { extraText, sharedStackNoteText, type SharedStack } from './shared-stack';
import type { Agent } from './types';
import { commandConfig, howToUse, type McpServerConfig } from './use-it-now';

/**
 * How a listing connects: `config`, it is in the bundle's config; `guide`, an
 * MCP server whose docs print no address or command, set up from its guide;
 * `other`, no MCP server, so its CLI, API or extension.
 */
export type BundleHow = 'config' | 'guide' | 'other';

export interface BundleItem {
  agent: Agent;
  how: BundleHow;
  /** In the config, under the listing's slug. */
  server: McpServerConfig | null;
  claudeCodeCommand: string | null;
  /** Where its own setup instructions are. */
  docsUrl: string;
  /** How it connects, in a sentence or two. */
  note: string;
}

export interface Bundle {
  items: BundleItem[];
  /** Every `config` item's server, in stack order; null when there are none. */
  config: { mcpServers: Record<string, McpServerConfig> } | null;
  /** `claude mcp add` for each `config` item, for Claude Code. */
  claudeCode: string[];
  /** For a coding agent: set up every `guide` item from its instructions. Null when there are none. */
  setupPrompt: string | null;
}

/** What a local command needs installed, by the program that runs it. */
const RUNS_WITH: Record<string, string> = {
  npx: 'through npx, so it needs Node.js',
  bunx: 'through bunx, so it needs Bun',
  uvx: 'through uvx, so it needs uv',
  pipx: 'through pipx',
  docker: 'in Docker',
};

function signIn(agent: Pick<Agent, 'authType' | 'providerName'>): string {
  switch (agent.authType) {
    case 'oauth2':
      return `You sign in with ${agent.providerName} when you first connect.`;
    case 'apiKey':
      return `It needs an API key from ${agent.providerName}; its setup guide says where the key goes.`;
    case 'bearer':
      return `It needs a token from ${agent.providerName}; its setup guide says where it goes.`;
    default:
      return 'No sign-in needed.';
  }
}

function apiWith(agent: Pick<Agent, 'authType' | 'providerName'>): string {
  switch (agent.authType) {
    case 'oauth2':
      return `signing in with ${agent.providerName}`;
    case 'apiKey':
      return `with an API key from ${agent.providerName}`;
    case 'bearer':
      return `with a token from ${agent.providerName}`;
    default:
      return 'no key needed';
  }
}

/** A listing without an MCP server: its install command or API address if its docs give one, else where its docs are. */
function otherNote(agent: Agent, use: ReturnType<typeof howToUse>): string {
  if (use.cli?.install) return `No MCP server. Install its CLI with: ${use.cli.install.command}`;
  if (use.api?.baseUrl) return `No MCP server. Its API is at ${use.api.baseUrl}, ${apiWith(agent)}.`;
  const ways = [use.cli && 'a CLI', use.api && 'an API', use.extension && 'a browser extension'].filter(Boolean);
  return ways.length > 0
    ? `No MCP server. It has ${ways.join(' and ')}: see its docs.`
    : 'No MCP server: see its docs.';
}

export function bundleItem(agent: Agent): BundleItem {
  const use = howToUse(agent);
  const docsUrl = use.mcp?.docsUrl ?? use.cli?.docsUrl ?? use.api?.docsUrl ?? use.extension?.url ?? agent.agentUrl;
  const mcp = use.mcp;
  if (mcp?.endpoint) {
    return {
      agent,
      how: 'config',
      server: { url: mcp.endpoint },
      claudeCodeCommand: mcp.claudeCodeCommand,
      docsUrl,
      note: `Hosted by ${agent.providerName}. ${signIn(agent)}`,
    };
  }
  if (mcp?.command) {
    const server = commandConfig(mcp.command);
    const runs = RUNS_WITH[server.command];
    return {
      agent,
      how: 'config',
      server,
      claudeCodeCommand: mcp.claudeCodeCommand,
      docsUrl,
      note: `Runs on your computer${runs ? ` ${runs}` : ''}. ${signIn(agent)}`,
    };
  }
  if (mcp) {
    return {
      agent,
      how: 'guide',
      server: null,
      claudeCodeCommand: null,
      docsUrl,
      note: "Its docs don't print a server address or command to copy, so set it up from its guide.",
    };
  }
  return { agent, how: 'other', server: null, claudeCodeCommand: null, docsUrl, note: otherNote(agent, use) };
}

/** The bundle for these listings, in their order. */
export function connectBundle(agents: readonly Agent[]): Bundle {
  const items = agents.map(bundleItem);
  const inConfig = items.filter((i) => i.server);
  const guided = items.filter((i) => i.how === 'guide');
  return {
    items,
    config: inConfig.length > 0 ? { mcpServers: Object.fromEntries(inConfig.map((i) => [i.agent.slug, i.server!])) } : null,
    claudeCode: inConfig.flatMap((i) => (i.claudeCodeCommand ? [i.claudeCodeCommand] : [])),
    setupPrompt:
      guided.length === 0
        ? null
        : guided.length === 1
          ? `Connect ${guided[0].agent.name} as an MCP server, following its setup instructions at ${guided[0].docsUrl}`
          : `Connect these as MCP servers, following each one's setup instructions: ${guided.map((i) => `${i.agent.name} at ${i.docsUrl}`).join('; ')}`,
  };
}

/** What a bundle leaves out of a named stack, and why: unknown and repeated slugs, listings no longer listed, any past the cap. */
export function bundleNotes(stack: SharedStack): string[] {
  return [
    ...stack.notes.map(sharedStackNoteText),
    ...stack.entries.flatMap((e) => (e.retired ? [`${e.retired.name} is no longer listed, so it is left out.`] : [])),
    ...(stack.extra > 0 ? [extraText(stack.extra)] : []),
  ];
}