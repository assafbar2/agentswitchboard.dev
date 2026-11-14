import Link from '@/components/Link';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { VERIFIED_ABOUT, verifiedDetail } from '@/lib/verified';

/** The badge, then what it means and when it was last checked, linking the About explanation. */
export function VerifiedNote({
  checked,
  size = 'sm',
  className = '',
}: {
  checked: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}>
      <VerifiedBadge size={size} checked={checked} />
      <Link
        href={VERIFIED_ABOUT}
        className="text-[14px] text-[var(--dir-muted)] underline decoration-1 underline-offset-2 hover:decoration-2"
      >
        {verifiedDetail(checked)}
      </Link>
    </span>
  );
}
