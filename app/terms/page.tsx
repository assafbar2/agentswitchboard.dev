import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'Terms for using Agent Switchboard, including the public catalog API and connectors that call it.',
  alternates: { canonical: '/terms' },
};

const EMAIL = 'barnir@agentmail.to';

export default function TermsPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Use</h1>
        <p className="text-sm text-[var(--text-muted)] mono mb-10">Last updated: September 2026</p>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Agreement</h2>
            <p>
              These terms govern use of Agent Switchboard (the website at agentswitchboard.dev, the
              public catalog API, the MCP server, and related machine-readable documents). By using
              the service you agree to them. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              What the service is
            </h2>
            <p>
              Agent Switchboard is a curated directory of AI agents and developer tools. It is a
              discovery layer: listings describe how to reach a product. It is not a proxy, host, or
              operator of the listed products, and it does not run those products on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Public API and connectors
            </h2>
            <p>
              The catalog endpoints (including{' '}
              <Link href="/api/agents" className="text-[var(--accent)] hover:underline">
                GET /api/agents
              </Link>
              , GET /api/agents/&#123;slug&#125;, GET /api/categories, GET /agents.json, and POST
              /api/mcp) are public, read-only, and require no account or API key. You may call them
              from your own applications and from assistant platforms (including Meta Muse) under
              ordinary fair use. Do not attempt to overload, scrape around published rate-friendly
              caches, or present the directory as your own catalog without attribution.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Listings</h2>
            <p>
              Inclusion is not an endorsement. Features, pricing, and access methods of listed
              products can change without notice. Always confirm details with the provider. Catalog
              data is also available under{' '}
              <a
                href="https://github.com/assafbar2/agentswitchboard.dev/blob/main/content/LICENSE.md"
                className="text-[var(--accent)] hover:underline"
              >
                CC-BY-4.0
              </a>{' '}
              with attribution to Agent Switchboard; site code is MIT.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Acceptable use
            </h2>
            <p>
              Do not use the service to break the law, to impersonate Agent Switchboard or a listed
              provider, or to attack the site or its users. Submitted listings must be accurate to
              the best of your knowledge and must not include secrets or personal data you would not
              want published.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              No warranty; limitation of liability
            </h2>
            <p>
              The service is provided as is. To the fullest extent permitted by law, Agent
              Switchboard and its operators are not liable for indirect, incidental, or
              consequential damages, or for reliance on a listing or search result. See also the{' '}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">
                disclaimer
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Changes</h2>
            <p>
              These terms may be updated by posting a new version on this page. Continued use after
              a change is posted means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Contact</h2>
            <p>
              Questions:{' '}
              <a href={`mailto:${EMAIL}`} className="text-[var(--accent)] hover:underline mono">
                {EMAIL}
              </a>
              . Privacy practices are described on the{' '}
              <Link href="/privacy" className="text-[var(--accent)] hover:underline">
                privacy page
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
