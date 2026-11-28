import { Suspense } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import Link from '@/components/Link';
import { MissingToolForm } from '@/components/MissingToolForm';
import { getAllCategories } from '@/lib/catalog';
import { pageMetadata } from '@/lib/metadata';

export function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  return pageMetadata(
    {
      title: 'Request a Missing Tool',
      description:
        'Tell Agent Switchboard what job no current listing covers. Requests go straight to the weekly curation review — no account or GitHub login required.',
      path: '/request',
    },
    parent
  );
}

export default async function RequestMissingToolPage() {
  const categories = (await getAllCategories()).map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide pt-8 pb-20 font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 pb-6 border-b-[3px] border-[var(--dir-ink)]!">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] mb-3">
              Request a Missing Tool
            </h1>
            <p className="text-lg leading-relaxed text-[var(--dir-muted)]">
              Searched the directory and didn&rsquo;t find a tool for the job? Tell us what you needed your agent to
              do — we read every request in the weekly curation review to decide what to research and add next.
            </p>
          </div>

          <div className="border-[3px] border-[var(--dir-ink)]! p-5 sm:p-6 mb-6">
            <h2 className="dir-bar mb-4">Describe the missing job</h2>
            <Suspense fallback={<p className="text-[var(--dir-muted)]">Loading form…</p>}>
              <MissingToolForm categories={categories} />
            </Suspense>
          </div>

          <p className="text-[15px] text-[var(--dir-muted)]">
            Already know the exact product to add?{' '}
            <Link href="/submit" className="inline-link">
              Suggest a listing on /submit
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-3xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/request</div>
            <div className="agent-dim text-xs leading-relaxed">
              Human form for POST /api/missing-tool. AI agents can call the MCP tool request_missing_tool or POST
              https://agentswitchboard.dev/api/missing-tool directly with JSON:
              {` {"need": "10-500 chars", "tried": "optional", "category": "optional", "access": ["mcp"]}`}
            </div>
          </div>
          <div className="agent-row">
            <span className="agent-accent">POST /api/missing-tool</span>
            <span className="agent-dim">202 recorded · 400 invalid · 429 rate_limited</span>
            <span className="agent-dim">no auth</span>
          </div>
          <div className="agent-row">
            <span className="agent-accent">MCP request_missing_tool</span>
            <span className="agent-dim">POST /api/mcp</span>
            <span className="agent-dim">private weekly review lead</span>
          </div>
        </div>
      </div>
    </>
  );
}
