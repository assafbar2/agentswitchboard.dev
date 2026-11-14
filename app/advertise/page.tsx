import Link from '@/components/Link';
import type { Metadata, ResolvingMetadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { SponsoredBadge } from '@/components/SponsoredBadge';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Advertise',
      description:
        'Sponsor a listing on Agent Switchboard: a Sponsored label and a spot in the Sponsored slot on the homepage and the weekly drop. It comes first, labeled, among the tools for each task it does on the website, and never changes search results or AI-assistant answers.',
      path: '/advertise',
    },
    parent
  );
}

const SPONSOR_EMAIL = 'barnir@agentmail.to';

/**
 * The packages on offer, in US dollars, paid once per term. Payment is a Stripe
 * Payment Link sent by email after a request is approved, never a button on
 * this page.
 */
const SPONSOR_PACKAGES: readonly { id: string; name: string; includes: readonly string[]; price: string }[] = [
  {
    id: '1-week',
    name: '1 week',
    includes: ['The homepage Sponsored slot for 7 days', "That week's drop page", 'The Sponsored label for the term'],
    price: '$29',
  },
  {
    id: '4-weeks',
    name: '4 weeks',
    includes: ['The homepage Sponsored slot for 28 days', 'Four weekly drop pages', 'The Sponsored label for the term'],
    price: '$99',
  },
  {
    id: '12-weeks',
    name: '12 weeks',
    includes: ['The homepage Sponsored slot for 84 days', 'Twelve weekly drop pages', 'The Sponsored label for the term'],
    price: '$249',
  },
];

const REQUEST_HREF = `mailto:${SPONSOR_EMAIL}?subject=${encodeURIComponent(
  'Sponsored slot request — Agent Switchboard'
)}&body=${encodeURIComponent(
  [
    'Listing (its agentswitchboard.dev page, or your product URL if it is not listed yet):',
    '',
    `Package (${SPONSOR_PACKAGES.map((p) => p.name).join(', ')}):`,
    '',
    'Week you would like to start:',
    '',
    'Your name and company:',
    '',
  ].join('\n')
)}`;

const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default function AdvertisePage() {
  return (
    <div className="container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">Advertise with Us</h1>
        <p className="dir-label text-[var(--dir-muted)] pb-6 mb-8 border-b-[3px] border-[var(--dir-ink)]!">
          Sponsored slots for AI agents and agentic tools
        </p>

        <div className="space-y-10 text-[17px] leading-relaxed">
          <section aria-labelledby="what">
            <h2 id="what" className="dir-bar mb-3">
              What a Sponsored slot is
            </h2>
            <p className="mb-3">
              A paid placement for a listing in the directory. Your listing gets the{' '}
              <SponsoredBadge /> label and shows in:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                the Sponsored slot on the <Link href="/" className={LINK}>homepage</Link>, a box set apart from
                the editor&rsquo;s picks;
              </li>
              <li>
                the same slot on the latest <Link href="/drops" className={LINK}>weekly drop</Link> page;
              </li>
              <li>
                first place, labeled, among the tools for each task it does: the homepage answer, the{' '}
                <Link href="/tasks" className={LINK}>task pages</Link> and Browse by task;
              </li>
              <li>its own page, its cards and compare, each with the Sponsored label, so readers always know it is paid.</li>
            </ul>
          </section>

          <section aria-labelledby="never">
            <h2 id="never" className="dir-bar mb-3">
              What it never changes
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Keyword search results or their order, alternatives, compare or the Operator.</li>
              <li>
                Answers in AI assistants. Claude, ChatGPT and other assistants reach the directory through its MCP
                server, WebMCP and REST API, and sponsorship never appears in those results: no label, no boost.
              </li>
              <li>The Verified, Official and Featured labels. None of them can be bought.</li>
            </ul>
            <p className="mt-3">
              <Link href="/about#sponsored" className={LINK}>
                What Sponsored means
              </Link>
            </p>
          </section>

          <section aria-labelledby="packages">
            <h2 id="packages" className="dir-bar mb-3">
              Packages
            </h2>
            <ul className="grid gap-4 sm:grid-cols-3" data-sponsor-packages="">
              {SPONSOR_PACKAGES.map((p) => (
                <li key={p.id} className="flex flex-col border-2 border-[var(--dir-ink)]! p-4">
                  <h3 className="text-xl font-extrabold">{p.name}</h3>
                  <ul className="mt-2 flex-1 space-y-1 text-[15px] text-[var(--dir-muted)]">
                    {p.includes.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    <span className="text-2xl font-extrabold">{p.price}</span>{' '}
                    <span className="text-[15px] text-[var(--dir-muted)]">one payment</span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] text-[var(--dir-muted)]">
              Prices in US dollars. Until the first paid term starts, the slot shows three launch listings for free:
              Agent Switchboard, AgentMail and Barnir Hired. All three come off the day the first paying sponsor goes
              live.
            </p>
          </section>

          <section aria-labelledby="qualifies">
            <h2 id="qualifies" className="dir-bar mb-3">
              Who qualifies
            </h2>
            <p>
              AI agents, MCP servers and agentic tools that meet the directory&rsquo;s acceptance rules and pass the
              Verified checks: their URLs load and their declared access responds. Every sponsor is reviewed by the
              maintainer before the label goes on, and a request can be declined. Not listed yet?{' '}
              <Link href="/submit" className={LINK}>
                List your agent
              </Link>{' '}
              first.
            </p>
          </section>

          <section aria-labelledby="how">
            <h2 id="how" className="dir-bar mb-3">
              How it works
            </h2>
            <ol className="list-decimal space-y-1 pl-6">
              <li>Request a slot by email with your listing and the package you want.</li>
              <li>The maintainer reviews the listing and replies with a start week.</li>
              <li>Once approved, you get a Stripe payment link by email. Nothing is paid on this site.</li>
              <li>The slot goes live after payment and comes off when the term ends.</li>
            </ol>
            <div className="mt-6">
              <a
                href={REQUEST_HREF}
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--dir-yellow)] px-6 text-[17px] font-extrabold text-[var(--dir-on-yellow)] no-underline hover:underline"
              >
                Request a slot <span aria-hidden="true">→</span>
              </a>
              <p className="mt-2 text-[15px] text-[var(--dir-muted)]">Opens an email to {SPONSOR_EMAIL}.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
