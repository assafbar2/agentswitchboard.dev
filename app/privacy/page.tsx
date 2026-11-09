import Link from '@/components/Link';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Privacy',
      description:
        'What Agent Switchboard collects, which analytics providers it uses, and how to get in touch about your data.',
      path: '/privacy',
    },
    parent
  );
}

const EMAIL = 'barnir@agentmail.to';

export default function PrivacyPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy</h1>
        <p className="text-sm text-[var(--text-muted)] mono mb-10">Last updated: November 2026</p>

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
            <p className="mt-3">
              The caller&apos;s IP address is used in memory to apply rate limits and is processed
              by Vercel as part of serving the request; Agent Switchboard does not store it in its
              own logs. Server errors are reported to Sentry with the request details needed to fix
              them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              What the MCP server receives from assistants
            </h2>
            <p>
              When you use Agent Switchboard through Claude, ChatGPT, Grok, Cursor, or another
              assistant, the server receives only the arguments the assistant sends to a tool, such
              as search words, a category, or a listing slug. It never receives your conversation,
              chat history, memory, or files, and it does not ask for them. Search arguments are
              used to answer the request and are not kept with any identifier. There are no user
              profiles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Why it is used
            </h2>
            <p>
              To answer your request, to keep the service running and protected from abuse, to
              review listing submissions, and to see which parts of the directory are used so we
              know what to improve. Data is never sold, used for advertising, or used to build
              profiles of people.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              How long it is kept
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Server request logs: as long as Vercel keeps runtime logs for the project, at most 30 days.</li>
              <li>Error reports in Sentry: at most 90 days.</li>
              <li>Aggregate analytics (counts by page, tool, and client type): kept in Vercel Analytics and Umami; they contain no names, email addresses, or stored IP addresses.</li>
              <li>Submission issues on GitHub: public until the maintainer deletes them, which we do on request.</li>
              <li>A submitter&apos;s email address: kept in the maintainer&apos;s inbox only while it is needed to follow up, and deleted on request.</li>
              <li>Rate-limit counters: in memory, cleared within an hour.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              What you send deliberately
            </h2>
            <p>
              If you{' '}
              <Link href="/submit" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
                submit an agent
              </Link>
              , or an assistant submits one for you through the MCP server&apos;s{' '}
              <code className="mono text-sm">submit_listing</code>{' '}
              tool, the description becomes a
              public GitHub issue on the directory&apos;s repository, where the review decision is
              posted. Do not put anything in the description you would not want published. Your
              email address, if you give one, is not on the issue: it is sent privately to the
              maintainer&apos;s inbox so we can follow up, and is never posted publicly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Hosting and third parties
            </h2>
            <p>
              The only recipients are the service providers that run the site: Vercel (hosting,
              request logs, and Vercel Analytics), Umami (cookieless page analytics), Sentry (error
              reports), GitHub (submission issues, which are public), and AgentMail (the
              maintainer&apos;s inbox, which receives a submitter&apos;s email address). Listings
              link out to third-party products; once you follow a link, that site&apos;s own privacy
              policy applies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Connectors and automated clients
            </h2>
            <p>
              The catalog API and MCP server are public and unauthenticated. Assistants and
              connector platforms (including Claude, ChatGPT, Grok, and Meta Muse) can search
              listings without a Switchboard account or API key.
              Switchboard does not receive a password or token when someone uses that connector,
              because none exist. Those calls are counted as described under what is collected, and
              their request logs are processed like any other visit (see hosting above).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Your choices, questions, or removal
            </h2>
            <p>
              You can use the whole directory without giving any personal information. To have a
              submission issue or your email address deleted, or to ask what we hold about you,
              email{' '}
              <a href={`mailto:${EMAIL}`} className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2 mono">
                {EMAIL}
              </a>{' '}
              with any privacy question, or to ask that a listing be corrected or removed. See also
              the{' '}
              <Link href="/contact" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
                contact page
              </Link>
              , the{' '}
              <Link href="/terms" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
                terms of use
              </Link>
              , and the{' '}
              <Link href="/disclaimer" className="text-[var(--accent)] underline decoration-1 underline-offset-2 hover:decoration-2">
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
