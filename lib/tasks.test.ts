import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import type { Stack } from './stacks';
import {
  getTask,
  getTasks,
  relatedStacks,
  relatedTasks,
  TASK_MIN_LISTINGS,
  taskExplanation,
  taskProblems,
  taskTitle,
  WHY_MAX,
  whyItFits,
  type Task,
} from './tasks';
import type { Agent, AgentSkill, Category } from './types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'id-' + Math.random().toString(36).slice(2),
    name: 'Test Agent',
    slug: 'test-agent',
    description: 'A test agent for unit tests.',
    providerName: 'TestCo',
    providerUrl: 'https://test.co',
    agentUrl: 'https://test.co/agent',
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
    accessMethods: [],
    ...overrides,
  };
}

function task(slug: string, keywords: string[], overrides: Partial<Task> = {}): Task {
  return { slug, label: slug.replace(/-/g, ' '), blurb: `${slug} blurb`, keywords, categories: ['data'], access: ['mcp'], ...overrides };
}

const data: Category = { id: 'c1', name: 'Data', slug: 'data', description: '', sortOrder: 1 };
const mail: Category = { id: 'c2', name: 'Mail', slug: 'mail', description: '', sortOrder: 2 };

describe('taskTitle', () => {
  it('reads the label as the job', () => {
    expect(taskTitle({ label: 'query a database' })).toBe('I need to query a database');
  });
});

describe('whyItFits', () => {
  const db = task('query-a-database', ['database', 'sql']);
  const skill = (name: string, description: string): AgentSkill => ({ id: name, name, description });

  it('quotes the skill that mentions the most keywords, a mention in its name counting double', () => {
    const agent = makeAgent({
      skills: [
        skill('Run queries', 'Runs SQL on a database.'),
        skill('Database admin', 'Creates tables.'),
        skill('SQL console', 'Opens a database console.'),
        skill('Send email', 'Sends email.'),
      ],
    });
    expect(whyItFits(agent, db)).toBe('SQL console: Opens a database console.');
  });

  it('keeps the first of equally good skills', () => {
    const agent = makeAgent({ skills: [skill('Database admin', 'Creates tables.'), skill('Run queries', 'Runs SQL on a database.')] });
    expect(whyItFits(agent, db)).toBe('Database admin: Creates tables.');
  });

  it('shows the description alone when the skill is named with its opening', () => {
    const agent = makeAgent({ skills: [skill('Query a database', 'Query a database in plain English.')] });
    expect(whyItFits(agent, db)).toBe('Query a database in plain English.');
  });

  it('is null when no usable skill mentions a keyword', () => {
    expect(whyItFits(makeAgent({ skills: [skill('Send email', 'Sends email.')] }), db)).toBeNull();
    expect(whyItFits(makeAgent({ skills: [skill('Database', '')] }), db)).toBeNull();
    expect(whyItFits(makeAgent({ skills: ['database' as unknown as AgentSkill] }), db)).toBeNull();
  });

  it(`fits in ${WHY_MAX} characters`, () => {
    const why = whyItFits(makeAgent({ skills: [skill('Database', 'Reads and writes database rows. '.repeat(10))] }), db);
    expect(why!.length).toBeLessThanOrEqual(WHY_MAX);
    expect(why).toMatch(/^Database: Reads and writes database rows\..*…$/);
  });
});

describe('taskExplanation', () => {
  it('says in words how the listings are picked', () => {
    const names: Record<string, string> = { data: 'Data & Analytics', infrastructure: 'Infrastructure' };
    const t = task('q', ['database', 'sql', 'postgres'], { categories: ['data', 'infrastructure'], access: ['mcp', 'browser-extension'] });
    expect(taskExplanation(t, (slug) => names[slug])).toBe(
      'Picked from listings that mention database, sql or postgres in their name, description, tags or skills; ' +
        'those in Data & Analytics or Infrastructure, or with MCP or browser extension access, rank higher.'
    );
  });
});

describe('relatedTasks', () => {
  const catalog = [
    makeAgent({ slug: 'pg-1', name: 'Postgres Database', categories: [data] }),
    makeAgent({ slug: 'pg-2', name: 'Postgres Database Two', categories: [data] }),
    makeAgent({ slug: 'mailer', name: 'Email Sender', categories: [mail] }),
    makeAgent({ slug: 'mailer-2', name: 'Email Robot', categories: [mail] }),
  ];
  const db = task('db', ['database']);
  const tasks = [
    db,
    task('email', ['email'], { categories: ['mail'] }),
    task('one-in-common', ['two'], { categories: ['data', 'mail'] }),
    task('warehouse', ['warehouse']),
    task('postgres', ['postgres']),
  ];

  it('puts tasks with the same listings first, then tasks in the same categories, and leaves out the rest', () => {
    expect(relatedTasks(db, tasks, catalog).map((t) => t.slug)).toEqual(['postgres', 'warehouse', 'one-in-common']);
    expect(relatedTasks(db, tasks, catalog, 1).map((t) => t.slug)).toEqual(['postgres']);
  });
});

describe('relatedStacks', () => {
  const stack = (slug: string, items: string[]): Stack => ({
    slug,
    title: slug,
    promise: '',
    items: items.map((s) => ({ slug: s, why: '' })),
  });
  const fits = [makeAgent({ slug: 'a' }), makeAgent({ slug: 'b' })];
  const stacks = [stack('one', ['a', 'x']), stack('two', ['b', 'y', 'a']), stack('none', ['y'])];

  it("lists stacks with the task's listings, most of them first, each in the stack's order", () => {
    expect(relatedStacks(fits, stacks).map(({ stack, shared }) => [stack.slug, shared.map((a) => a.slug)])).toEqual([
      ['two', ['b', 'a']],
      ['one', ['a']],
    ]);
    expect(relatedStacks(fits, stacks, 1).map((s) => s.stack.slug)).toEqual(['two']);
  });
});

describe('taskProblems', () => {
  const published = ['A', 'B', 'C'].map((x) => makeAgent({ slug: x.toLowerCase(), name: `Database ${x}`, categories: [data] }));

  it('accepts a task that fits enough listings', () => {
    expect(taskProblems([task('db', ['database'])], published)).toEqual([]);
  });

  it('rejects a repeated slug or label', () => {
    expect(taskProblems([task('db', ['database']), task('db', ['database'], { label: 'use a db' })], published)).toEqual([
      'duplicate task slug "db"',
    ]);
    expect(taskProblems([task('db', ['database']), task('db-2', ['database'], { label: 'DB' })], published)).toEqual([
      'db-2: another task is labelled "DB"',
    ]);
  });

  it('rejects a keyword, category or access method listed twice', () => {
    expect(
      taskProblems([task('db', ['database', 'Database'], { categories: ['data', 'data'], access: ['mcp', 'mcp'] })], published)
    ).toEqual([
      'db: keyword "Database" is listed twice',
      'db: category "data" is listed twice',
      'db: access method "mcp" is listed twice',
    ]);
  });

  it('rejects a keyword no listing mentions, and a task that fits too few listings', () => {
    expect(taskProblems([task('db', ['database', 'zebra'])], published)).toEqual(['db: no published listing mentions "zebra"']);
    expect(taskProblems([task('db', ['database'])], published.slice(0, 2))).toEqual([
      `db: fits 2 published listing(s); a task needs at least ${TASK_MIN_LISTINGS}, or is cut`,
    ]);
  });
});

describe('content/tasks.json', () => {
  it('has no problems against the catalog', async () => {
    expect(taskProblems(getTasks(), await getEveryAgent())).toEqual([]);
  });

  it('finds every task by its slug', () => {
    for (const t of getTasks()) expect(getTask(t.slug)).toEqual(t);
    expect(getTask('no-such-task')).toBeNull();
  });

  it('gives every task at least one related task', async () => {
    const catalog = await getEveryAgent();
    const tasks = getTasks();
    for (const t of tasks) expect(relatedTasks(t, tasks, catalog).length, t.slug).toBeGreaterThan(0);
  });
});
