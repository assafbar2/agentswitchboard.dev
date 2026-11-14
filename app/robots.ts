import type { MetadataRoute } from 'next';

/**
 * Pages that a query turns into a new page, rendered per request, whose links
 * lead to more of them: a crawler that follows /compare?a=…&b=… mixes never
 * runs out. Crawlers get the bare pages; vercel.json turns away the ones that
 * ignore this.
 */
export const QUERY_PAGES = ['/browse?', '/compare?', '/stack?', '/operator?'];

/**
 * Every page's share card (lib/share-cards.ts). Only the preview a shared link
 * gets shows one, so link previews fetch them and crawlers stay off; vercel.json
 * turns away the crawlers that ignore this.
 */
const SHARE_CARDS = ['/card.png', '/*/card.png'];

/** Fetch a page when someone shares a link to it, query and card included. */
export const LINK_PREVIEW_BOTS = [
  'Twitterbot',
  'facebookexternalhit',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
  'TelegramBot',
  'WhatsApp',
  'redditbot',
  'Pinterestbot',
  'Embedly',
  'Iframely',
];

/**
 * AI search crawlers and the fetchers assistants send for one person's ask.
 * They put pages in AI answers with a link back, so they get the same rules
 * as everyone without the crawl delay. Training crawlers (GPTBot, ClaudeBot,
 * Google-Extended, CCBot) stay under `*`.
 */
export const AI_SEARCH_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'];

type Rule = Extract<MetadataRoute.Robots['rules'], unknown[]>[number];

/** `rules` with a group for AI_SEARCH_BOTS after `*`: its rules, without its crawl delay. */
function withAiSearch(rules: Rule[]): Rule[] {
  const at = rules.findIndex((r) => r.userAgent === '*');
  const { allow, disallow } = rules[at];
  return [...rules.slice(0, at + 1), { userAgent: AI_SEARCH_BOTS, allow, disallow }, ...rules.slice(at + 1)];
}

/** SEO-tool crawlers: they index the site for their own products and send no visitors. */
export const SEO_TOOL_BOTS = ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot', 'DataForSeoBot', 'Barkrowler', 'serpstatbot'];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';
  return {
    rules: withAiSearch([
      {
        userAgent: '*',
        allow: '/',
        // Public catalog APIs must stay crawlable (Muse review fetches them),
        // except /api/recommend and the homepage box's /home/answer: every need is another URL, as on a query page.
        disallow: ['/_next/', ...QUERY_PAGES, '/api/recommend', '/home/answer', ...SHARE_CARDS],
        crawlDelay: 5,
      },
      { userAgent: LINK_PREVIEW_BOTS, allow: '/', disallow: ['/_next/'] },
      { userAgent: SEO_TOOL_BOTS, disallow: '/' },
    ]),
    sitemap: `${base}/sitemap.xml`,
  };
}
