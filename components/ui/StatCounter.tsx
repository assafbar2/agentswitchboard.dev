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
      <div className="mono text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-1">
        {value}
      </div>
      <div className="text-sm text-[var(--text-tertiary)] uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
