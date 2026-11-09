/**
 * The Cursor Marketplace plugin (.cursor-plugin/marketplace.json and
 * plugins/agent-switchboard/) against Cursor's submission checklist
 * (cursor.com/docs/reference/plugins), and in step with the live server:
 * the MCP URL in server.json, the site icon, and every tool /api/mcp lists.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { POST as mcpPost } from '@/app/api/[transport]/route';

const ROOT = path.resolve(__dirname, '..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

const PLUGIN_NAME = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const marketplace = readJson('.cursor-plugin/marketplace.json');
const entry = marketplace.plugins[0];
const pluginDir = path.join(ROOT, entry.source);
const manifest = readJson(path.join(entry.source, '.cursor-plugin/plugin.json'));
const mcpConfig = readJson(path.join(entry.source, 'mcp.json'));
const serverJson = readJson('server.json');

function isSafeRelative(p: string) {
  const normalized = path.posix.normalize(p);
  return !path.isAbsolute(p) && normalized !== '..' && !normalized.startsWith('../');
}

async function listedTools(): Promise<string[]> {
  const res = await mcpPost(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    })
  );
  const text = await res.text();
  const data = text.split(/\r?\n/).filter((l) => l.startsWith('data:')).pop();
  const { result } = JSON.parse(data ? data.slice(5) : text);
  return result.tools.map((t: { name: string }) => t.name);
}

describe('Cursor Marketplace plugin', () => {
  it('has one marketplace entry that resolves to a plugin folder with a manifest', () => {
    expect(marketplace.name).toMatch(PLUGIN_NAME);
    expect(marketplace.owner.name).toBeTruthy();
    expect(marketplace.plugins).toHaveLength(1);
    expect(isSafeRelative(entry.source)).toBe(true);
    expect(fs.existsSync(path.join(pluginDir, '.cursor-plugin/plugin.json'))).toBe(true);
    expect(entry.name).toBe(manifest.name);
  });

  it('has a kebab-case name, a description, a semver version and a committed relative logo', () => {
    expect(manifest.name).toMatch(PLUGIN_NAME);
    expect(manifest.description.length).toBeGreaterThan(40);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(isSafeRelative(manifest.logo)).toBe(true);
    expect(fs.readFileSync(path.join(pluginDir, manifest.logo), 'utf8')).toBe(
      fs.readFileSync(path.join(ROOT, 'app/icon.svg'), 'utf8')
    );
  });

  it('adds only the public MCP server, with no variables or secrets', () => {
    const servers = Object.values(mcpConfig.mcpServers) as Record<string, unknown>[];
    expect(servers).toEqual([{ url: serverJson.remotes[0].url }]);
    expect(manifest.variables).toBeUndefined();
  });

  it('ships no rules, skills, agents, commands or hooks that discovery would pick up', () => {
    for (const dir of ['rules', 'skills', 'agents', 'commands', 'hooks']) {
      expect(fs.existsSync(path.join(pluginDir, dir)), dir).toBe(false);
    }
    expect(fs.existsSync(path.join(pluginDir, 'SKILL.md'))).toBe(false);
  });

  it('documents every tool the MCP server lists in its README', async () => {
    const readme = fs.readFileSync(path.join(pluginDir, 'README.md'), 'utf8');
    const tools = await listedTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) expect(readme, tool).toContain(`\`${tool}\``);
  });
});
