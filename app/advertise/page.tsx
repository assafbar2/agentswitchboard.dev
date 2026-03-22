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
          Get your agent featured in front of developers building on the A2A protocol.
          Reach out to discuss featured listings, sponsored slots, and partnership opportunities.
        </p>
        <a
          href="mailto:hello@agentswitchboard.dev?subject=Advertising Inquiry — Agent Switchboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
        >
          hello@agentswitchboard.dev
        </a>
      </div>
    </div>
  );
}
