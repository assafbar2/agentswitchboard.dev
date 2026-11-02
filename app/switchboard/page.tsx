import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import { BoardControls } from '@/components/BoardControls';
import { BoardEvents } from '@/components/BoardEvents';
import { EndpointLink } from '@/components/EndpointLink';
import { BoardLegend, BoardPanels } from '@/components/Switchboard';
import { boardDropName, boardOf, boardSummary } from '@/lib/board';
import { getAllCategories, getEveryAgent } from '@/lib/catalog';
import { getDropSchedule } from '@/lib/drops';
import { pageMetadata } from '@/lib/metadata';
import { boardCard, boardCardImage } from '@/lib/share-cards';
import { formatNumber, pluralize } from '@/lib/utils';

const BOARD_ID = 'board';

async function load() {
  const [catalog, categories] = await Promise.all([getEveryAgent(), getAllCategories()]);
  const board = boardOf(catalog, categories, getDropSchedule().drops[0] ?? null);
  return { board, image: boardCardImage(boardCard(board)) };
}

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const { board, image } = await load();
  return pageMetadata(
    {
      title: 'The Switchboard',
      description: `All ${formatNumber(board.listings)} AI agents, MCP servers and agent tools in the directory as jacks on one board, by category: Official listings filled in, and ${boardDropName(board)} lit.`,
      path: '/switchboard',
      image,
    },
    parent
  );
}

const inlineLink =
  'font-semibold text-[var(--dir-ink)] underline decoration-1 underline-offset-2 hover:decoration-2';

export default async function SwitchboardPage() {
  const { board, image } = await load();
  const dropName = boardDropName(board);

  const stats = [
    { value: board.listings, label: 'Listings' },
    { value: board.official, label: 'Official' },
    { value: board.lit, label: 'Lit' },
    { value: board.panels.length, label: pluralize(board.panels.length, 'Category', 'Categories') },
  ];

  return (
    <>
      {/* ── Human view ─────────────────────────────────────────────── */}
      <div className="human-only container-wide section font-[family-name:var(--font-display)] text-[var(--dir-ink)]">
        <div className="mb-6 border-b-[3px] border-[var(--dir-ink)]! pb-5">
          <h1 className="mb-3 text-4xl font-extrabold leading-[0.95] tracking-[-0.02em] sm:text-5xl">The Switchboard</h1>
          <p className="mb-3 max-w-3xl text-lg text-[var(--dir-muted)]">
            Every listing in the directory as a jack on one board, in a panel for its category, the oldest first. Official
            listings are filled in, and the {formatNumber(board.lit)} added in{' '}
            {board.drop ? (
              <Link href={`/drops/${board.drop}`} className={inlineLink}>
                {dropName}
              </Link>
            ) : (
              dropName
            )}{' '}
            are lit.
          </p>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="dir-label order-last font-semibold uppercase tracking-[0.1em] text-[var(--dir-muted)]">
                  {label}
                </dt>
                <dd className="text-[18px] font-extrabold">{formatNumber(value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <BoardLegend dropName={dropName} lit={board.lit} />
        <Suspense>
          <BoardControls boardId={BOARD_ID} summary={boardSummary(board)} />
        </Suspense>

        <a href="#after-board" className="sr-only focus:not-sr-only focus:mt-3 focus:inline-block focus:font-bold">
          Skip the board
        </a>
        <BoardEvents listings={board.listings} lit={board.lit} dropName={dropName}>
          <BoardPanels board={board} id={BOARD_ID} />
        </BoardEvents>

        <div id="after-board" className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t-[3px] border-[var(--dir-ink)]! pt-4 text-[16px] font-bold">
          <a href={image.url} download="agent-switchboard.png" className="text-[var(--dir-ink)] no-underline hover:underline">
            Download the board as an image<span className="font-semibold text-[var(--dir-muted)]"> (PNG)</span>
          </a>
          <Link href="/categories" className="text-[var(--dir-ink)] no-underline hover:underline">
            Every category<span aria-hidden="true"> →</span>
          </Link>
          <Link href="/new" className="text-[var(--dir-ink)] no-underline hover:underline">
            New listings<span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>

      {/* ── Agent view ─────────────────────────────────────────────── */}
      <div className="agent-only">
        <div className="container-wide py-10 max-w-4xl">
          <div className="mb-6">
            <div className="agent-accent text-base font-bold mb-1">/switchboard</div>
            <div className="agent-dim text-xs">
              {board.listings} listings as jacks, by primary category, oldest first · {board.official} official ·{' '}
              {board.lit} lit: added in {board.drop ? `the ${board.drop} drop` : 'the newest drop'}
            </div>
          </div>

          {board.panels.map((panel) => (
            <div key={panel.slug}>
              <div className="agent-section-title">
                {panel.slug} · {panel.jacks.length}
              </div>
              {panel.jacks.map((jack) => (
                <a key={jack.slug} href={`/agents/${jack.slug}`} className="agent-row no-underline hover:underline">
                  <span className="agent-accent">{jack.slug}</span>
                  <span className="agent-dim">
                    {jack.provider}
                    {jack.official ? ' · official' : ''}
                    {jack.lit ? ' · lit' : ''}
                  </span>
                  <span className="agent-dim">{jack.access.join(' ')}</span>
                </a>
              ))}
            </div>
          ))}

          <div className="agent-section-title">more</div>
          <EndpointLink href={image.url} className="agent-row no-underline hover:underline">
            <span className="agent-accent">/switchboard/card.png</span>
            <span className="agent-dim">the board as an image, 1200×630</span>
            <span className="agent-dim">PNG</span>
          </EndpointLink>
          <Link href="/categories" className="agent-row no-underline hover:underline">
            <span className="agent-accent">/categories</span>
            <span className="agent-dim">every category</span>
            <span className="agent-dim" />
          </Link>
          {board.drop && (
            <Link href={`/drops/${board.drop}`} className="agent-row no-underline hover:underline">
              <span className="agent-accent">/drops/{board.drop}</span>
              <span className="agent-dim">the listings that are lit</span>
              <span className="agent-dim" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
