import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Agent Switchboard collects, which analytics providers it uses, and how to get in touch about your data.',
  alternates: { canonical: '/privacy' },
};

const EMAIL = 'barnir@agentmail.to';

export default function PrivacyPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy</h1>
        <p className="text-sm text-[var(--text-muted)] mono mb-10">Last updated: October 2026</p>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              The short version
            </h2>
            <p>
              Agent Switchboard has no user accounts, no login, and no advertising network. You can
              browse the entire directory, read every listing, and call the JSON and MCP endpoints
              without identifying yourself.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              What is collected
            </h2>
            <p>
              Aggregate traffic analytics only. The site uses Vercel Analytics and Umami to count
              page views and understand which listings people look for. Neither uses cookies. They
              record technical details such as page path, referrer, approximate region, and device
              type. They are used to decide what to build next, and nothing is sold.
            </p>
            <p className="mt-3">
              Requests to the API, the MCP server, and the machine-readable docs (such as{' '}
              <span className="mono">/llms.txt</span>, <span className="mono">/agents.json</span>,
              and <span className="mono">/index.md</span>) are counted on the server. Each request
              is logged with its route, the MCP tool called or the search terms used, the
              user-agent string, and a coarse client type derived from it, such as Claude, Cursor,
              or curl. The route, tool name, and client type may also be recorded as a Vercel
              Analytics event. No cookies are set or read.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              What you send deliberately
            </h2>
            <p>
              If you{' '}
              <Link href="/submit" className="text-[var(--accent)] hover:underline">
                submit an agent
              </Link>
              , the description you enter becomes a public GitHub issue on the directory&apos;s
              repository, where the review decision is posted. Do not put anything in the
              description you would not want published. Your email address is not on the issue:
              it is sent privately to the maintainer&apos;s inbox so we can follow up, and is never
              posted publicly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Hosting and third parties
            </h2>
            <p>
              The site is hosted on Vercel, which processes request logs as part of serving traffic.
              Submissions are filed on GitHub, and the submitter&apos;s email is delivered through
              AgentMail, which hosts the maintainer&apos;s inbox. Listings link out to third-party
              products; once you follow a link, that site&apos;s own privacy policy applies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Connectors and automated clients
            </h2>
            <p>
              The catalog API is public and unauthenticated. Assistants and connector platforms
              (including Meta Muse) can search listings without a Switchboard account or API key.
              Switchboard does not receive a password or token when someone uses that connector,
              because none exist. Those calls are counted as described under what is collected, and
              their request logs are processed like any other visit (see hosting above).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Questions or removal
            </h2>
            <p>
              Email{' '}
              <a href={`mailto:${EMAIL}`} className="text-[var(--accent)] hover:underline mono">
                {EMAIL}
              </a>{' '}
              with any privacy question, or to ask that a listing be corrected or removed. See also
              the{' '}
              <Link href="/contact" className="text-[var(--accent)] hover:underline">
                contact page
              </Link>
              , the{' '}
              <Link href="/terms" className="text-[var(--accent)] hover:underline">
                terms of use
              </Link>
              , and the{' '}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">
                disclaimer
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
