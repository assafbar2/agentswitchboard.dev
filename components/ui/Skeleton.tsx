/** Placeholder block: a flat hairline-grey square, no shimmer gradient. */
export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-none bg-[var(--dir-rule)] ${className}`}
      {...props}
    />
  );
}
