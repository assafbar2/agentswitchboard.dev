export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg animate-shimmer ${className}`}
      {...props}
    />
  );
}
