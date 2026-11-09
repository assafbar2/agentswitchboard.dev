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

/**
 * Square, ink-bordered directory tag (.verified-tag in globals.css, icon
 * included). Colours stay on the --verified-* tokens so the label keeps its
 * own AA-checked pair in both themes.
 */
export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span title={VERIFIED_TITLE} className={size === 'md' ? 'verified-tag verified-tag-md' : 'verified-tag'}>
      Verified
    </span>
  );
}
