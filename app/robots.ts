import type { MetadataRoute } from 'next';

/**
 * Pages that a query turns into a new page, rendered per request, whose links
 * lead to more of them: a crawler that follows /compare?a=…&b=… mixes never
 * runs out. Crawlers get the bare pages; vercel.json turns away the ones that
 * ignore this. The dynamic share cards are left out for the same reason.
 */
export const QUERY_PAGES = ['/browse?', '/compare?', '/stack?', '/operator?'];
const DYNAMIC_CARDS = ['/compare/card.png', '/stack/card.png', '/operator/card.png'];

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

/** SEO-tool crawlers: they index the site for their own products and send no visitors. */
export const SEO_TOOL_BOTS = ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'BLEXBot', 'DataForSeoBot', 'Barkrowler', 'serpstatbot'];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://agentswitchboard.dev';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Public catalog APIs must stay crawlable (Muse review fetches them).
        disallow: ['/_next/', ...QUERY_PAGES, ...DYNAMIC_CARDS],
        crawlDelay: 5,
      },
      { userAgent: LINK_PREVIEW_BOTS, allow: '/', disallow: ['/_next/'] },
      { userAgent: SEO_TOOL_BOTS, disallow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
