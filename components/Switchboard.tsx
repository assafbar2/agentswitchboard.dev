import Link from '@/components/Link';
import { JACK_PITCH, JACK_RADIUS, jackCenter, lightDelay, panelSize, type Board, type BoardJack } from '@/lib/board';

const jackClass = (jack: BoardJack) => [jack.official && 'o', jack.lit && 'l'].filter(Boolean).join(' ') || undefined;

/**
 * Every listing as a jack: a panel per category, each an inline SVG of
 * links, so the board is whole with JavaScript off. A jack's provider and
 * access methods ride along in data-p and data-m for BoardEvents' readout.
 */
export function BoardPanels({ board, id }: { board: Board; id: string }) {
  const delays = new Map(
    board.panels
      .flatMap((p) => p.jacks)
      .filter((j) => j.lit)
      .map((j, k) => [j.slug, lightDelay(k, board.lit)])
  );

  return (
    <div id={id} className="board">
      {board.panels.map((panel) => {
        const { width, height } = panelSize(panel.jacks.length);
        return (
          <section key={panel.slug} data-cat={panel.slug} aria-labelledby={`board-${panel.slug}`} className="board-panel">
            <h2 id={`board-${panel.slug}`} className="board-panel-title">
              <Link href={`/categories/${panel.slug}`}>{panel.name}</Link>
              <span className="font-semibold text-[var(--dir-muted)]"> · {panel.jacks.length}</span>
            </h2>
            <svg viewBox={`0 0 ${width} ${height}`} className="jacks mt-2 block h-auto w-full">
              {panel.jacks.map((jack, i) => {
                const { x, y } = jackCenter(i);
                const delay = delays.get(jack.slug);
                return (
                  <a
                    key={jack.slug}
                    href={`/agents/${jack.slug}`}
                    className={jackClass(jack)}
                    data-p={jack.provider}
                    data-m={jack.access.join(' ')}
                    data-s={jack.sponsored ? '' : undefined}
                  >
                    <title>{jack.name}</title>
                    <circle cx={x} cy={y} r={JACK_RADIUS} style={delay ? { animationDelay: `${delay}ms` } : undefined} />
                  </a>
                );
              })}
            </svg>
          </section>
        );
      })}
    </div>
  );
}

/** What the three kinds of jack mean, drawn as the board draws them. */
export function BoardLegend({ dropName, lit }: { dropName: string; lit: number }) {
  const keys = [
    { className: undefined, label: 'A listing' },
    { className: 'o', label: 'Official' },
    ...(lit > 0 ? [{ className: 'l', label: `Added in ${dropName}` }] : []),
    ...(lit > 0 ? [{ className: 'o l', label: 'Both' }] : []),
  ];
  return (
    <ul className="jacks flex flex-wrap gap-x-5 gap-y-1 text-[15px] font-semibold">
      {keys.map(({ className, label }) => (
        <li key={label} className="flex items-center gap-1.5">
          <svg viewBox={`0 0 ${JACK_PITCH} ${JACK_PITCH}`} width={JACK_PITCH} height={JACK_PITCH} aria-hidden="true">
            <g className={className}>
              <circle cx={JACK_PITCH / 2} cy={JACK_PITCH / 2} r={JACK_RADIUS} />
            </g>
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}
