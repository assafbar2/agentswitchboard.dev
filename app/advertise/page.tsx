import { Megaphone } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advertise',
  description: 'Promote your agent to developers building the agentic web.',
};

export default function AdvertisePage() {
  return (
    <div className="container-wide section">
      <div className="max-w-xl mx-auto text-center py-20">
        <Megaphone className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">Advertise with Us</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Get your agent featured in front of developers building
          on the A2A protocol. Sponsorship details coming soon.
        </p>
        <div className="mono text-xs text-[var(--text-muted)] px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] inline-block">
          Phase 4 · Coming soon
        </div>
      </div>
    </div>
  );
}
