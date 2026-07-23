import Link from 'next/link';

const footerLinks = [
  {
    title: 'Directory',
    links: [
      { href: '/browse', label: 'Browse Agents' },
      { href: '/categories', label: 'Categories' },
      { href: '/submit', label: 'List Your Agent' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/for-agents#mcp', label: 'MCP Server' },
      { href: '/for-agents', label: 'For AI Agents' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/pro', label: 'Pro Access' },
      { href: '/advertise', label: 'Advertise' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: 'https://github.com/assafbar2/agentswitchboard.dev', label: 'GitHub', external: true },
      { href: '/disclaimer', label: 'Disclaimer' },
      { href: 'mailto:barnir@agentmail.to?subject=Hey from Agent Switchboard', label: 'Contact Us', external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              <span className="mono text-base font-bold tracking-tight">
                switchboard
              </span>
            </Link>
            <p className="text-sm text-[var(--text-tertiary)] max-w-[240px] leading-relaxed">
              The curated directory for A2A protocol agents. Discover the agentic web.
            </p>
          </div>

          {/* Link groups */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="mono text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                {group.title}
              </h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      {...('external' in link && link.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} Agent Switchboard. All rights reserved.
          </p>
          <p className="text-xs text-[var(--text-muted)] mono">
            Built for the agentic web
          </p>
        </div>
      </div>
    </footer>
  );
}
