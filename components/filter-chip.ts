// Square, ink-bordered toggles; the pressed one is filled with ink. A plain
// module, not a client one, so server components get the strings too.
export const FILTER_BASE =
  'inline-flex min-h-11 items-center gap-1.5 rounded-none border-2 border-[var(--dir-ink)]! px-3 text-sm font-bold uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dir-ink)]';
export const FILTER_ON = 'bg-[var(--dir-ink)] text-[var(--dir-paper)]';
export const FILTER_OFF =
  'bg-[var(--dir-paper)] text-[var(--dir-ink)] hover:bg-[var(--dir-rule)]';
