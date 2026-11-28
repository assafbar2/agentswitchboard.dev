import { describe, expect, it } from 'vitest';
import { getAllCategories, getOrganicAgents } from '@/lib/catalog';
import { getStacks, type Stack } from '@/lib/stacks';
import { computeDirectoryStats, pct } from '@/lib/stats';
import { getTasks, type Task } from '@/lib/tasks';
import type { Agent, Category } from '@/lib/types';

function makeAgent(overrides: Partial<Agent>): Agent {
  return {
    id: overrides.slug ?? 'a',
    slug: overrides.slug ?? 'a',
    name: overrides.name ?? 'Agent A',
    description: 'Test agent',
    providerName: overrides.providerName ?? 'Provider A',
    providerUrl: 'https://example.com',
    agentUrl: 'https://example.com/a',
    categories: overrides.categories ?? [{ id: 'cat1', name: 'Databases', slug: 'databases', sortOrder: 1 }],
    tags: overrides.tags ?? ['postgres', 'database'],
    skills: overrides.skills ?? [{ id: 'query', name: 'Query SQL', description: 'Run SQL queries' }],
    authType: overrides.authType ?? 'apiKey',
    accessMethods: overrides.accessMethods ?? ['mcp'],
    supportsStreaming: false,
    supportsPushNotifications: false,
    verified: overrides.verified ?? true,
    featured: overrides.featured ?? false,
    sponsored: overrides.sponsored ?? false,
    official: overrides.official ?? false,
    officialVendor: overrides.officialVendor,
    tier: 'free',
    discoveredBy: 'manual',
    status: 'published',
    createdAt: overrides.createdAt ?? '2026-10-01',
    updatedAt: overrides.updatedAt,
    mcpEndpoint: overrides.mcpEndpoint,
    mcpCommand: overrides.mcpCommand,
    install: overrides.install,
    apiBaseUrl: overrides.apiBaseUrl,
  };
}

describe('computeDirectoryStats', () => {
  it('computes percentages and coverage accurately on synthetic fixtures', () => {
    const dbCat: Category = { id: 'cat1', name: 'Databases', slug: 'databases', sortOrder: 1 };
    const mailCat: Category = { id: 'cat2', name: 'Communication', slug: 'communication', sortOrder: 2 };
    const agents: Agent[] = [
      makeAgent({
        slug: 'pg-official',
        providerName: 'Acme',
        categories: [dbCat],
        accessMethods: ['mcp', 'api'],
        authType: 'oauth2',
        official: true,
        officialVendor: { slug: 'acme', name: 'Acme' },
        verified: true,
        mcpEndpoint: 'https://mcp.acme.dev/mcp',
        apiBaseUrl: 'https://api.acme.dev/v1',
        updatedAt: '2026-11-28',
      }),
      makeAgent({
        slug: 'pg-cli',
        providerName: 'Beta',
        categories: [dbCat],
        accessMethods: ['mcp', 'cli'],
        authType: 'none',
        official: false,
        verified: true,
        mcpCommand: 'npx -y pg-cli-mcp',
        install: { type: 'npm', command: 'npm i -g pg-cli' },
        updatedAt: '2026-11-20',
      }),
      makeAgent({
        slug: 'mail-api',
        providerName: 'Acme',
        categories: [mailCat],
        accessMethods: ['api'],
        authType: 'apiKey',
        official: false,
        verified: false,
        skills: [],
        tags: ['email'],
        createdAt: '2026-11-01',
      }),
    ];
    const tasks: Task[] = [
      {
        slug: 'query-a-database',
        label: 'Query a database',
        blurb: 'Run SQL queries',
        keywords: ['postgres', 'sql', 'database'],
        categories: ['databases'],
        access: ['mcp'],
      },
    ];
    const stacks: Stack[] = [];

    const stats = computeDirectoryStats(agents, [dbCat, mailCat], tasks, stacks);
    expect(stats.total).toBe(3);
    expect(stats.official).toBe(1);
    expect(stats.officialPct).toBe(33.3);
    expect(stats.officialVendors).toBe(1);
    expect(stats.verified).toBe(2);
    expect(stats.verifiedPct).toBe(66.7);
    expect(stats.uniqueProviders).toBe(2);
    expect(stats.totalSkills).toBe(2);
    expect(stats.latestUpdatedAt).toBe('2026-11-28');

    expect(stats.configCoverage).toEqual({
      mcpTotal: 2,
      mcpWithConfig: 2,
      mcpWithConfigPct: 100,
      mcpHosted: 1,
      mcpLocalCommand: 1,
      officialMcpTotal: 1,
      officialMcpWithConfig: 1,
      officialMcpWithConfigPct: 100,
      cliTotal: 1,
      cliWithInstall: 1,
      cliWithInstallPct: 100,
      apiTotal: 2,
      apiWithBaseUrl: 1,
      apiWithBaseUrlPct: 50,
    });

    expect(stats.categories[0]).toEqual({ slug: 'databases', name: 'Databases', count: 2, official: 1 });
    expect(stats.topTasks[0]).toMatchObject({ slug: 'query-a-database', count: 2, official: 1 });
    expect(pct(0, 0)).toBe(0);
  });

  it('computes coherent live metrics over the real checked-in catalog', async () => {
    const [agents, categories] = await Promise.all([getOrganicAgents(), getAllCategories()]);
    const tasks = getTasks();
    const stacks = getStacks();
    const stats = computeDirectoryStats(agents, categories, tasks, stacks);

    expect(stats.total).toBeGreaterThan(1000);
    expect(stats.official).toBeGreaterThan(400);
    expect(stats.verified).toBeGreaterThan(1000);
    expect(stats.categoriesCount).toBe(categories.length);
    expect(stats.tasksCount).toBe(tasks.length);
    expect(stats.stacksCount).toBe(stacks.length);
    expect(stats.topTasks).toHaveLength(15);
    expect(stats.configCoverage.mcpWithConfig).toBeLessThanOrEqual(stats.configCoverage.mcpTotal);
    expect(stats.configCoverage.officialMcpWithConfig).toBeLessThanOrEqual(
      stats.configCoverage.officialMcpTotal
    );
    expect(stats.latestUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
