import { SponsoredBadge } from '@/components/SponsoredBadge';
import { Badge } from '@/components/ui/Badge';
import type { Promotion } from '@/lib/promoted';

/** The label on a listing the website placed first (lib/promoted.ts): the Sponsored disclosure or the Featured tag. */
export function PromotionBadge({ label, className }: { label: Promotion | null | undefined; className?: string }) {
  if (label === 'Sponsored') return <SponsoredBadge className={className} />;
  if (label === 'Featured')
    return (
      <Badge variant="amber" className={className}>
        Featured
      </Badge>
    );
  return null;
}
