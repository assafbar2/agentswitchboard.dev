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
        <p className="text-sm text-[var(--text-muted)] mono mb-10">Last updated: August 2026</p>

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
              Aggregate traffic analytics only. The site uses Vercel Analytics, Google Analytics,
              and Umami to count page views and understand which listings people look for. These
              record technical details such as page path, referrer, approximate region, and device
              type. They are used to decide what to build next, and nothing is sold.
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
              , the details you enter are stored so the listing can be reviewed and published.
              Submitted listings are public by design. Do not put anything in the form you would
              not want published.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Hosting and third parties
            </h2>
            <p>
              The site is hosted on Vercel, which processes request logs as part of serving traffic.
              Listings link out to third-party products; once you follow a link, that site&apos;s own
              privacy policy applies.
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
              </Link>{' '}
              and the{' '}
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
