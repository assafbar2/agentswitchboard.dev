import { describe, it, expect } from 'vitest';
import {
  clampInt,
  normalizeAccessMethods,
  normalizeAuthTypes,
  summarizeAgent,
  detailAgent,
  summarizeCategory,
  summarizeStack,
  summarizeTask,
  detailTask,
  unknownTaskMessage,
} from './public-api';
import type { Task } from './tasks';
import type { Agent, Category } from './types';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'id-1',
    name: 'AgentMail',
    slug: 'agentmail',
    description: 'Email inbox API built for AI agents.',
    providerName: 'AgentMail',
    providerUrl: 'https://agentmail.to',
    agentUrl: 'https://agentmail.to',
    categories: [
      {
        id: 'c1',
        name: 'Infrastructure',
        slug: 'infrastructure',
        sortOrder: 1,
      },
    ],
    tags: ['email', 'api'],
    skills: [
      {
        id: 'inbox-management',
        name: 'Inbox Management',
        description: 'Create and list inboxes.',
      },
    ],
    authType: 'apiKey',
    supportsStreaming: true,
    supportsPushNotifications: true,
    status: 'published',
    featured: true,
    verified: true,
    official: false,
    tier: 'free',
    discoveredBy: 'manual',
    accessMethods: ['api', 'mcp', 'cli'],
    createdAt: '2026-03-21T00:00:00.000Z',
    updatedAt: '2026-04-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeAccessMethods', () => {
  it('maps the extension alias, ignores case and drops unknown values', () => {
    expect(normalizeAccessMethods([' MCP', 'extension', 'browser-extension', 'bogus', ''])).toEqual([
      'mcp',
      'browser-extension',
    ]);
  });
});

describe('normalizeAuthTypes', () => {
  it('matches any case to the canonical spelling and drops unknown values', () => {
    expect(normalizeAuthTypes(['NONE', ' apikey ', 'OAuth2', 'bearer', 'oauth', 'none', ''])).toEqual([
      'none',
      'apiKey',
      'oauth2',
      'bearer',
    ]);
  });
});

describe('clampInt', () => {
  it('returns fallback for null or NaN', () => {
    expect(clampInt(null, 10, 1, 50)).toBe(10);
    expect(clampInt('nope', 10, 1, 50)).toBe(10);
  });

  it('clamps to min and max', () => {
    expect(clampInt('0', 10, 1, 50)).toBe(1);
    expect(clampInt('999', 10, 1, 50)).toBe(50);
    expect(clampInt('7', 10, 1, 50)).toBe(7);
  });
});

describe('summarizeAgent', () => {
  it('exposes directory URL and category slugs, not CMS ids', () => {
    const card = summarizeAgent(makeAgent());
    expect(card.slug).toBe('agentmail');
    expect(card.url).toBe('https://agentswitchboard.dev/agents/agentmail');
    expect(card.categories).toEqual(['infrastructure']);
    expect(card.official).toBe(false);
    expect(card).not.toHaveProperty('skills');
    expect(card).not.toHaveProperty('id');
  });

  it('gives an absolute icon URL, or null when the listing has none', () => {
    const withIcon = summarizeAgent(makeAgent({ iconUrl: '/icons/agentmail.png?v=aca5768d' }));
    expect(withIcon.iconUrl).toBe('https://agentswitchboard.dev/icons/agentmail.png?v=aca5768d');
    expect(summarizeAgent(makeAgent()).iconUrl).toBeNull();
  });
});

describe('detailAgent', () => {
  it('includes skills, auth, and provider homepage', () => {
    const detail = detailAgent(makeAgent());
    expect(detail.homepage).toBe('https://agentmail.to');
    expect(detail.authType).toBe('apiKey');
    expect(detail.skills).toEqual([
      {
        id: 'inbox-management',
        name: 'Inbox Management',
        description: 'Create and list inboxes.',
      },
    ]);
    expect(detail.tags).toEqual(['email', 'api']);
  });

  it('reports the official vendor, or null', () => {
    expect(detailAgent(makeAgent()).officialVendor).toBeNull();
    const official = detailAgent(
      makeAgent({ official: true, officialVendor: { slug: 'notion', name: 'Notion' } })
    );
    expect(official.official).toBe(true);
    expect(official.officialVendor).toBe('Notion');
  });
});

describe('summarizeCategory', () => {
  it('defaults missing description and count', () => {
    const cat: Category = {
      id: 'c1',
      name: 'Code & DevTools',
      slug: 'code-devtools',
      sortOrder: 4,
    };
    expect(summarizeCategory(cat)).toEqual({
      slug: 'code-devtools',
      name: 'Code & DevTools',
      description: null,
      agentCount: 0,
    });
  });
});

describe('summarizeStack', () => {
  const stack = {
    slug: 'email-agent',
    title: 'An email agent',
    promise: 'Give an agent its own inbox.',
    items: [{ slug: 'agentmail', why: 'Its inbox.' }],
  };

  it('lists each listing as a search result with its auth type and why it is in the stack', () => {
    const agent = makeAgent();
    expect(summarizeStack(stack, [{ agent, why: 'Its inbox.' }])).toEqual({
      slug: 'email-agent',
      title: 'An email agent',
      promise: 'Give an agent its own inbox.',
      week: null,
      url: 'https://agentswitchboard.dev/stacks/email-agent',
      items: [{ ...summarizeAgent(agent), authType: 'apiKey', why: 'Its inbox.' }],
    });
  });

  it("gives a stack of the week's drop date", () => {
    expect(summarizeStack({ ...stack, week: '2026-10-31' }, []).week).toBe('2026-10-31');
  });
});

describe('summarizeTask and detailTask', () => {
  const task: Task = {
    slug: 'send-and-read-email',
    label: 'send and read email',
    blurb: 'Give an agent an inbox.',
    keywords: ['email', 'inbox', 'smtp'],
    categories: ['infrastructure'],
    access: ['api'],
  };
  const fits = [makeAgent(), makeAgent({ slug: 'gmail', official: true })];

  it('counts the listings that fit and links the page, the filtered /browse and the API', () => {
    expect(summarizeTask(task, fits)).toEqual({
      slug: 'send-and-read-email',
      label: 'send and read email',
      blurb: 'Give an agent an inbox.',
      keywords: ['email', 'inbox', 'smtp'],
      categories: ['infrastructure'],
      access: ['api'],
      count: 2,
      official: 1,
      url: 'https://agentswitchboard.dev/tasks/send-and-read-email',
      browseUrl: 'https://agentswitchboard.dev/browse?task=send-and-read-email',
      agentsUrl: 'https://agentswitchboard.dev/api/agents?task=send-and-read-email',
    });
  });

  it('lists every fit best first with its auth type and why, and names related tasks and stacks by slug', () => {
    const [agentmail, gmail] = fits;
    const detail = detailTask(
      task,
      [
        { agent: agentmail, why: 'Inbox Management: Create and list inboxes.' },
        { agent: gmail, why: null },
      ],
      [{ ...task, slug: 'manage-tickets' }],
      [{ slug: 'email-agent', title: 'An email agent', promise: '', items: [] }]
    );
    expect(detail).toMatchObject({ slug: 'send-and-read-email', count: 2, relatedTasks: ['manage-tickets'], stacks: ['email-agent'] });
    expect(detail.agents).toEqual([
      { ...summarizeAgent(agentmail), authType: 'apiKey', why: 'Inbox Management: Create and list inboxes.' },
      { ...summarizeAgent(gmail), authType: 'apiKey', why: null },
    ]);
  });

  it('points an unknown slug at the list of tasks', () => {
    expect(unknownTaskMessage('nope')).toBe('No task with slug "nope". GET /api/tasks lists every task.');
  });
});
