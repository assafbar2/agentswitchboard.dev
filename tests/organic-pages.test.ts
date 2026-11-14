/**
 * The task endpoints (GET /api/tasks, /api/agents?task=, /api/recommend) and
 * the Operator rank organically, as the MCP server does: a featured or
 * sponsored listing never moves up a task's list or into a stack, even on a
 * tie. The website's task answers (the homepage box, task pages and
 * /browse?task=) layer lib/promoted.ts on top: the task's promoted fits
 * first, labeled, then exactly the organic order.
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
const { browseMatches, taskMatches } = await import('@/lib/search');
const { promotion, promotedFirst } = await import('@/lib/promoted');
const { recommendDecision } = await import('@/lib/decide');
const { taskAnswer } = await import('@/lib/task-answers');
const { getTasks } = await import('@/lib/tasks');
const { putThrough } = await import('@/lib/operator');
const { OPERATOR_EXAMPLES } = await import('@/lib/request-parts');
const tasksRoute = await import('@/app/api/tasks/route');
const taskRoute = await import('@/app/api/tasks/[slug]/route');
const agentsRoute = await import('@/app/api/agents/route');
const recommendRoute = await import('@/app/api/recommend/route');
const homeAnswerRoute = await import('@/app/home/answer/route');

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

describe('the task endpoints and the Operator rank organically', () => {
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

  it('GET /api/agents?task= lists as GET /api/tasks/<slug> does, whatever is placed', async () => {
    const slug = getTasks()[0].slug;
    const { organic, placed } = await both(async () => {
      const search = await (await agentsRoute.GET(new Request(`http://localhost/api/agents?task=${slug}&limit=50`))).json();
      return slugs(search.agents);
    });
    expect(placed).toEqual(organic);
    const one = await (
      await taskRoute.GET(new Request(`http://localhost/api/tasks/${slug}`), { params: Promise.resolve({ slug }) })
    ).json();
    expect(organic).toEqual(slugs(one.agents).slice(0, 50));
  });

  it('GET /api/recommend answers the same whatever is placed, with no placement field', async () => {
    const { organic, placed } = await both(async () => {
      const body = await (await recommendRoute.GET(new Request('http://localhost/api/recommend?need=I+need+an+agent+first+mailbox'))).json();
      return body;
    });
    expect(placed).toEqual(organic);
    expect(JSON.stringify(placed)).not.toMatch(/"(placements|featured|sponsored)"/);
  });

  it('the task endpoints, the Operator and the share cards read the organic catalog', () => {
    const files = [
      'app/tasks/page.tsx',
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

const placedState = (task: ReturnType<typeof getTasks>[number]) => ({
  query: '',
  task,
  category: '',
  official: false,
  vendor: '',
  verified: false,
  auth: [],
  access: [],
});

/** True when every listing `label` marks comes before every one it does not. */
const promotedLead = <T>(list: T[], label: (a: T) => unknown) => {
  const firstPlain = list.findIndex((a) => !label(a));
  return firstPlain === -1 || list.slice(firstPlain).every((a) => !label(a));
};

describe("the website's task answers put promoted fits first, labeled, then the organic order", () => {
  const DAY = '2026-11-14';

  it('/browse?task= lists promoted fits first, then exactly the order of GET /api/tasks/<slug>', async () => {
    placement.on = true;
    try {
      const [every, organicCatalog] = [await getEveryAgent(), await getOrganicAgents()];
      for (const task of getTasks()) {
        const shown = browseMatches(every, placedState(task), DAY);
        const organic = taskMatches(organicCatalog, task);
        expect(slugs(shown), task.slug).toEqual(slugs(promotedFirst(organic, DAY)));
        expect(promotedLead(shown, (a) => promotion(a, DAY)), task.slug).toBe(true);
        const plain = (list: typeof shown) => slugs(list.filter((a) => !promotion(a, DAY)));
        expect(plain(shown), task.slug).toEqual(plain(organic));
      }
    } finally {
      placement.on = false;
    }
  });

  it("a task page's answer names its promoted fits first, each with its label; the Markdown twin's stays organic", async () => {
    placement.on = true;
    try {
      const catalog = await getOrganicAgents();
      const task = getTasks()[0];
      const page = taskAnswer(task, catalog, DAY);
      expect(promotedLead(page.fits, (a) => promotion(a, DAY))).toBe(true);
      for (const a of page.names) if (promotion(a, DAY)) expect(page.lead).toContain(`${a.name} (${promotion(a, DAY)})`);
      expect(page.promoted).toBe(page.names.some((a) => promotion(a, DAY)));
      const twin = taskAnswer(task, catalog);
      expect(slugs(twin.fits)).toEqual(slugs(taskMatches(catalog, task)));
      expect(twin.lead).not.toMatch(/\((Featured|Sponsored)\)/);
    } finally {
      placement.on = false;
    }
  });

  it("the homepage box's answer picks a promoted fit first and labels every promoted listing it names", async () => {
    placement.on = true;
    try {
      const body = await (await homeAnswerRoute.GET(new Request('http://localhost/home/answer?need=send+and+read+email'))).json();
      const [r] = body.recommendations;
      expect(body.placements[r.pick.slug]).toMatch(/^(Featured|Sponsored)$/);
      expect(r.pickedBecause).toMatch(/^(Featured|Sponsored): /);
      const catalog = await getOrganicAgents();
      const bySlug = new Map(catalog.map((a) => [a.slug, a]));
      for (const a of [r.pick, ...r.alternatives]) {
        expect(body.placements[a.slug] ?? null, a.slug).toBe(promotion(bySlug.get(a.slug)!) ?? null);
      }
      const organic = recommendDecision('send and read email', getTasks(), catalog);
      expect(organic.ok && organic.body.placements).toBeUndefined();
    } finally {
      placement.on = false;
    }
  });
});
