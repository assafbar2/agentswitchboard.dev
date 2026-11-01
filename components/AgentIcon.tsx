import type { CSSProperties } from 'react';
import { smallIconPath } from '@/lib/icons';

/** The size .agent-icon sets in globals.css. */
const DEFAULT_SIZE = 24;

/**
 * A listing's icon in a fixed box: the fetched icon on a white chip (so a dark
 * logo stays visible on dark paper), or the name's initial on yellow when the
 * listing has none. Decorative, since the name is always shown beside it.
 */
export function AgentIcon({
  name,
  iconUrl,
  size = DEFAULT_SIZE,
  lazy = true,
  className,
}: {
  name: string;
  iconUrl?: string;
  /** Rendered side in px. At 32 or less the 48px copy is loaded. */
  size?: number;
  lazy?: boolean;
  className?: string;
}) {
  const classes = className ? `agent-icon ${className}` : 'agent-icon';
  // The default size comes from the stylesheet, so the cards on /browse
  // repeat no inline style.
  const style: CSSProperties | undefined =
    size === DEFAULT_SIZE ? undefined : { width: size, height: size, fontSize: Math.round(size * 0.55) };

  if (!iconUrl) {
    return (
      <span aria-hidden="true" className={`${classes} agent-icon-initial`} style={style}>
        {initialOf(name)}
      </span>
    );
  }

  return (
    // Pre-sized local PNGs: next/image would add nothing but a client
    // component per card.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={size <= 32 ? smallIconPath(iconUrl) : iconUrl}
      alt=""
      width={size}
      height={size}
      loading={lazy ? 'lazy' : undefined}
      className={classes}
      style={style}
    />
  );
}

function initialOf(name: string): string {
  return name.match(/[\p{L}\p{N}]/u)?.[0].toUpperCase() ?? '·';
}
