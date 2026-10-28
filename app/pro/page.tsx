import { Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pro Access',
  description: 'Unlock premium agent listings and advanced features.',
  alternates: { canonical: '/pro' },
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
          href="mailto:barnir@agentmail.to?subject=Pro Access Inquiry — Agent Switchboard"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[var(--dir-yellow)] px-6 text-[17px] font-extrabold text-[var(--dir-on-yellow)] no-underline hover:underline cursor-pointer [font-family:var(--font-display)] mb-4"
        >
          Get in touch
        </a>
        <p className="text-xs text-[var(--text-muted)]">barnir@agentmail.to</p>
      </div>
    </div>
  );
}
