import { describe, it, expect } from 'vitest';
import {
  buildSuggestIndex,
  isSuggestIndex,
  suggest,
  type AgentRow,
  type GroupRow,
  type SuggestIndex,
  type TaskRow,
} from './autocomplete';
import { groupOfficialAgents } from './official';
import type { Agent, Category } from './types';

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

/** An index of listings named `names`, none Official, without icons. */
function indexOf(names: string[], more: Partial<SuggestIndex> = {}): SuggestIndex {
  const agents = names.map((name): AgentRow => [name, name.toLowerCase().replace(/\W+/g, '-'), '', 0]);
  return { agents, categories: [], vendors: [], ...more };
}

const names = (index: SuggestIndex, query: string) => suggest(index, query).map((s) => s.name);

describe('buildSuggestIndex', () => {
  const data: Category = { id: 'd', name: 'Data & Analytics', slug: 'data-analytics', sortOrder: 1, agentCount: 2 };
  const empty: Category = { id: 'e', name: 'Empty', slug: 'empty', sortOrder: 2, agentCount: 0 };
  const agents = [
    makeAgent({
      name: 'Supabase',
      slug: 'supabase',
      official: true,
      officialVendor: { slug: 'supabase', name: 'Supabase' },
      iconUrl: '/icons/supabase.png?v=1a2b3c4d',
      categories: [data],
    }),
    makeAgent({ name: 'pgEdge', slug: 'pgedge', categories: [data] }),
  ];
  const index = buildSuggestIndex(agents, [data, empty], groupOfficialAgents(agents));

  it('keeps each listing as [name, slug, icon version, Official], in catalog order', () => {
    expect(index.agents).toEqual([
      ['Supabase', 'supabase', '1a2b3c4d', 1],
      ['pgEdge', 'pgedge', '', 0],
    ]);
  });

  it('keeps categories with listings and vendors with their Official listing counts', () => {
    expect(index.categories).toEqual([['Data & Analytics', 'data-analytics', 2]]);
    expect(index.vendors).toEqual([['Supabase', 'supabase', 1]]);
  });

  it('keeps each task as [label, slug, listings that fit it, keywords]', () => {
    const withTasks = buildSuggestIndex(agents, [data], [], [
      { label: 'query a database', slug: 'query-a-database', keywords: ['database', 'sql'], count: 2 },
    ]);
    expect(withTasks.tasks).toEqual([['query a database', 'query-a-database', 2, ['database', 'sql']]]);
  });

  it('recognizes its own shape and rejects others', () => {
    expect(isSuggestIndex(JSON.parse(JSON.stringify(index)))).toBe(true);
    expect(isSuggestIndex(null)).toBe(false);
    expect(isSuggestIndex({ agents: [] })).toBe(false);
    expect(isSuggestIndex({ agents: 'x', categories: [], vendors: [] })).toBe(false);
  });

  it('takes an index without tasks, as an older deploy wrote it, but not one with a malformed list', () => {
    expect(isSuggestIndex({ agents: [], categories: [], vendors: [] })).toBe(true);
    expect(isSuggestIndex({ agents: [], categories: [], vendors: [], tasks: 'x' })).toBe(false);
  });
});

describe('suggest: tasks', () => {
  const tasks: TaskRow[] = [
    ['query a database', 'query-a-database', 46, ['database', 'sql', 'postgres']],
    ['write and fix code', 'write-and-fix-code', 90, ['agentic coding', 'code editor']],
    ['review code', 'review-code', 30, ['code review', 'pr review']],
    ['build a voice agent', 'build-a-voice-agent', 40, ['voice agent', 'voice ai']],
    ['manage AWS, Azure or Google Cloud', 'manage-cloud-infrastructure', 20, ['aws', 'azure']],
  ];
  const index = indexOf(['Postgres MCP Pro'], { tasks, categories: [['Data & Analytics', 'data-analytics', 78]] });

  it('suggests the task a keyword belongs to, after the listings and before the categories', () => {
    expect(suggest(index, 'postgres')).toEqual([
      { kind: 'agent', name: 'Postgres MCP Pro', href: '/agents/postgres-mcp-pro', iconUrl: undefined },
      { kind: 'task', name: 'query a database', count: 46, href: '/browse?task=query-a-database', task: 'query-a-database' },
    ]);
    expect(suggest(index, 'data').map((s) => s.kind)).toEqual(['task', 'category']);
  });

  it('matches the label as names are matched, and words across the label and the keywords', () => {
    expect(names(index, 'query a database')).toEqual(['query a database']);
    expect(names(index, 'query a d')).toEqual(['query a database']);
    expect(names(index, 'query postgres')).toEqual(['query a database']);
  });

  it('suggests two tasks at most: the best match, then the one with the most listings', () => {
    expect(names(index, 'code')).toEqual(['write and fix code', 'review code']);
    expect(names(index, 'review code')).toEqual(['review code']);
  });

  it('waits for three letters, so "ai" alone suggests no task', () => {
    expect(names(index, 'ai')).toEqual([]);
    expect(names(index, 'aws')).toEqual(['manage AWS, Azure or Google Cloud']);
  });
});

describe('suggest', () => {
  it('needs two letters or digits', () => {
    const index = indexOf(['GitHub', 'C Tools']);
    for (const q of ['', 'g', ' g ', '!!', 'c+']) expect(suggest(index, q)).toEqual([]);
    expect(names(index, 'gi')).toEqual(['GitHub']);
  });

  it('puts the exact name first, then names starting with the query, word starts, run-together parts and the rest', () => {
    const index = indexOf(['Gmail Tools', 'AgentMail', 'Fast Mail Relay', 'Mailchimp MCP', 'Mail']);
    expect(names(index, 'mail')).toEqual(['Mail', 'Mailchimp MCP', 'Fast Mail Relay', 'AgentMail', 'Gmail Tools']);
  });

  it('ranks Official listings first among equal matches, then the shorter name', () => {
    const index = indexOf([], {
      agents: [
        ['Notion Tools', 'notion-tools', '', 0],
        ['Notion MCP Server', 'notion-mcp', '', 1],
        ['Notion Sync', 'notion-sync', '', 0],
      ],
    });
    expect(names(index, 'notion')).toEqual(['Notion MCP Server', 'Notion Sync', 'Notion Tools']);
  });

  it('matches fewer than 4 letters only at the start of a word or a capitalized part', () => {
    const index = indexOf(['GitHub', 'DigitalOcean', 'Legit', 'PaddleOCR', 'MCPJam']);
    expect(names(index, 'git')).toEqual(['GitHub']);
    expect(names(index, 'hub')).toEqual(['GitHub']);
    expect(names(index, 'ocr')).toEqual(['PaddleOCR']);
    expect(names(index, 'jam')).toEqual(['MCPJam']);
    expect(names(index, 'ocean')).toEqual(['DigitalOcean']);
  });

  it('needs every word, in any order, and ignores case', () => {
    const index = indexOf(['GitHub MCP Server', 'Slack']);
    expect(names(index, 'mcp github')).toEqual(['GitHub MCP Server']);
    expect(names(index, 'GITHUB')).toEqual(['GitHub MCP Server']);
    expect(names(index, 'github slack')).toEqual([]);
  });

  it('skips filler words unless they are all there is', () => {
    const index = indexOf(['GitHub MCP Server', 'Server Monitor']);
    expect(names(index, 'an mcp server for github')).toEqual(['GitHub MCP Server']);
    expect(names(index, 'server')).toEqual(['Server Monitor', 'GitHub MCP Server']);
  });

  it('treats punctuation as a word break, in names and queries', () => {
    const index = indexOf(['Cal.com', 'Calendly']);
    expect(names(index, 'cal.com')).toEqual(['Cal.com']);
    expect(names(index, 'cal com')).toEqual(['Cal.com']);
  });

  it('suggests listings, then categories, then vendors, each capped', () => {
    const many = Array.from({ length: 8 }, (_, i) => `Data Tool ${i + 1}`);
    const groups: GroupRow[] = [
      ['Data One', 'one', 1],
      ['Data Two', 'two', 2],
      ['Data Three', 'three', 3],
      ['Data Four', 'four', 4],
    ];
    const index = indexOf(many, { categories: groups, vendors: [['Databricks', 'databricks', 9]] });
    const kinds = suggest(index, 'data').map((s) => s.kind);
    expect(kinds).toEqual(['agent', 'agent', 'agent', 'agent', 'agent', 'category', 'category', 'category', 'vendor']);
  });

  it('lists the categories and vendors with the most listings first', () => {
    const index = indexOf([], {
      categories: [
        ['Data Small', 'small', 2],
        ['Data Big', 'big', 40],
      ],
      vendors: [
        ['Datadog', 'datadog', 3],
        ['Databricks', 'databricks', 5],
      ],
    });
    expect(names(index, 'data')).toEqual(['Data Big', 'Data Small', 'Databricks', 'Datadog']);
  });

  it('links a listing to its page and the rest to a filtered /browse', () => {
    const index: SuggestIndex = {
      agents: [
        ['Supabase', 'supabase', '1a2b3c4d', 1],
        ['Supabase Helper', 'supabase-helper', '', 0],
      ],
      categories: [['Supabase Tools', 'supa-tools', 4]],
      vendors: [['Supabase', 'supabase', 2]],
    };
    expect(suggest(index, 'supa')).toEqual([
      { kind: 'agent', name: 'Supabase', href: '/agents/supabase', iconUrl: '/icons/supabase.png?v=1a2b3c4d' },
      { kind: 'agent', name: 'Supabase Helper', href: '/agents/supabase-helper', iconUrl: undefined },
      { kind: 'category', name: 'Supabase Tools', count: 4, href: '/browse?category=supa-tools' },
      { kind: 'vendor', name: 'Supabase', count: 2, href: '/browse?vendor=supabase' },
    ]);
  });
});
