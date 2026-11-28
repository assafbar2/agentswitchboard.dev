import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { POST as mcpPost } from '@/app/api/[transport]/route';

const ROOT = path.resolve(__dirname, '..');

async function liveMcpInfo(): Promise<{ version: string; tools: string[] }> {
  const initRes = await mcpPost(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'vitest', version: '1.0.0' },
        },
      }),
    })
  );
  const initText = await initRes.text();
  const initData = initText.split(/\r?\n/).filter((l) => l.startsWith('data:')).pop();
  const initParsed = JSON.parse(initData ? initData.slice(5) : initText);

  const listRes = await mcpPost(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    })
  );
  const listText = await listRes.text();
  const listData = listText.split(/\r?\n/).filter((l) => l.startsWith('data:')).pop();
  const listParsed = JSON.parse(listData ? listData.slice(5) : listText);

  return {
    version: initParsed.result.serverInfo.version as string,
    tools: (listParsed.result.tools as { name: string }[]).map((t) => t.name),
  };
}

describe('Agent Skill and SDK cookbook', () => {
  it('ships a valid Agent Skills SKILL.md covering every live MCP tool', async () => {
    const skillPath = path.join(ROOT, 'skills/agentswitchboard/SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    const content = fs.readFileSync(skillPath, 'utf8');
    expect(content).toMatch(/^---\n[\s\S]*?\n---\n/);
    expect(content).toMatch(/^name:\s*agentswitchboard$/m);
    expect(content).toMatch(/^description:\s*.{40,}/m);
    expect(content).toContain('https://agentswitchboard.dev/api/mcp');
    expect(content).toContain('100% organic');

    const { tools } = await liveMcpInfo();
    expect(tools.length).toBeGreaterThanOrEqual(10);
    for (const tool of tools) {
      expect(content, `SKILL.md should document ${tool}`).toContain(`\`${tool}\``);
    }
  });

  it('ships docs/COOKBOOK.md with AGENTS.md rule snippet and SDK examples', () => {
    const cookbookPath = path.join(ROOT, 'docs/COOKBOOK.md');
    expect(fs.existsSync(cookbookPath)).toBe(true);
    const content = fs.readFileSync(cookbookPath, 'utf8');
    expect(content).toContain('npx skills add assafbar2/agentswitchboard.dev');
    expect(content).toContain('https://agentswitchboard.dev/api/mcp');
    expect(content).toContain('@ai-sdk/mcp');
    expect(content).toContain('MCPServerStreamableHttp');
    expect(content).toContain('@anthropic-ai/claude-agent-sdk');
    expect(content).toContain('curl');
  });
});

describe('Official MCP Registry server.json manifest', () => {
  it('matches the latest 2025-12-11 schema requirements and live MCP server version', async () => {
    const serverJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'server.json'), 'utf8'));
    const { version } = await liveMcpInfo();

    expect(serverJson.$schema).toBe(
      'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json'
    );
    expect(serverJson.name).toBe('io.github.assafbar2/agentswitchboard');
    expect(serverJson.version).toBe(version);
    expect(serverJson.description.length).toBeGreaterThan(10);
    expect(serverJson.description.length).toBeLessThanOrEqual(100);
    expect(serverJson.websiteUrl).toBe('https://agentswitchboard.dev');
    expect(serverJson.repository).toEqual({
      url: 'https://github.com/assafbar2/agentswitchboard.dev',
      source: 'github',
    });
    expect(serverJson.remotes).toEqual([
      { type: 'streamable-http', url: 'https://agentswitchboard.dev/api/mcp' },
    ]);
    expect(fs.existsSync(path.join(ROOT, 'public/agent-switchboard-icon.png'))).toBe(true);
  });
});
