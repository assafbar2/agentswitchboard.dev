import Link from '@/components/Link';
import type { Metadata, ResolvingMetadata } from 'next';
import { MyStackEditor } from '@/components/MyStackEditor';
import { pageMetadata } from '@/lib/metadata';
import { MY_STACK_MAX } from '@/lib/stack-link';

export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'My stack',
      description: `Keep up to ${MY_STACK_MAX} AI agents, MCP servers and tools in your own stack, in your order, then share them as one link. No account: it lives in your browser.`,
      path: '/my-stack',
      // Every visitor's page is different, and empty to a search engine.
      robots: { index: false, follow: true },
    },
    parent
  );
}

const LINK = 'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default function MyStackPage() {
  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="mx-auto max-w-3xl">
          <header className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
            <p className="dir-label mb-2.5 text-[15px] font-bold uppercase tracking-[0.12em]">
              <Link href="/stacks" className="text-[var(--dir-ink)] no-underline hover:underline">
                Stacks
              </Link>
            </p>
            <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">My stack</h1>
            <p className="text-lg text-[var(--dir-muted)]">
              The tools you&apos;re putting together, up to {MY_STACK_MAX}, in your order. Share them as one link that opens as a page
              anyone can read, or hand it to your assistant. No account needed: it is kept in this browser, not on our servers. For
              ready-made ones, see the{' '}
              <Link href="/stacks" className={LINK}>
                curated stacks
              </Link>
              .
            </p>
          </header>
          <MyStackEditor view="human" />
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide max-w-4xl py-10">
          <div className="mb-6">
            <div className="agent-accent mb-1 text-base font-bold">/my-stack</div>
            <div className="agent-dim text-xs">
              {`up to ${MY_STACK_MAX} listings kept in this browser's localStorage · shared as /stack?items=<slug>,<slug>&title=<title>`}
            </div>
          </div>
          <MyStackEditor view="agent" />
        </div>
      </div>
    </>
  );
}
