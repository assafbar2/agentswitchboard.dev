import { Badge } from '@/components/ui/Badge';

/** Short hover text; the full definition is on /about#sponsored. */
export const SPONSORED_TITLE =
  'Sponsored: a paid placement. It comes first, labeled, among the tools for a task it does; it never changes search results. See About › Sponsored';

/** The disclosure on every paid listing, the one solid ink tag. */
export function SponsoredBadge({ className }: { className?: string }) {
  return (
    <Badge variant="sponsor" title={SPONSORED_TITLE} className={className}>
      Sponsored
    </Badge>
  );
}
