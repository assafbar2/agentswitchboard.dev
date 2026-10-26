import Link from 'next/link';
import { GitPullRequest, Terminal, FileJson } from 'lucide-react';
import { SubmitForm } from '@/components/SubmitForm';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'List Your Agent',
  description:
    'Add your agent, MCP server, or agentic tool to the directory — open a pull request or use the form. Every entry is reviewed before it’s listed, and decisions are posted on GitHub.',
  alternates: { canonical: '/submit' },
};

const REPO = 'https://github.com/assafbar2/agentswitchboard.dev';
const RULES_URL = `${REPO}/blob/main/CONTRIBUTING.md#three-rules-for-the-close-calls`;

export default function SubmitPage() {
  return (
    <div className="container-wide pt-8 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Terminal className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight mb-3">List Your Agent</h1>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
            The catalog is maintained in the open — every agent is a JSON file
            in a public repo. Two ways in, one review: every entry is reviewed
            before it&rsquo;s listed, and the decision is posted on GitHub. The{' '}
            <VerifiedBadge /> label means{' '}
            <Link href="/about#verification" className="text-[var(--accent)] hover:underline">
              we checked it works
            </Link>
            .
          </p>
        </div>

        {/* The bar every submission is judged against, summarised from CONTRIBUTING.md */}
        <section id="rules" aria-labelledby="rules-heading" className="card p-6 mb-6 scroll-mt-20">
          <h2 id="rules-heading" className="font-semibold mb-1">
            What gets accepted
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            We&rsquo;re curators, not collectors. A listing needs a real, working
            product with API, MCP, CLI, or browser-extension access, an
            identifiable provider, and genuine adoption signals (or, for your
            own product, endpoints we can verify live). No vaporware, no
            wrappers. Competitors are welcome — five products doing the same
            thing can all list. Four rules settle the close calls:
          </p>
          <ol className="list-decimal pl-5 space-y-3 text-sm text-[var(--text-secondary)]">
            <li>
              <strong className="text-[var(--text-primary)]">Own substance, not pass-through.</strong>{' '}
              A listing must bring its own implementation, data, model, or
              execution. A service whose value is entirely another vendor&rsquo;s,
              re-exposed behind a new key, isn&rsquo;t a listing, so
              OpenAI-compatible gateways and model resellers are declined by
              default. The exception is a capability of their own we can verify:
              a model nobody else serves, enforceable zero-data retention, or
              routing that chooses between providers rather than reselling one.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">One listing per product, not per endpoint.</strong>{' '}
              A vendor gets as many listings as it has genuinely separate
              products — separately named and separately usable — with no cap. A suite of micro-tools sharing one brand is
              one listing, with the pieces listed as its skills.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">Aggregators: one per operator, with substantive access.</strong>{' '}
              When a listing&rsquo;s value is collected third-party data (job
              boards, directories, feeds), we list at most one entry per
              operator, and its access must be keyless or trivially obtainable
              and return real data at useful scale. Data a provider computes
              itself isn&rsquo;t aggregation.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">No competing directories.</strong>{' '}
              We don&rsquo;t list catalogs, directories, plugin indexes, or
              listing services whose product is an index of other people&rsquo;s
              tools — including as a well-built MCP server. It&rsquo;s a flat no,
              not a quality judgement. Link exchanges and guest-post swaps are
              declined on the same principle.
            </li>
          </ol>
          <p className="text-xs text-[var(--text-muted)] mt-4">
            Full rules and examples in{' '}
            <a
              href={RULES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              CONTRIBUTING.md
            </a>
            .
          </p>
        </section>

        {/* Path A: pull request */}
        <div className="card p-6 mb-6 border-[var(--border-accent)]">
          <div className="flex items-center gap-2 mb-2">
            <GitPullRequest className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-semibold">Open a pull request</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Add one file —{' '}
            <span className="mono text-[var(--accent)]">content/agents/&lt;your-slug&gt;.json</span>{' '}
            — and CI validates it against the quality bar. It then gets the same
            review as a form submission; if it&rsquo;s accepted, we merge it.
            Merge = live.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`${REPO}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <FileJson className="w-4 h-4" />
              Read the listing guide
            </a>
            <a
              href={`${REPO}/tree/main/content/agents`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] transition-all"
            >
              Browse existing entries
            </a>
          </div>
        </div>

        {/* Path B: form */}
        <div className="card p-6">
          <h2 className="font-semibold mb-1">No GitHub? Use the form</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Tell us what to list and how to reach you — we do the rest.
          </p>
          <SubmitForm />
        </div>
      </div>
    </div>
  );
}
