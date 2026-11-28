/**
 * Pure Markdown/plain-text renderers for /agents/<slug>.md and /llms-full.txt.
 *
 * Both surfaces are strictly organic: callers pass the organic catalog
 * (getOrganicAgents()), and neither output ever mentions featured, sponsored,
 * or tier placements.
 */

import { VERIFIED_DEFINITION } from '@/components/VerifiedBadge';
import { limitations } from './decide';
import { BASE_URL } from './env';
import { OFFICIAL_DEFINITION } from './public-api';
import { alternativeWhy, getAlternatives, MIN_ALTERNATIVES } from './related';
import { taskMatches } from './search';
import { compareHref } from './compare-link';
import { COMPARE_MAX } from './compare-link';
import { stackEntries, stacksInOrder, type Stack } from './stacks';
import { taskTitle, type Task } from './tasks';
import { tryThis } from './try-this';
import type { Agent, Category } from './types';
import { howToUse, INSTALL_LABELS } from './use-it-now';
import { authTypeLabel } from './utils';
import { lastChecked, verifiedNote } from './verified';

const cleanLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Markdown representation of a single published listing, strictly organic. */
export function renderAgentMarkdown(agent: Agent, organicCatalog: Agent[]): string {
  const page = `${BASE_URL}/agents/${agent.slug}`;
  const use = howToUse(agent);
  const prompts = tryThis(agent);
  const limits = limitations(agent);
  const checked = lastChecked(agent);
  const alternatives = getAlternatives(agent, organicCatalog);
  const topCompare = alternatives.slice(0, COMPARE_MAX - 1).map((a) => a.agent.slug);

  const facts: string[] = [
    `- **Provider:** [${agent.providerName}](${agent.providerUrl})`,
    `- **Homepage:** ${agent.agentUrl}`,
    `- **Official:** ${agent.officialVendor ? `Yes (${agent.officialVendor.name})` : 'No'}`,
    `- **Verified:** ${agent.verified ? verifiedNote(checked) : 'No (not verified yet)'}`,
    ...(checked ? [`- **Last checked:** ${checked}`] : []),
    `- **Access methods:** ${agent.accessMethods.length > 0 ? agent.accessMethods.join(', ') : 'None listed'}`,
    `- **Auth:** ${authTypeLabel(agent.authType)} (\`${agent.authType}\`)`,
    `- **Categories:** ${agent.categories.map((c) => `${c.name} (\`${c.slug}\`)`).join(', ') || 'None'}`,
    ...(agent.tags.length > 0 ? [`- **Tags:** ${agent.tags.join(', ')}`] : []),
    `- **Streaming:** ${agent.supportsStreaming ? 'Yes' : 'No'} · **Push notifications:** ${agent.supportsPushNotifications ? 'Yes' : 'No'}`,
  ];

  const useSections: string[] = [];

  if (use.mcp) {
    const lines: string[] = ['### MCP'];
    if (use.mcp.endpoint) lines.push(`- **Hosted endpoint:** \`${use.mcp.endpoint}\``);
    if (use.mcp.command) lines.push(`- **Local command:** \`${use.mcp.command}\``);
    if (use.mcp.claudeCodeCommand) lines.push(`- **Claude Code:** \`${use.mcp.claudeCodeCommand}\``);
    if (use.mcp.clientConfig) {
      lines.push('', '```json', JSON.stringify(use.mcp.clientConfig, null, 2), '```');
    } else {
      lines.push(`- **Setup prompt:** ${use.mcp.setupPrompt}`);
    }
    lines.push(`- **Docs:** ${use.mcp.docsUrl}`);
    useSections.push(lines.join('\n'));
  }

  if (use.cli) {
    const lines: string[] = ['### CLI'];
    if (use.cli.install) {
      lines.push(`- **Install (${INSTALL_LABELS[use.cli.install.type]}):** \`${use.cli.install.command}\``);
    }
    lines.push(`- **Docs:** ${use.cli.docsUrl}`);
    useSections.push(lines.join('\n'));
  }

  if (use.api) {
    const lines: string[] = ['### API'];
    if (use.api.baseUrl) lines.push(`- **Base URL:** \`${use.api.baseUrl}\``);
    lines.push(`- **Auth:** ${use.api.auth}`);
    lines.push(`- **Docs:** ${use.api.docsUrl}`);
    useSections.push(lines.join('\n'));
  }

  if (use.extension) {
    useSections.push(`### Browser extension\n- **Install / Docs:** ${use.extension.url}`);
  }

  const sections: string[] = [
    `# ${agent.name}`,
    `> ${cleanLine(agent.description)}`,
    `## Facts\n\n${facts.join('\n')}`,
  ];

  if (useSections.length > 0) {
    sections.push(`## Use it now\n\n${useSections.join('\n\n')}`);
  }

  if (prompts && prompts.prompts.length > 0) {
    sections.push(
      `## Try this first\n\n${prompts.lead}\n\n${prompts.prompts.map((p) => `- ${p.text}`).join('\n')}`
    );
  }

  if (limits.length > 0) {
    sections.push(`## Limitations\n\n${limits.map((l) => `- ${l}`).join('\n')}`);
  }

  if (agent.skills.length > 0) {
    sections.push(
      `## Skills (${agent.skills.length})\n\n${agent.skills
        .map((s) => `- **${s.name}** (\`${s.id}\`): ${cleanLine(s.description)}`)
        .join('\n')}`
    );
  }

  if (alternatives.length > 0) {
    const altLines = alternatives.slice(0, 5).map((alt) => {
      const why = alternativeWhy(alt);
      return `- [${alt.agent.name}](${BASE_URL}/agents/${alt.agent.slug}.md) (\`${alt.agent.slug}\`): ${why}`;
    });
    const extra: string[] = [];
    if (alternatives.length >= MIN_ALTERNATIVES) {
      extra.push(`All ${alternatives.length} alternatives: ${BASE_URL}/agents/${agent.slug}/alternatives`);
    }
    if (topCompare.length > 0) {
      extra.push(`Compare side by side: ${BASE_URL}${compareHref([agent.slug, ...topCompare])}`);
    }
    sections.push(`## Alternatives\n\n${altLines.join('\n')}${extra.length > 0 ? `\n\n${extra.join(' · ')}` : ''}`);
  }

  sections.push(
    [
      '## For agents',
      '',
      `- Listing JSON: ${BASE_URL}/api/agents/${agent.slug}`,
      `- Alternatives JSON: ${BASE_URL}/api/agents/${agent.slug}/alternatives`,
      `- MCP server (organic, no auth): ${BASE_URL}/api/mcp`,
      `- Site guide: ${BASE_URL}/llms.txt · Full index: ${BASE_URL}/llms-full.txt`,
      `- Canonical HTML page: ${page}`,
    ].join('\n')
  );

  return sections.join('\n\n') + '\n';
}

function inlineSetup(agent: Agent): string {
  if (agent.mcpEndpoint) return `MCP: ${agent.mcpEndpoint}`;
  if (agent.mcpCommand) return `MCP: \`${agent.mcpCommand}\``;
  if (agent.install) return `CLI: \`${agent.install.command}\``;
  if (agent.apiBaseUrl) return `API: ${agent.apiBaseUrl}`;
  return '';
}

/** Complete plain-text / Markdown reference for LLMs at /llms-full.txt, strictly organic. */
export function renderLlmsFull(
  organicAgents: Agent[],
  categories: Category[],
  tasks: Task[],
  stacks: Stack[]
): string {
  const verifiedCount = organicAgents.filter((a) => a.verified).length;
  const officialCount = organicAgents.filter((a) => a.official).length;
  const mcpAgents = organicAgents.filter((a) => a.accessMethods.includes('mcp'));
  const mcpReadyCount = mcpAgents.filter((a) => a.mcpEndpoint || a.mcpCommand).length;
  const cliAgents = organicAgents.filter((a) => a.accessMethods.includes('cli'));
  const cliReadyCount = cliAgents.filter((a) => a.install).length;

  const categoryLines = categories.map(
    (c) => `- **${c.name}** (\`${c.slug}\`, ${c.agentCount ?? 0} listings)${c.description ? `: ${cleanLine(c.description)}` : ''} — ${BASE_URL}/categories/${c.slug}`
  );

  const taskBlocks = tasks.map((task) => {
    const fits = taskMatches(organicAgents, task);
    const top = fits.slice(0, 6).map((a) => {
      const tags = [
        a.accessMethods.join('+'),
        a.authType === 'none' ? 'no auth' : a.authType,
        a.official ? 'Official' : '',
        inlineSetup(a),
      ]
        .filter(Boolean)
        .join(' · ');
      return `  - [${a.name}](${BASE_URL}/agents/${a.slug}.md) (${tags}) — ${cleanLine(a.description)}`;
    });
    return [
      `### ${taskTitle(task)} (\`${task.slug}\`, ${fits.length} tools)`,
      `${task.blurb} · Markdown: ${BASE_URL}/tasks/${task.slug}.md · API: ${BASE_URL}/api/tasks/${task.slug}`,
      ...top,
    ].join('\n');
  });

  const orderedStacks = stacksInOrder(stacks);
  const stackBlocks = orderedStacks.map((stack) => {
    const entries = stackEntries(stack, organicAgents);
    const lines = entries.map(
      (e, i) => `  ${i + 1}. [${e.agent.name}](${BASE_URL}/agents/${e.agent.slug}.md) (\`${e.agent.slug}\`): ${cleanLine(e.why)}`
    );
    return [
      `### ${stack.title} (\`${stack.slug}\`)`,
      `${stack.promise} · Page: ${BASE_URL}/stacks/${stack.slug} · Bundle API: ${BASE_URL}/api/bundle?items=${stack.items.map((i) => i.slug).join(',')}`,
      ...lines,
    ].join('\n');
  });

  const officialReadyMcps = mcpAgents
    .filter((a) => a.official && (a.mcpEndpoint || a.mcpCommand))
    .map((a) => {
      const cfg = a.mcpEndpoint ? a.mcpEndpoint : `\`${a.mcpCommand}\``;
      return `- [${a.name}](${BASE_URL}/agents/${a.slug}.md) (${a.officialVendor?.name ?? a.providerName} · ${a.authType}): ${cfg}`;
    });

  return `# Agent Switchboard — Full LLM Reference

> Curated directory of ${organicAgents.length} AI agents, MCP servers, CLIs, and APIs (${verifiedCount} verified, ${officialCount} official; ${mcpReadyCount}/${mcpAgents.length} MCP servers and ${cliReadyCount}/${cliAgents.length} CLIs carry copy-ready configs).
> Every section in this file is ranked organically by fit or A→Z, never by paid placement.

## Primary Machine Surfaces

- **Compact site guide:** ${BASE_URL}/llms.txt
- **Homepage Markdown twin:** ${BASE_URL}/index.md (or \`GET ${BASE_URL}/\` with \`Accept: text/markdown\`)
- **Per-listing Markdown:** ${BASE_URL}/agents/<slug>.md (organic facts, copy-ready MCP/CLI/API config, limitations, skills, alternatives)
- **Per-task Markdown:** ${BASE_URL}/tasks/<slug>.md (organic best fits and quick answers)
- **Connector skill:** ${BASE_URL}/skill.md
- **OpenAPI 3.1:** ${BASE_URL}/openapi.json
- **Paginated JSON catalog:** ${BASE_URL}/agents.json (\`/catalog/1.json\`, \`/catalog/2.json\`, …, 50 listings/page)

## MCP Server & REST API (No Auth, Open CORS, Organic)

- **Remote MCP (Streamable HTTP):** ${BASE_URL}/api/mcp
- **Stdio bridge:** \`npx -y mcp-remote ${BASE_URL}/api/mcp\`
- **Server manifest:** ${BASE_URL}/.well-known/mcp.json
- **WebMCP (in-browser \`document.modelContext\`):** ${BASE_URL}/.well-known/webmcp.json

MCP tools (9):
- \`recommend\`: one pick, why it fits, next step (copy-ready config when available), limitations, and two alternatives for a plain-language need.
- \`search_agents\`: search and filter by \`query\`, \`task\`, \`category\`, \`access\`, \`official\`, \`verified\`, \`auth\`, \`since\`, \`sort\`, \`limit\`, \`offset\`.
- \`get_agent\`: full listing record by slug, including \`useItNow\` copy-ready client config, install command, API base URL, and skills.
- \`list_categories\`: all ${categories.length} category slugs and live counts.
- \`compare_agents\`: put 2 or 3 listings side by side with \`setsApart\` facts and field rows.
- \`alternatives_to\`: strongest organic alternatives to a listing, with shared access and overlapping skills/tags.
- \`connect_bundle\`: turn up to 10 listing slugs into one \`{"mcpServers": …}\` config, \`claude mcp add\` commands, and setup instructions for the rest.
- \`submit_listing\`: file a public GitHub issue proposing a new listing for human review (never publishes directly).
- \`request_missing_tool\`: record privately that no listing fits a job, for weekly curation.

REST API (120 req/min per IP, JSON 429 with \`Retry-After\`):
- \`GET ${BASE_URL}/api/agents?q=&task=&category=&access=&official=&verified=&auth=&since=&sort=&limit=&offset=&page=&order=organic\`
- \`GET ${BASE_URL}/api/agents/{slug}\`
- \`GET ${BASE_URL}/api/agents/{slug}/alternatives\`
- \`GET ${BASE_URL}/api/categories\`
- \`GET ${BASE_URL}/api/tasks\` and \`GET ${BASE_URL}/api/tasks/{slug}\`
- \`GET ${BASE_URL}/api/stacks\` and \`GET ${BASE_URL}/api/stacks/{slug}\`
- \`GET ${BASE_URL}/api/compare?a={slug}&b={slug}&c={slug}\`
- \`GET ${BASE_URL}/api/bundle?items={slug},{slug}\`
- \`GET ${BASE_URL}/api/recommend?need={need}\`
- \`POST ${BASE_URL}/api/missing-tool\`

## Flag Definitions

- ${VERIFIED_DEFINITION}
- ${OFFICIAL_DEFINITION}

## Categories (${categories.length})

${categoryLines.join('\n')}

## Tasks (${tasks.length}, Top 6 Organic Fits Each)

${taskBlocks.join('\n\n')}

## Curated Stacks (${orderedStacks.length})

${stackBlocks.join('\n\n')}

## Official MCP Servers with Copy-Ready Configs (${officialReadyMcps.length})

${officialReadyMcps.join('\n')}

## License & Contact

- Code: MIT · Catalog data: CC BY-NC 4.0
- Privacy: ${BASE_URL}/privacy · Terms: ${BASE_URL}/terms
- Maintainer: Barnir — barnir@agentmail.to
`;
}
