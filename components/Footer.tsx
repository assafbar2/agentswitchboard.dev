import Link from '@/components/Link';
import { EndpointLink } from '@/components/EndpointLink';
import { getSiteSettings } from '@/lib/catalog';

const DEFAULT_FOOTER_TEXT = 'The curated directory of AI agents, MCP servers and agent tools.';

const footerLinks = [
  {
    title: 'Directory',
    links: [
      { href: '/browse', label: 'Browse Agents' },
      { href: '/categories', label: 'Categories' },
      { href: '/tasks', label: 'Tasks' },
      { href: '/drops', label: 'Weekly Drops' },
      { href: '/new', label: 'New Listings' },
      { href: '/stacks', label: 'Stacks' },
      { href: '/my-stack', label: 'My Stack' },
      { href: '/compare', label: 'Compare' },
      { href: '/switchboard', label: 'The Switchboard' },
      { href: '/operator', label: 'The Operator' },
      { href: '/submit', label: 'List Your Agent' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/for-agents#mcp', label: 'MCP Server' },
      { href: '/connect', label: 'Use with Grok, Claude, ChatGPT' },
      { href: '/for-agents', label: 'For AI Agents' },
      { href: '/whats-new', label: "What's New" },
      { href: '/changelog', label: 'Changelog' },
      { href: '/feed.xml', label: 'RSS Feed', endpoint: true },
      { href: '/advertise', label: 'Advertise' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: 'https://github.com/assafbar2/agentswitchboard.dev', label: 'GitHub', external: true },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms of Use' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
];

export async function Footer() {
  const settings = await getSiteSettings();
  return (
    <footer className="border-t-[3px] border-[var(--dir-ink)] bg-[var(--dir-paper)] font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center bg-[var(--dir-yellow)] px-3 py-1.5 text-lg font-extrabold tracking-[-0.01em] text-[var(--dir-on-yellow)] no-underline hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]"
            >
              Agent Switchboard
            </Link>
            <p className="max-w-[240px] text-base leading-relaxed text-[var(--dir-muted)]">
              {settings?.footerText || DEFAULT_FOOTER_TEXT}
            </p>
          </div>

          {/* Link groups, styled from the list (.foot-links in globals.css) */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h2 className="dir-label foot-title">{group.title}</h2>
              <ul className="foot-links">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {'endpoint' in link && link.endpoint ? (
                      <EndpointLink href={link.href}>{link.label}</EndpointLink>
                    ) : (
                      <Link
                        href={link.href}
                        {...('external' in link && link.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[var(--dir-ink)] pt-6 sm:flex-row">
          <p className="text-sm text-[var(--dir-muted)]">
            &copy; {new Date().getFullYear()} Agent Switchboard. All rights reserved.
          </p>
          <p className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="dir-link">
              Privacy
            </Link>
            <Link href="/terms" className="dir-link">
              Terms of Use
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
