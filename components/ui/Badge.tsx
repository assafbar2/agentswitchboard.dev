import { type ReactNode } from 'react';

type Variant = 'default' | 'accent' | 'blue' | 'amber' | 'rose' | 'outline';

const variantStyles: Record<Variant, string> = {
  default:
    'bg-white/[0.05] text-[var(--text-secondary)] border-[var(--border)]',
  accent:
    'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--border-accent)]',
  blue: 'bg-[var(--blue-glow)] text-[var(--blue)] border-[var(--blue)]/20',
  amber:
    'bg-[var(--amber-glow)] text-[var(--amber)] border-[var(--amber)]/20',
  rose: 'bg-[var(--rose-glow)] text-[var(--rose)] border-[var(--rose)]/20',
  outline:
    'bg-transparent text-[var(--text-secondary)] border-[var(--border)]',
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border mono ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
