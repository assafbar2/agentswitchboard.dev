/**
 * Task pages and the Operator rank organically, as the MCP server and
 * recommend do: a featured or sponsored listing never moves up a task's list
 * or into an Operator stack, even on a tie. /advertise promises that
 * sponsorship never changes tasks or the Operator.
 *
 * Every content/agents/*.json read is intercepted: in "placed" mode every
 * other listing is featured, sponsored, labeled and premium. Each surface
 * must rank exactly as it does with no placement at all.
 */
import * as fs from 'fs';
import * as path from 'path';
import { afterAll, describe, expect, it, vi } from 'vitest';

const placement = vi.hoisted(() => ({ on: false }));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const AGENT_FILE = /[\\/]content[\\/]agents[\\/]([^\\/]+)\.json$/;
  let parity = 0;
  const flagged = new Map<string, boolean>();
  const readFile = (async (file: unknown, ...rest: unknown[]) => {
    const raw = await (actual.promises.readFile as (...a: unknown[]) => Promise<string>)(file, ...rest);
    const match = typeof file === 'string' ? AGENT_FILE.exec(file) : null;
    if (!placement.on || !match) return raw;
    if (!flagged.has(match[1])) flagged.set(match[1], parity++ % 2 === 0);
    if (!flagged.get(match[1])) return raw;
    return JSON.stringify({
      ...JSON.parse(raw),
      featured: true,
      featuredUntil: '2999-01-01',
      sponsored: true,
      sponsorLabel: 'Sponsored',
      tier: 'premium',
    });
  }) as typeof actual.promises.readFile;
  const promises = { ...actual.promises, readFile };
  return { ...actual, promises, default: { ...actual, promises } };
});

const { getEveryAgent, getOrganicAgents } = await import('@/lib/catalog');
const { taskMatches } = await import('@/lib/search');
const { getTasks } = await import('@/lib/tasks');
const { putThrough } = await import('@/lib/operator');
const { OPERATOR_EXAMPLES } = await import('@/lib/request-parts');
const tasksRoute = await import('@/app/api/tasks/route');
const taskRoute = await import('@/app/api/tasks/[slug]/route');

afterAll(() => {
  placement.on = false;
});

async function both<T>(read: () => Promise<T>): Promise<{ organic: T; placed: T }> {
  placement.on = false;
  const organic = await read();
  placement.on = true;
  const placed = await read();
  placement.on = false;
  return { organic, placed };
}

const slugs = (agents: { slug: string }[]) => agents.map((a) => a.slug);
const REQUESTS = [...OPERATOR_EXAMPLES, 'query a database', 'send email and automate a browser', 'a Postgres MCP'];

describe('task pages and the Operator rank organically', () => {
  it('the placed catalog really moves some task listing up when ranked from the featured-first order', async () => {
    const { organic, placed } = await both(async () => {
      const catalog = await getEveryAgent();
      return getTasks().map((t) => slugs(taskMatches(catalog, t)));
    });
    expect(placed).not.toEqual(organic);
  });

  it('every task lists its fits in the same order whatever is placed', async () => {
    const { organic, placed } = await both(async () => {
      const catalog = await getOrganicAgents();
      return getTasks().map((t) => slugs(taskMatches(catalog, t)));
    });
    expect(placed).toEqual(organic);
  });

  it('the Operator puts every request through to the same picks whatever is placed', async () => {
    const { organic, placed } = await both(async () => {
      const [catalog, tasks] = [await getOrganicAgents(), getTasks()];
      return REQUESTS.map((r) => {
        const { parts, stack } = putThrough(r, tasks, catalog);
        return { stack: slugs(stack), parts: parts.map((p) => [p.pick?.slug, ...slugs(p.alternatives)]) };
      });
    });
    expect(placed).toEqual(organic);
  });

  it('GET /api/tasks and /api/tasks/<slug> answer the same whatever is placed', async () => {
    const slug = getTasks()[0].slug;
    const { organic, placed } = await both(async () => {
      const list = await (await tasksRoute.GET(new Request('http://localhost/api/tasks'))).json();
      const one = await (
        await taskRoute.GET(new Request(`http://localhost/api/tasks/${slug}`), { params: Promise.resolve({ slug }) })
      ).json();
      return { list, one: { ...one, agents: slugs(one.agents) } };
    });
    expect(placed).toEqual(organic);
  });

  it('the task pages, the Operator and their cards read the organic catalog', () => {
    const files = [
      'app/tasks/page.tsx',
      'app/tasks/[slug]/page.tsx',
      'app/tasks/card.png/route.ts',
      'app/tasks/[slug]/card.png/route.ts',
      'app/operator/page.tsx',
      'app/operator/card.png/route.ts',
      'app/api/tasks/route.ts',
      'app/api/tasks/[slug]/route.ts',
    ];
    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source, file).toMatch(/getOrganicAgents\(\)/);
      expect(source, file).not.toMatch(/getEveryAgent/);
    }
  });
});
