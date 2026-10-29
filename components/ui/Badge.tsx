import { type ReactNode } from 'react';

type Variant = 'default' | 'accent' | 'blue' | 'amber' | 'sponsor' | 'rose' | 'outline';

/**
 * Square directory tags: small uppercase labels with a 1px rule, no tints or
 * glows. Yellow is a fill only (amber = featured), always with --dir-on-yellow
 * text, so it reads in both themes. Paid placements get the solid ink `sponsor`
 * tag so the disclosure never blends into the editorial labels.
 */
const variantStyles: Record<Variant, string> = {
  default: 'bg-transparent text-[var(--dir-ink)] border-[var(--dir-ink)]!',
  accent: 'bg-transparent text-[var(--dir-ink)] border-[var(--dir-ink)]!',
  blue: 'bg-[var(--dir-paper)] text-[var(--dir-ink)] border-[var(--dir-ink)]!',
  amber: 'bg-[var(--dir-yellow)] text-[var(--dir-on-yellow)] border-[var(--dir-ink)]!',
  sponsor: 'bg-[var(--dir-ink)] text-[var(--dir-paper)] border-[var(--dir-ink)]!',
  rose: 'bg-transparent text-[var(--rose)] border-current!',
  outline: 'bg-transparent text-[var(--dir-muted)] border-[var(--dir-rule)]!',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-none border px-1.5 py-px text-[11px] font-bold uppercase leading-4 tracking-[0.08em] ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
