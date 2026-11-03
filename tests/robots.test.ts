import * as fs from 'fs';
import { describe, expect, it } from 'vitest';
import robots, { LINK_PREVIEW_BOTS, SEO_TOOL_BOTS } from '@/app/robots';
import sitemap from '@/app/sitemap';
import { compareHref } from '@/lib/compare-link';
import { operatorHref } from '@/lib/request-parts';
import { stackHref } from '@/lib/stack-link';
import vercel from '@/vercel.json';

type Group = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };

const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

const groups = (): Group[] => {
  const { rules } = robots();
  return Array.isArray(rules) ? rules : [rules];
};

/** The group a crawler obeys: the one naming it, else `*` (RFC 9309, section 2.2.1). */
function groupFor(bot: string): Group {
  const named = groups().find((g) => list(g.userAgent).some((ua) => ua.toLowerCase() === bot.toLowerCase()));
  return named ?? groups().find((g) => list(g.userAgent).includes('*'))!;
}

/** A rule matches a path that starts with it, * standing for any characters and a final $ for the end (section 2.2.3). */
const matches = (rule: string, url: string) => {
  const end = rule.endsWith('$');
  const pattern = (end ? rule.slice(0, -1) : rule)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${pattern}${end ? '$' : ''}`).test(url);
};

/** Longest matching rule wins, and Allow wins a tie. */
function allowed(bot: string, url: string): boolean {
  const g = groupFor(bot);
  const longest = (rules: string[]) => Math.max(-1, ...rules.filter((r) => matches(r, url)).map((r) => r.length));
  return longest(list(g.allow)) >= longest(list(g.disallow));
}

const SAMPLE_PARAMS: Record<string, string> = { slug: 'agentmail', pair: 'claude-code-vs-codex-cli', date: '2026-10-31' };

/** A URL for each card.png route under app/, its params filled in. */
const CARD_URLS = (fs.readdirSync('app', { recursive: true }) as string[])
  .filter((file) => /(^|\/)card\.png\/route\.tsx?$/.test(file))
  .map((file) => `/${file.replace(/\/?route\.tsx?$/, '')}`.replace(/\[(\w+)\]/g, (_, param) => SAMPLE_PARAMS[param]));

describe('robots.txt', () => {
  it('lets crawlers reach every page in the sitemap', async () => {
    const paths = (await sitemap()).map(({ url }) => {
      const u = new URL(url);
      return u.pathname + u.search;
    });
    expect(paths.length).toBeGreaterThan(100);
    expect(paths.filter((p) => !allowed('ClaudeBot', p))).toEqual([]);
  });

  it('finds every share card route', () => {
    expect(CARD_URLS.length).toBeGreaterThanOrEqual(16);
    expect(CARD_URLS).toEqual(expect.arrayContaining(['/card.png', '/agents/agentmail/card.png', '/agents/agentmail/alternatives/card.png']));
  });

  it('keeps crawlers out of query pages and every share card, but not the pages', () => {
    const closed = [
      compareHref(['claude-code', 'codex-cli']),
      '/compare/card.png?a=claude-code&b=codex-cli',
      stackHref(['agentmail', 'bigquery']),
      '/stack/card.png?items=agentmail,bigquery',
      operatorHref('read my email'),
      '/operator/card.png?q=read+my+email',
      '/browse?task=query-a-database',
      '/browse?q=postgres',
      '/card.png?v=1a2b3c4d',
      ...CARD_URLS,
    ];
    for (const url of closed) expect(allowed('PerplexityBot', url), url).toBe(false);
    const open = ['/', '/browse', '/compare', '/operator', '/stacks', '/stacks/research-analyst', '/compare/claude-code-vs-codex-cli', '/agents/agentmail', '/agents/agentmail/alternatives', '/icons/agentmail.png'];
    for (const url of open) expect(allowed('PerplexityBot', url), url).toBe(true);
  });

  it('lets link previews fetch a shared query page and every card', () => {
    for (const bot of LINK_PREVIEW_BOTS) {
      expect(allowed(bot, compareHref(['claude-code', 'codex-cli'])), bot).toBe(true);
      expect(allowed(bot, '/stack/card.png?items=agentmail,bigquery'), bot).toBe(true);
      for (const url of CARD_URLS) expect(allowed(bot, url), `${bot} ${url}`).toBe(true);
      expect(allowed(bot, '/_next/static/chunks/x.js'), bot).toBe(false);
    }
  });

  it('turns SEO-tool crawlers away from the whole site', () => {
    for (const bot of SEO_TOOL_BOTS) expect(allowed(bot, '/agents/agentmail'), bot).toBe(false);
  });
});

describe('vercel.json deny rules', () => {
  const CRAWLERS = [
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
    'Mozilla/5.0 (compatible; GoogleOther)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
    'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
  ];
  const PEOPLE = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 asb-e2e (live smoke tests)',
    // An assistant fetching a link a person gave it, one request per ask.
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
    'facebookexternalhit/1.1 Facebot Twitterbot/1.0',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'curl/8.5.0',
  ];
  const rules = vercel.routes.filter((r) => r.mitigate?.action === 'deny');
  const userAgent = (conds: { type: string; key: string; value?: string }[]) =>
    new RegExp(`^${conds.find((c) => c.type === 'header' && c.key === 'user-agent')!.value}$`);
  const denied = (route: (typeof rules)[number], ua: string) => userAgent(route.has).test(ua) && !userAgent(route.missing).test(ua);

  it('cover each query page and every share card that robots.txt closes', () => {
    expect([...new Set(rules.map((r) => r.src))]).toEqual(['^/(?:.+/)?card\\.png$', '^/compare$', '^/stack$', '^/operator$', '^/browse$']);
    const cards = new RegExp(rules[0].src);
    for (const url of CARD_URLS) expect(cards.test(url), url).toBe(true);
    for (const url of ['/', '/agents/agentmail', '/agents/agentmail/alternatives', '/icons/agentmail.png', '/agents/scorecard.png']) {
      expect(cards.test(url), url).toBe(false);
    }
  });

  it('cover every query key /browse reads, one rule each (a rule matches one key)', () => {
    const keys = rules
      .filter((r) => r.src === '^/browse$')
      .map((r) => r.has.find((c) => c.type === 'query')?.key);
    expect(keys.sort()).toEqual(['access', 'auth', 'category', 'official', 'q', 'sort', 'task', 'vendor', 'verified']);
  });

  it('turn away crawlers, not people, assistants fetching for them, or link previews', () => {
    for (const route of rules) {
      for (const ua of CRAWLERS) expect(denied(route, ua), `${route.src} ${ua}`).toBe(true);
      for (const ua of PEOPLE) expect(denied(route, ua), `${route.src} ${ua}`).toBe(false);
      for (const bot of LINK_PREVIEW_BOTS) expect(denied(route, `Mozilla/5.0 (compatible; ${bot}/1.0)`), `${route.src} ${bot}`).toBe(false);
    }
  });
});
