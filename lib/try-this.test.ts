import { describe, expect, it } from 'vitest';
import { getEveryAgent } from './catalog';
import { MAX_PROMPTS, skillAction, tryThis } from './try-this';
import type { Agent, AgentSkill } from './types';

function skill(description: string, name = description.split(' ').slice(0, 3).join(' ')): AgentSkill {
  return { id: name.toLowerCase().replace(/\W+/g, '-'), name, description };
}

function listing(skills: AgentSkill[], accessMethods: Agent['accessMethods'] = ['mcp'], name = 'Box MCP') {
  return { name, skills, accessMethods };
}

describe('skillAction: the verb phrase a description opens with', () => {
  it.each([
    ['Searches files by keyword.', 'search files'],
    ['Search files by keyword', 'search files'],
    [
      'Looks up and retrieves Google Contacts to autofill email recipients and keep people data in sync with Gmail.',
      'look up and retrieve Google Contacts',
    ],
    ['Diffs two OpenAPI specs and returns a pass/fail verdict', 'diff two OpenAPI specs'],
    ['Returns weekly fantasy rankings for a given sport and week', 'get weekly fantasy rankings for a given sport and week'],
    ['Reads Dropbox Paper docs the user can already access', 'read Dropbox Paper docs'],
  ])('%s → %s', (description, action) => {
    expect(skillAction(description)).toBe(action);
  });

  it('keeps a list of objects whole, and stops at a clause after a comma', () => {
    expect(skillAction('Searches issues, pull requests, and commits')).toBe('search issues, pull requests, and commits');
    expect(skillAction('Locates code, slices references, and traces changed files')).toBe('locate code');
    expect(skillAction('Renders line, bar, column, scatter, area, and pie charts from structured data via Vega')).toBe(
      'render line, bar, column, scatter, area, and pie charts'
    );
  });

  it('names one verb from a run of verbs, a search first', () => {
    expect(skillAction('Fetches, searches, sends, drafts, and deletes Gmail messages using natural language')).toBe(
      'search Gmail messages'
    );
    expect(skillAction('Creates, updates, and rolls out PostHog feature flags from a prompt')).toBe('create PostHog feature flags');
  });

  it('skips a list cut before its end, but not adjectives sharing a noun', () => {
    expect(skillAction('Resolves company names, domains, and news mentions to a single canonical entity')).toBeNull();
    expect(skillAction('Convert any URL into clean, LLM-ready markdown in one API call, removing ads, nav, and boilerplate')).toBe(
      'convert any URL into clean, LLM-ready markdown'
    );
    expect(skillAction('Creates a typed, validated flag and generates language-specific code')).toBe('create a typed, validated flag');
  });

  it('keeps file types but not marketing numbers', () => {
    expect(skillAction('Reads and edits .docx files including text and tables')).toBe('read and edit .docx files');
    expect(skillAction('Runs 7,500+ pre-built tools across 81 MCP servers')).toBeNull();
  });

  it('drops speed claims and side-by-side splits', () => {
    expect(skillAction('Deploy static files to a live URL in seconds with presigned uploads')).toBe('deploy static files to a live URL');
    expect(
      skillAction('Compares candidate models side by side on price, context, capabilities, provider availability, and benchmark performance.')
    ).toBe('compare candidate models side-by-side');
  });

  it('cuts what is left hanging once a clause is cut', () => {
    expect(skillAction('Lists the six technical go-to-market roles covered, such as solutions engineer')).toBe(
      'list the six technical go-to-market roles'
    );
  });

  it('skips a description that does not open with something to ask for', () => {
    expect(skillAction('Provides a unified API for every model')).toBeNull();
    expect(skillAction('Runs on your own infrastructure')).toBeNull();
    expect(skillAction('Starts a stdio MCP server whose tool profiles match the client')).toBeNull();
    expect(skillAction('Captures the prompts, transcript, and files touched for each commit')).toBeNull();
    expect(skillAction('Takes a high-level goal and works it end to end inside a cloud VM')).toBeNull();
    expect(skillAction('Takes a DOM snapshot with element UIDs')).toBe('take a DOM snapshot');
  });
});

describe('tryThis: prompts for a listing', () => {
  const search = skill('Searches files by keyword', 'Search');
  const ask = skill('Answers questions about your documents', 'Ask');
  const share = skill('Shares folders between teams', 'Share');
  const connect = skill('Connects a Box account over OAuth', 'Connect');

  it('asks from an assistant for MCP listings and a coding agent for API or CLI ones', () => {
    expect(tryThis(listing([search]))?.audience).toBe('assistant');
    expect(tryThis(listing([search], ['api', 'mcp']))?.audience).toBe('assistant');
    expect(tryThis(listing([search], ['cli']))?.audience).toBe('coding-agent');
    expect(tryThis(listing([search], ['api']))?.audience).toBe('coding-agent');
    expect(tryThis(listing([search], ['browser-extension']))).toBeNull();
    expect(tryThis(listing([search], []))).toBeNull();
    expect(tryThis(listing([search]))?.lead).toBe('Ask your assistant, with Box MCP connected:');
    expect(tryThis(listing([search], ['cli']))?.lead).toBe('Ask your coding agent:');
  });

  it('splits each prompt into the task and the part to replace', () => {
    expect(tryThis(listing([search]))?.prompts[0]).toEqual({
      skillId: 'search',
      skillName: 'Search',
      task: 'Use Box MCP to search files',
      slot: "what you're looking for",
      text: "Use Box MCP to search files: ‹what you're looking for›",
    });
  });

  it('fills a slot that fits the verb', () => {
    expect(tryThis(listing([search, ask, share]))?.prompts.map((p) => p.text)).toEqual([
      "Use Box MCP to search files: ‹what you're looking for›",
      'Use Box MCP to answer questions about your documents: ‹your question›',
      'Use Box MCP to share folders between teams: ‹what you need›',
    ]);
  });

  it('shows at most three, setup last, each naming its skill', () => {
    const extra = skill('Moves files between folders', 'Move');
    const prompts = tryThis(listing([connect, search, ask, share, extra]))!.prompts;
    expect(prompts).toHaveLength(MAX_PROMPTS);
    expect(prompts.map((p) => p.skillName)).toEqual(['Search', 'Ask', 'Share']);
    expect(tryThis(listing([connect, search]))!.prompts.map((p) => p.skillName)).toEqual(['Search', 'Connect']);
  });

  it('drops a skill that repeats another or only restates the listing', () => {
    const again = skill('Searches files by keyword or path', 'Search again');
    expect(tryThis(listing([search, again]))!.prompts.map((p) => p.skillName)).toEqual(['Search']);
    const flyte = listing([skill('Runs Flyte 2 locally in a devbox', 'Local'), search], ['cli'], 'Flyte');
    expect(tryThis(flyte)!.prompts.map((p) => p.skillName)).toEqual(['Search']);
  });

  it('returns null when no skill makes a prompt', () => {
    expect(tryThis(listing([skill('Provides a unified API for every model')]))).toBeNull();
    expect(tryThis(listing([]))).toBeNull();
  });
});

describe('tryThis on the real catalog', () => {
  const SLOTS = ["‹what you're looking for›", '‹your question›', '‹what you need›'];
  const inflections = (w: string) => [w, `${w}s`, `${w}es`, w.replace(/y$/, 'ies')];
  const words = (s: string) => s.toLowerCase().split(/\s+/).map((w) => w.replace(/[,:;.!?)\]"]+$/, ''));

  it('only prompts from a real skill, in words its description uses', async () => {
    const agents = await getEveryAgent();
    let prompted = 0;
    for (const agent of agents) {
      const result = tryThis(agent);
      if (!result) continue;
      prompted++;
      expect(result.prompts.length).toBeLessThanOrEqual(MAX_PROMPTS);
      for (const prompt of result.prompts) {
        const source = agent.skills.find((s) => s.id === prompt.skillId);
        expect(source?.name).toBe(prompt.skillName);
        const prefix = `Use ${agent.name} to `;
        const slot = SLOTS.find((s) => prompt.text.endsWith(`: ${s}`));
        expect(prompt.text.startsWith(prefix) && slot).toBeTruthy();
        const action = prompt.text.slice(prefix.length, -`: ${slot}`.length);
        const described = new Set(words(source!.description.replace(/\b(\w+) by \1\b/gi, '$1-by-$1')));
        const returns = /^(?:\w+ly )?returns?\b/i.test(source!.description);
        for (const word of words(action)) {
          if (word === 'get' && returns) continue;
          expect(inflections(word).some((w) => described.has(w)), `"${word}" in "${action}" (${agent.slug})`).toBe(true);
        }
        expect(action).not.toMatch(/[`{}<>=\\]|\d\+|\d%/);
      }
    }
    const withSkills = agents.filter((a) => a.skills.length > 0).length;
    expect(prompted / withSkills).toBeGreaterThan(0.95);
  });
});
