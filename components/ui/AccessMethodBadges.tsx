import { ACCESS_METHOD_LABELS } from '@/lib/search';

const methodStyles: Record<string, string> = {
  api: 'bg-[var(--blue-glow)] text-[var(--blue)] border-[var(--blue)]/20',
  mcp: 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--border-accent)]',
  cli: 'bg-[var(--amber-glow)] text-[var(--amber)] border-[var(--amber)]/20',
  'browser-extension':
    'bg-[var(--rose-glow)] text-[var(--rose)] border-[var(--rose)]/20',
};

export function AccessMethodBadges({
  methods,
  size = 'sm',
}: {
  methods: string[];
  size?: 'sm' | 'md';
}) {
  if (methods.length === 0) return null;

  const cls =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[11px] leading-4'
      : 'px-2 py-0.5 text-xs';

  return (
    <div className="flex flex-wrap gap-1">
      {methods.map((method) => (
        <span
          key={method}
          className={`inline-flex items-center rounded-sm border mono font-medium uppercase tracking-wide ${cls} ${methodStyles[method] ?? 'bg-[var(--text-primary)]/7 text-[var(--text-secondary)] border-[var(--border)]'}`}
        >
          {ACCESS_METHOD_LABELS[method] ?? method}
        </span>
      ))}
    </div>
  );
}
