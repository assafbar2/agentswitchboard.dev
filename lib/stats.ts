import { taskMatches } from './search';
import type { Stack } from './stacks';
import type { Task } from './tasks';
import type { Agent, Category } from './types';
import { authTypeLabel } from './utils';

export interface MetricCount {
  key: string;
  label: string;
  count: number;
  pct: number;
}

export interface ConfigCoverage {
  mcpTotal: number;
  mcpWithConfig: number;
  mcpWithConfigPct: number;
  mcpHosted: number;
  mcpLocalCommand: number;
  officialMcpTotal: number;
  officialMcpWithConfig: number;
  officialMcpWithConfigPct: number;
  cliTotal: number;
  cliWithInstall: number;
  cliWithInstallPct: number;
  apiTotal: number;
  apiWithBaseUrl: number;
  apiWithBaseUrlPct: number;
}

export interface CategoryStat {
  slug: string;
  name: string;
  count: number;
  official: number;
}

export interface TaskStat {
  slug: string;
  label: string;
  count: number;
  official: number;
}

export interface DirectoryStats {
  total: number;
  official: number;
  officialPct: number;
  officialVendors: number;
  verified: number;
  verifiedPct: number;
  totalSkills: number;
  uniqueProviders: number;
  categoriesCount: number;
  tasksCount: number;
  stacksCount: number;
  latestUpdatedAt: string | null;
  accessMethods: MetricCount[];
  authTypes: MetricCount[];
  configCoverage: ConfigCoverage;
  categories: CategoryStat[];
  topTasks: TaskStat[];
}

const ACCESS_LABELS: Record<Agent['accessMethods'][number], string> = {
  mcp: 'MCP',
  api: 'API',
  cli: 'CLI',
  'browser-extension': 'Browser / IDE extension',
};

const ACCESS_ORDER: readonly Agent['accessMethods'][number][] = ['api', 'mcp', 'cli', 'browser-extension'];
const AUTH_ORDER: readonly Agent['authType'][] = ['apiKey', 'none', 'oauth2', 'bearer'];

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function computeDirectoryStats(
  agents: Agent[],
  categories: readonly Category[],
  tasks: readonly Task[],
  stacks: readonly Stack[],
  topTasksLimit = 15
): DirectoryStats {
  const total = agents.length;
  const official = agents.filter((a) => a.official).length;
  const verified = agents.filter((a) => a.verified).length;
  const officialVendors = new Set(agents.flatMap((a) => (a.officialVendor ? [a.officialVendor.slug] : []))).size;
  const totalSkills = agents.reduce((sum, a) => sum + a.skills.length, 0);
  const uniqueProviders = new Set(agents.map((a) => a.providerName)).size;

  const dates = agents
    .map((a) => a.updatedAt ?? a.createdAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const latestUpdatedAt = dates.length > 0 ? dates[dates.length - 1].slice(0, 10) : null;

  const accessCounts = new Map<string, number>();
  const authCounts = new Map<string, number>();
  for (const agent of agents) {
    for (const method of agent.accessMethods) {
      accessCounts.set(method, (accessCounts.get(method) ?? 0) + 1);
    }
    authCounts.set(agent.authType, (authCounts.get(agent.authType) ?? 0) + 1);
  }

  const accessMethods: MetricCount[] = ACCESS_ORDER.map((key) => {
    const count = accessCounts.get(key) ?? 0;
    return { key, label: ACCESS_LABELS[key], count, pct: pct(count, total) };
  }).sort((a, b) => b.count - a.count);

  const authTypes: MetricCount[] = AUTH_ORDER.map((key) => {
    const count = authCounts.get(key) ?? 0;
    return { key, label: authTypeLabel(key), count, pct: pct(count, total) };
  }).sort((a, b) => b.count - a.count);

  const mcpAgents = agents.filter((a) => a.accessMethods.includes('mcp'));
  const mcpHosted = mcpAgents.filter((a) => Boolean(a.mcpEndpoint)).length;
  const mcpLocalCommand = mcpAgents.filter((a) => Boolean(a.mcpCommand)).length;
  const mcpWithConfig = mcpAgents.filter((a) => Boolean(a.mcpEndpoint || a.mcpCommand)).length;

  const officialMcpAgents = mcpAgents.filter((a) => a.official);
  const officialMcpWithConfig = officialMcpAgents.filter((a) => Boolean(a.mcpEndpoint || a.mcpCommand)).length;

  const cliAgents = agents.filter((a) => a.accessMethods.includes('cli'));
  const cliWithInstall = cliAgents.filter((a) => Boolean(a.install)).length;

  const apiAgents = agents.filter((a) => a.accessMethods.includes('api'));
  const apiWithBaseUrl = apiAgents.filter((a) => Boolean(a.apiBaseUrl)).length;

  const configCoverage: ConfigCoverage = {
    mcpTotal: mcpAgents.length,
    mcpWithConfig,
    mcpWithConfigPct: pct(mcpWithConfig, mcpAgents.length),
    mcpHosted,
    mcpLocalCommand,
    officialMcpTotal: officialMcpAgents.length,
    officialMcpWithConfig,
    officialMcpWithConfigPct: pct(officialMcpWithConfig, officialMcpAgents.length),
    cliTotal: cliAgents.length,
    cliWithInstall,
    cliWithInstallPct: pct(cliWithInstall, cliAgents.length),
    apiTotal: apiAgents.length,
    apiWithBaseUrl,
    apiWithBaseUrlPct: pct(apiWithBaseUrl, apiAgents.length),
  };

  const catTotals = new Map<string, { count: number; official: number }>();
  for (const agent of agents) {
    for (const cat of agent.categories) {
      const cur = catTotals.get(cat.slug) ?? { count: 0, official: 0 };
      cur.count += 1;
      if (agent.official) cur.official += 1;
      catTotals.set(cat.slug, cur);
    }
  }

  const categoryStats: CategoryStat[] = categories
    .map((cat) => {
      const counts = catTotals.get(cat.slug) ?? { count: 0, official: 0 };
      return {
        slug: cat.slug,
        name: cat.name,
        count: counts.count,
        official: counts.official,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const topTasks: TaskStat[] = tasks
    .map((task) => {
      const fits = taskMatches(agents, task);
      return {
        slug: task.slug,
        label: task.label,
        count: fits.length,
        official: fits.filter((a) => a.official).length,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, topTasksLimit);

  return {
    total,
    official,
    officialPct: pct(official, total),
    officialVendors,
    verified,
    verifiedPct: pct(verified, total),
    totalSkills,
    uniqueProviders,
    categoriesCount: categories.length,
    tasksCount: tasks.length,
    stacksCount: stacks.length,
    latestUpdatedAt,
    accessMethods,
    authTypes,
    configCoverage,
    categories: categoryStats,
    topTasks,
  };
}
