import { Megaphone } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advertise',
  description: 'Promote your agent to developers building the agentic web.',
  alternates: { canonical: '/advertise' },
};

export default function AdvertisePage() {
  return (
    <div className="container-wide section">
      <div className="max-w-xl mx-auto text-center py-20">
        <Megaphone className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">Advertise with Us</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Get your agent featured in front of developers building with AI agents, MCP servers,
          and agentic tools.
          Reach out to discuss featured listings, sponsored slots, and partnership opportunities.
        </p>
        <a
          href="mailto:barnir@agentmail.to?subject=Advertising Inquiry — Agent Switchboard"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--dir-yellow)] px-6 text-[17px] font-extrabold text-[var(--dir-on-yellow)] no-underline hover:underline cursor-pointer [font-family:var(--font-display)]"
        >
          barnir@agentmail.to
        </a>
      </div>
    </div>
  );
}
