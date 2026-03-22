import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Legal disclaimer for Agent Switchboard.',
};

export default function DisclaimerPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Disclaimer</h1>
        <p className="text-sm text-[var(--text-muted)] mono mb-10">
          Last updated: March 2026
        </p>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              General Information Only
            </h2>
            <p>
              Agent Switchboard is a curated directory of AI agents and developer tools. The
              information on this site is provided for general informational purposes only and
              does not constitute professional, technical, legal, or financial advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              No Endorsement
            </h2>
            <p>
              Inclusion in this directory does not constitute an endorsement, recommendation, or
              guarantee of any product, service, or company listed. We do our best to verify
              accuracy, but we make no warranties regarding the completeness, reliability, or
              suitability of any listed agent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Third-Party Links
            </h2>
            <p>
              This site contains links to third-party websites and services. We have no control
              over the content, privacy policies, or practices of those sites. Visiting any
              third-party link is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Accuracy of Information
            </h2>
            <p>
              We strive to keep listings accurate and up to date. However, the AI and agent
              ecosystem moves fast. Features, pricing, availability, and access methods may
              change without notice. Always verify information directly with the provider.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Agent Switchboard and its operators shall
              not be liable for any direct, indirect, incidental, or consequential damages
              arising from the use of, or reliance on, any information or service listed on
              this site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Contact
            </h2>
            <p>
              Questions about this disclaimer?{' '}
              <a
                href="mailto:hello@upgraide.co"
                className="text-[var(--accent)] hover:underline"
              >
                hello@upgraide.co
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
