/** Original bot icon for the Grok Bot / X entry points. Deliberately not the Grok logo. */
export function BotMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect width="32" height="32" fill="var(--dir-yellow)" />
      <g fill="none" stroke="var(--dir-on-yellow)" strokeWidth="2.5">
        <line x1="16" y1="6.5" x2="16" y2="11" />
        <rect x="7" y="11" width="18" height="14" />
        <line x1="4" y1="16" x2="4" y2="21" />
        <line x1="28" y1="16" x2="28" y2="21" />
      </g>
      <g fill="var(--dir-on-yellow)">
        <circle cx="16" cy="5" r="2.25" />
        <rect x="10.5" y="14.5" width="3.5" height="3.5" />
        <rect x="18" y="14.5" width="3.5" height="3.5" />
        <circle cx="12" cy="21.5" r="1.1" />
        <circle cx="16" cy="21.5" r="1.1" />
        <circle cx="20" cy="21.5" r="1.1" />
      </g>
    </svg>
  );
}
