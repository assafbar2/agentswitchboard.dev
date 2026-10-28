import { ACCESS_METHOD_LABELS } from '@/lib/search';

/**
 * Access methods as square ink-bordered tags (API, MCP, CLI, Extension). The
 * directory look carries meaning in the words, not in per-method colours.
 */
export function AccessMethodBadges({
  methods,
  size = 'sm',
}: {
  methods: string[];
  size?: 'sm' | 'md';
}) {
  if (methods.length === 0) return null;

  const cls = size === 'sm' ? 'px-1.5 py-px text-[11px]' : 'px-2 py-0.5 text-sm';

  return (
    <div className="flex flex-wrap gap-1">
      {methods.map((method) => (
        <span
          key={method}
          className={`inline-flex items-center rounded-none border border-[var(--dir-ink)]! font-bold uppercase leading-4 tracking-[0.06em] text-[var(--dir-ink)] ${cls}`}
        >
          {ACCESS_METHOD_LABELS[method] ?? method}
        </span>
      ))}
    </div>
  );
}
