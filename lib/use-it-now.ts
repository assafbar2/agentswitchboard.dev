/**
 * "Use it now": how to start using a listing, one part per access method it
 * has, built only from its own fields. mcpEndpoint, mcpCommand, install,
 * quickstartUrl and apiBaseUrl are copied from the vendor's docs; a listing
 * without them gets a link to its instructions, never a guessed command.
 *
 * The listing page, its text-only view, GET /api/agents/{slug} and the MCP
 * get_agent tool all read this, so they can't disagree.
 */

import { tryThis } from './try-this';
import type { Agent, AgentInstall } from './types';

export type McpServerConfig = { url: string } | { command: string; args: string[] };

export interface McpUse {
  /** The vendor's hosted server, when its docs give one. */
  endpoint: string | null;
  /** The command that runs it locally, when its docs give one. */
  command: string | null;
  /** For Cursor and other MCP clients: the hosted server if there is one, else the local command. */
  clientConfig: { mcpServers: Record<string, McpServerConfig> } | null;
  cursorInstallUrl: string | null;
  /** Claude's custom connector dialog, filled in. Hosted servers only. */
  claudeConnectorUrl: string | null;
  claudeCodeCommand: string | null;
  /** For a coding agent to follow the instructions when there is no config to paste. */
  setupPrompt: string;
  docsUrl: string;
}

export interface CliUse {
  install: AgentInstall | null;
  docsUrl: string;
}

export interface ApiUse {
  baseUrl: string | null;
  /** How the API authenticates, in plain words. */
  auth: string;
  docsUrl: string;
}

export interface ExtensionUse {
  url: string;
}

export interface UseItNow {
  mcp: McpUse | null;
  cli: CliUse | null;
  api: ApiUse | null;
  extension: ExtensionUse | null;
}

type UseItAgent = Pick<
  Agent,
  | 'name'
  | 'slug'
  | 'providerName'
  | 'agentUrl'
  | 'authType'
  | 'accessMethods'
  | 'skills'
  | 'mcpEndpoint'
  | 'mcpCommand'
  | 'install'
  | 'quickstartUrl'
  | 'apiBaseUrl'
>;

export const INSTALL_LABELS: Record<AgentInstall['type'], string> = {
  npm: 'npm',
  pip: 'pip',
  brew: 'Homebrew',
  docker: 'Docker',
  binary: 'Install script',
};

export function apiAuth(agent: Pick<Agent, 'authType' | 'providerName'>): string {
  switch (agent.authType) {
    case 'apiKey':
      return `An API key from ${agent.providerName}`;
    case 'bearer':
      return `A bearer token from ${agent.providerName}`;
    case 'oauth2':
      return `OAuth 2.0: you sign in with ${agent.providerName}`;
    default:
      return 'None needed';
  }
}

/** "npx -y @playwright/mcp@latest" as an MCP client's command and args. Validation keeps commands free of quoting. */
export function commandConfig(command: string): { command: string; args: string[] } {
  const [bin, ...args] = command.trim().split(/\s+/);
  return { command: bin, args };
}

function cursorInstallUrl(slug: string, config: McpServerConfig): string {
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(slug)}&config=${encodeURIComponent(btoa(JSON.stringify(config)))}`;
}

function claudeConnectorUrl(name: string, endpoint: string): string {
  return (
    'https://claude.ai/customize/connectors?modal=add-custom-connector' +
    `&connectorName=${encodeURIComponent(name)}&connectorUrl=${encodeURIComponent(endpoint)}`
  );
}

function mcpUse(agent: UseItAgent, docsUrl: string): McpUse {
  const endpoint = agent.mcpEndpoint ?? null;
  const command = agent.mcpCommand ?? null;
  const server: McpServerConfig | null = endpoint ? { url: endpoint } : command ? commandConfig(command) : null;
  const transport = endpoint && /\/sse\/?$/.test(new URL(endpoint).pathname) ? 'sse' : 'http';
  return {
    endpoint,
    command,
    clientConfig: server ? { mcpServers: { [agent.slug]: server } } : null,
    cursorInstallUrl: server ? cursorInstallUrl(agent.slug, server) : null,
    claudeConnectorUrl: endpoint ? claudeConnectorUrl(agent.name, endpoint) : null,
    claudeCodeCommand: endpoint
      ? `claude mcp add --transport ${transport} ${agent.slug} ${endpoint}`
      : command
        ? `claude mcp add ${agent.slug} -- ${command}`
        : null,
    setupPrompt: `Connect ${agent.name} as an MCP server, following its setup instructions at ${docsUrl}`,
    docsUrl,
  };
}

export function howToUse(agent: UseItAgent): UseItNow {
  const docsUrl = agent.quickstartUrl ?? agent.agentUrl;
  const has = (method: Agent['accessMethods'][number]) => agent.accessMethods.includes(method);
  return {
    mcp: has('mcp') ? mcpUse(agent, docsUrl) : null,
    cli: has('cli') ? { install: agent.install ?? null, docsUrl } : null,
    api: has('api') ? { baseUrl: agent.apiBaseUrl ?? null, auth: apiAuth(agent), docsUrl } : null,
    extension: has('browser-extension') ? { url: docsUrl } : null,
  };
}

/** The panel as data, for GET /api/agents/{slug} and get_agent: its prompts first, then each access method. */
export function howToUseJson(agent: UseItAgent) {
  const prompts = tryThis(agent);
  return {
    tryThisFirst: prompts ? { lead: prompts.lead, prompts: prompts.prompts.map((p) => ({ skill: p.skillId, text: p.text })) } : null,
    ...howToUse(agent),
  };
}

/** The panel as key/value rows for the text-only view, absent values left out. */
export function howToUseRows({ mcp, cli, api, extension }: UseItNow): [string, string][] {
  const rows: [string, string | null][] = [];
  if (mcp) {
    rows.push(
      ['mcp.endpoint', mcp.endpoint],
      ['mcp.command', mcp.command],
      ['mcp.config', mcp.clientConfig && JSON.stringify(mcp.clientConfig)],
      ['mcp.claude-code', mcp.claudeCodeCommand],
      ['mcp.setup-prompt', mcp.clientConfig ? null : mcp.setupPrompt],
      ['mcp.docs', mcp.docsUrl]
    );
  }
  if (cli) rows.push([cli.install ? `cli.install (${INSTALL_LABELS[cli.install.type]})` : 'cli.install', cli.install?.command ?? null], ['cli.docs', cli.docsUrl]);
  if (api) rows.push(['api.base-url', api.baseUrl], ['api.auth', api.auth], ['api.docs', api.docsUrl]);
  if (extension) rows.push(['extension', extension.url]);
  return rows.filter((row): row is [string, string] => row[1] !== null);
}

export const USE_IT_COMMAND_MAX = 200;

const PLACEHOLDER =
  /[<>{}]|\bYOUR_|\.{3}|…|\byour[-_](?:account|company|domain|host|instance|org|organization|project|region|server|site|subdomain|tenant|workspace)\b/i;
// Plain words only, so commandConfig can split it and nothing runs but the command.
const MCP_COMMAND = /^(?:npx|uvx|bunx|docker|pipx) [\w@/.:=+-]+(?: [\w@/.:=+-]+)*$/;
const INSTALL_COMMAND: Record<AgentInstall['type'], RegExp> = {
  npm: /^(?:npm|npx|pnpm|yarn|bun|bunx) /,
  pip: /^(?:pip3?|pipx|uvx?|python3? -m pip) /,
  brew: /^brew /,
  docker: /^docker /,
  binary: /^(?:curl|wget|irm|iwr|powershell|(?:ba|z)?sh <\(curl) /,
};

/** What's wrong with a listing's Use it now fields, for scripts/validate-content.ts. */
export function howToUseProblems(
  agent: Pick<Agent, 'accessMethods' | 'mcpEndpoint' | 'mcpCommand' | 'install' | 'quickstartUrl' | 'apiBaseUrl'>
): string[] {
  const problems: string[] = [];
  const needs = (field: string, method: Agent['accessMethods'][number]) => {
    if (!agent.accessMethods.includes(method)) problems.push(`${field} needs "${method}" in accessMethods`);
  };
  const urls: [string, string | undefined][] = [
    ['mcpEndpoint', agent.mcpEndpoint],
    ['quickstartUrl', agent.quickstartUrl],
    ['apiBaseUrl', agent.apiBaseUrl],
  ];
  for (const [field, url] of urls) {
    if (url === undefined) continue;
    if (PLACEHOLDER.test(decodeURI(url))) problems.push(`${field} "${url}" has a placeholder; give the address every user can use`);
    if (/^https:\/\/(?:localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url)) problems.push(`${field} "${url}" is a local address`);
  }
  if (agent.mcpEndpoint !== undefined) needs('mcpEndpoint', 'mcp');
  if (agent.apiBaseUrl !== undefined) needs('apiBaseUrl', 'api');
  if (agent.mcpCommand !== undefined) {
    needs('mcpCommand', 'mcp');
    if (!MCP_COMMAND.test(agent.mcpCommand) || PLACEHOLDER.test(agent.mcpCommand)) {
      problems.push(`mcpCommand "${agent.mcpCommand}" must be npx, uvx, bunx, docker or pipx followed by plain arguments, with no placeholders`);
    }
  }
  if (agent.install !== undefined) {
    needs('install', 'cli');
    const { type, command } = agent.install;
    // Process substitution, as in bash <(curl …), is not a placeholder.
    const placeholder = PLACEHOLDER.test(command.replace(/ <\(/g, ' ('));
    if (/\n/.test(command) || placeholder) problems.push(`install.command "${command}" must be one line with no placeholders`);
    if (!INSTALL_COMMAND[type].test(command)) problems.push(`install.command "${command}" doesn't look like a ${type} install`);
  }
  return problems;
}

/** "developers.box.com/guides/box-mcp": where a docs link goes, shown as its link text. */
export function displayUrl(url: string, max = 60): string {
  const { host, pathname } = new URL(url);
  const shown = `${host.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}`;
  return shown.length > max ? `${shown.slice(0, max - 1)}…` : shown;
}
