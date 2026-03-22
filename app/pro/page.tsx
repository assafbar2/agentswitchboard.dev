import { Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pro Access',
  description: 'Unlock premium agent listings and advanced features.',
};

export default function ProPage() {
  return (
    <div className="container-wide section">
      <div className="max-w-xl mx-auto text-center py-20">
        <Zap className="w-10 h-10 text-[var(--accent)] mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-3">Pro Access</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Unlock premium agent listings, advanced integration guides,
          and priority support. Interested in early access?
        </p>
        <a
          href="mailto:hello@agentswitchboard.dev?subject=Pro Access Inquiry — Agent Switchboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity mb-4"
        >
          Get in touch
        </a>
        <p className="text-xs text-[var(--text-muted)]">hello@agentswitchboard.dev</p>
      </div>
    </div>
  );
}
