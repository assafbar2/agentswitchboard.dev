import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import { OPERATOR_ALTERNATIVES, putThrough } from './operator';
import { OPERATOR_EXAMPLES } from './request-parts';
import { getTasks, type Task } from './tasks';
import type { Agent, Category } from './types';

const EMAIL: Category = { id: 'email', name: 'Email', slug: 'email', sortOrder: 1 };
const DATABASES: Category = { id: 'databases', name: 'Databases', slug: 'databases', sortOrder: 2 };

const mail: Task = {
  slug: 'send-and-read-email',
  label: 'send and read email',
  blurb: 'Tools that send and read email.',
  categories: ['email'],
  access: ['mcp', 'api', 'cli'],
  keywords: ['email', 'inbox'],
};
const db: Task = {
  slug: 'query-a-database',
  label: 'query a database',
  blurb: 'Tools that query databases.',
  categories: ['databases'],
  access: ['mcp', 'api', 'cli'],
  keywords: ['database', 'sql'],
};
const kites: Task = {
  slug: 'fly-a-kite',
  label: 'fly a kite',
  blurb: 'Nothing in the tests flies one.',
  categories: ['kites'],
  access: [],
  keywords: ['kite'],
};
const tasks = [mail, db, kites];

/** A listing that fits the email task, unless `overrides` say otherwise. */
function listing(slug: string, description = 'Sends email for agents.', overrides: Partial<Agent> = {}): Agent {
  const name = slug.replace(/(^|-)(\w)/g, (_, sep: string, c: string) => `${sep ? ' ' : ''}${c.toUpperCase()}`);
  return {
    id: slug,
    name,
    slug,
    description,
    providerName: 'Example Inc',
    providerUrl: 'https://example.com',
    agentUrl: `https://example.com/${slug}`,
    categories: [EMAIL],
    tags: [],
    skills: [],
    authType: 'apiKey',
    supportsStreaming: false,
    supportsPushNotifications: false,
    status: 'published',
    featured: false,
    verified: false,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['mcp'],
    ...overrides,
  };
}

const slugs = (agents: (Agent | null)[]) => agents.map((a) => a?.slug ?? null);

function onePart(request: string, catalog: Agent[]) {
  const { parts } = putThrough(request, tasks, catalog);
  expect(parts, request).toHaveLength(1);
  const [part] = parts;
  return { ...part, pick: part.pick?.slug ?? null, alternatives: slugs(part.alternatives) };
}

describe('putThrough', () => {
  it("picks the fit that mentions what the part names, in its name before its description before its tags", () => {
    const catalog = [
      listing('plain-mailer'),
      listing('tagged-mailer', undefined, { tags: ['gmail'] }),
      listing('described-mailer', 'Sends email through Gmail.'),
      listing('gmail-sender'),
      listing('second-mailer'),
      listing('third-mailer'),
    ];
    expect(onePart('send email with Gmail', catalog)).toMatchObject({
      task: mail,
      fits: 6,
      pick: 'gmail-sender',
      alternatives: ['described-mailer', 'tagged-mailer'],
      named: ['Gmail'],
      unmet: [],
    });
  });

  it('names the words typed next to each other as one', () => {
    const catalog = [listing('plain-mailer'), listing('workspace-mailer', 'Sends email from Google Workspace.'), listing('other-mailer')];
    expect(onePart('send email from Google Workspace', catalog)).toMatchObject({ pick: 'workspace-mailer', named: ['Google Workspace'] });
  });

  it('counts a word most fits mention only where few of them do', () => {
    const catalog = [
      ...['one', 'two', 'three', 'four'].map((n) => listing(`${n}-mailer`, 'Sends email about GitHub issues.')),
      listing('plain-mailer'),
      listing('github-mailer'),
    ];
    expect(onePart('send email about GitHub', catalog)).toMatchObject({
      pick: 'github-mailer',
      alternatives: ['one-mailer', 'two-mailer'],
      named: ['GitHub'],
    });
  });

  it("keeps the task's order when nothing tells the fits apart, Official or not", () => {
    const catalog = [listing('first-mailer'), listing('official-mailer', undefined, { official: true }), listing('last-mailer')];
    for (const request of ['send and read email', 'send email to my team']) {
      expect(onePart(request, catalog), request).toMatchObject({
        pick: 'first-mailer',
        alternatives: ['official-mailer', 'last-mailer'].slice(0, OPERATOR_ALTERNATIVES),
        named: [],
      });
    }
  });

  it('puts Official fits first among those that mention as much', () => {
    const catalog = [
      listing('outlook-helper', 'Sends email from Outlook.'),
      listing('outlook-official', 'Sends email from Outlook.', { official: true }),
      listing('plain-mailer'),
      listing('other-mailer'),
    ];
    expect(onePart('send email from Outlook', catalog)).toMatchObject({
      pick: 'outlook-official',
      alternatives: ['outlook-helper', 'plain-mailer'],
    });
  });

  it("never ranks by what to do or by the words of the task's label", () => {
    const mailers = [listing('plain-mailer'), listing('send-reader', 'Reads and sends email.')];
    expect(onePart('read and send email', mailers).pick).toBe('plain-mailer');
    const databases = ['plain-db', 'query-runner'].map((slug) =>
      listing(slug, 'Runs SQL against a database.', { categories: [DATABASES] })
    );
    expect(onePart('query a database', databases).pick).toBe('plain-db');
  });

  it('narrows the pick to the access method or Official the part asks for', () => {
    const catalog = [
      listing('mcp-mailer'),
      listing('cli-mailer', undefined, { accessMethods: ['cli'] }),
      listing('api-mailer', undefined, { accessMethods: ['api'], official: true }),
      listing('other-mcp-mailer'),
    ];
    expect(onePart('send email with a CLI', catalog)).toMatchObject({ pick: 'cli-mailer', alternatives: [], unmet: [] });
    expect(onePart('send email with an API', catalog)).toMatchObject({ pick: 'api-mailer', unmet: [] });
    expect(onePart('an official way to send email', catalog)).toMatchObject({ pick: 'api-mailer', unmet: [] });
    expect(onePart('send email with an MCP', catalog)).toMatchObject({ pick: 'mcp-mailer', alternatives: ['other-mcp-mailer'] });
  });

  it('says what it asked for that no fit has, and picks without it', () => {
    const catalog = [listing('mcp-mailer'), listing('api-mailer', undefined, { accessMethods: ['api'] })];
    expect(onePart('send email with a browser extension', catalog)).toMatchObject({
      pick: 'mcp-mailer',
      alternatives: ['api-mailer'],
      unmet: ['No tool for this task has a browser extension.'],
    });
    expect(onePart('the official email MCP', catalog)).toMatchObject({
      pick: 'mcp-mailer',
      unmet: ['No tool for this task is Official as well.'],
    });
  });

  it('narrows among the fits that mention what the part names', () => {
    const catalog = [
      listing('plain-mailer'),
      listing('cli-mailer', undefined, { accessMethods: ['cli'] }),
      listing('gmail-mcp'),
      listing('gmail-cli', undefined, { accessMethods: ['cli'] }),
      listing('other-mailer'),
    ];
    expect(onePart('send email with Gmail from a CLI', catalog)).toMatchObject({ pick: 'gmail-cli', named: ['Gmail'], unmet: [] });
    const noCli = catalog.filter((a) => a.slug !== 'gmail-cli');
    expect(onePart('send email with Gmail from a CLI', noCli)).toMatchObject({
      pick: 'gmail-mcp',
      unmet: ['No tool for this task has a CLI as well.'],
    });
  });

  it('tells why the pick fits from its skills', () => {
    const skill = { id: 'send', name: 'Send Email', description: 'Sends a message from the connected inbox.' };
    expect(onePart('send email', [listing('skilled-mailer', undefined, { skills: [skill] })]).why).toBe(
      'Send Email: Sends a message from the connected inbox.'
    );
    expect(onePart('send email', [listing('plain-mailer')]).why).toBeNull();
  });

  it('puts a part without a task, or a task without fits, through to nothing', () => {
    const catalog = [listing('plain-mailer')];
    const nothing = { fits: 0, pick: null, alternatives: [], named: [], unmet: [], why: null };
    expect(putThrough('I want a pizza', tasks, catalog)).toEqual({
      request: 'I want a pizza',
      parts: [{ text: 'I want a pizza', task: null, nearest: [], ...nothing }],
      stack: [],
      extra: 0,
      cut: false,
    });
    expect(onePart('fly a kite', catalog)).toMatchObject({ task: kites, ...nothing });
  });

  it('stacks each pick once, in the order of the parts', () => {
    const combo = listing('combo', 'Sends email and runs SQL on a database.', { categories: [EMAIL, DATABASES] });
    const catalog = [listing('plain-mailer'), listing('gmail-sender'), combo];
    const once = putThrough('query a database, send email with Combo', tasks, catalog);
    expect(once.parts.map((p) => [p.task?.slug, p.pick?.slug])).toEqual([
      ['query-a-database', 'combo'],
      ['send-and-read-email', 'combo'],
    ]);
    expect(slugs(once.stack)).toEqual(['combo']);
    expect(slugs(putThrough('send email with Gmail, query a database', tasks, catalog).stack)).toEqual(['gmail-sender', 'combo']);
  });
});

describe('putThrough, against the directory', () => {
  it('puts each example request through to a tool for each part, one that mentions the product it names', async () => {
    const catalog = await getEveryAgent();
    const products: Record<string, (string | null)[]> = {
      'read my Notion, file Linear tickets, ping me on Slack': ['Notion', 'Linear', 'Slack'],
      'query Postgres and send email': ['Postgres', null],
      'monitor errors with Sentry and open Jira tickets': ['Sentry', 'Jira'],
      'review my pull requests, deploy to Vercel': ['pull requests', 'Vercel'],
    };
    expect(Object.keys(products)).toEqual(OPERATOR_EXAMPLES);
    for (const [example, named] of Object.entries(products)) {
      const { parts, stack } = putThrough(example, getTasks(), catalog);
      expect(parts, example).toHaveLength(named.length);
      parts.forEach((part, i) => {
        expect(part.pick && part.fits > 1, part.text).toBe(true);
        if (named[i]) expect(part.named, part.text).toContain(named[i]);
      });
      expect(stack, example).toHaveLength(parts.length);
    }
  });

  it('gives the same request the same stack, whatever its case and spacing', async () => {
    const catalog = await getEveryAgent();
    for (const example of OPERATOR_EXAMPLES) {
      const first = putThrough(example, getTasks(), catalog);
      const again = putThrough(` ${example.toUpperCase()} `, getTasks(), [...catalog]);
      expect(slugs(again.stack), example).toEqual(slugs(first.stack));
      expect(again.parts.map((p) => slugs([p.pick, ...p.alternatives])), example).toEqual(
        first.parts.map((p) => slugs([p.pick, ...p.alternatives]))
      );
    }
  });
});
