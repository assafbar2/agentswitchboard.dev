import { Verified } from 'lucide-react';

/**
 * The one definition of "Verified", used on /about#verification and in the
 * agent-facing docs and APIs so the site's core claim is never an unexplained
 * icon. Keep in step with the definition in CONTRIBUTING.md.
 */
export const VERIFIED_DEFINITION =
  'Verified: we checked it works — its URLs load and its declared access (API, MCP, CLI or extension) responds. Re-checked monthly; the label drops if it stops working.';

/**
 * Hover text for each badge. Kept short on purpose: /browse renders hundreds
 * of badges, and repeating the full definition in every one added ~550 KB of
 * HTML. The full definition lives on /about#verification ("How we verify").
 */
export const VERIFIED_TITLE = 'Verified: we checked it works. See About › How we verify';

export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const md = size === 'md';
  return (
    <span
      title={VERIFIED_TITLE}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold text-[var(--verified-fg)] bg-[var(--verified-bg)] ${
        md ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <Verified aria-hidden="true" className={md ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      Verified
    </span>
  );
}
