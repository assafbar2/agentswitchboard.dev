interface StatCounterProps {
  value: number | string;
  label: string;
  delay?: number;
}

export function StatCounter({ value, label, delay = 0 }: StatCounterProps) {
  return (
    <div
      className="text-center animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--dir-ink)] mb-1">
        {value}
      </div>
      <div className="dir-label text-[var(--dir-muted)]">{label}</div>
    </div>
  );
}
