import Link from 'next/link';
import { ArrowRight, Terminal } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import {
  getFeaturedAgents,
  getAllCategories,
  getAgentCount,
  getUniqueProviderCount,
  getSiteSettings,
} from '@/lib/contentful';
import { FeaturedAgentCard } from '@/components/FeaturedAgentCard';
import { CategoryCard } from '@/components/CategoryCard';
import { StatCounter } from '@/components/ui/StatCounter';

export const revalidate = 60;

export default async function HomePage() {
  const [featured, categories, agentCount, providerCount, settings] =
    await Promise.all([
      getFeaturedAgents(),
      getAllCategories(),
      getAgentCount(),
      getUniqueProviderCount(),
      getSiteSettings(),
    ]);

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="pt-16 pb-8 relative overflow-hidden">
        {/* Top gradient wash */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--accent)] opacity-[0.04] blur-[120px] rounded-full pointer-events-none" />

        <div className="container-wide relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Terminal-style tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] mb-8 animate-fade-in">
              <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="mono text-xs text-[var(--text-secondary)]">
                {settings?.tagline || 'The directory for the agentic web'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-slide-up">
              Every AI Agent{' '}
              <span className="gradient-text">Worth Knowing</span>
              {', '}in One Place
            </h1>

            <p
              className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto mb-10 animate-slide-up"
              style={{ animationDelay: '100ms' }}
            >
              {settings?.heroSubtitle ||
                'Browse, compare, and integrate verified AI agents with real API, MCP, and CLI access. The curated switchboard for the agentic web.'}
            </p>

            <div
              className="max-w-lg mx-auto animate-slide-up"
              style={{ animationDelay: '200ms' }}
            >
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section className="pb-14">
        <div className="container-wide">
          <div className="flex justify-center gap-12 sm:gap-20">
            <StatCounter value={agentCount} label="Agents" delay={0} />
            <StatCounter value={providerCount} label="Providers" delay={100} />
            <StatCounter
              value={categories.length}
              label="Categories"
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* ── Featured Agents ─────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="section">
          <div className="container-wide">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Featured Agents
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Hand-picked agents leading the A2A ecosystem
                </p>
              </div>
              <Link
                href="/browse?featured=true"
                className="hidden sm:flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((agent, i) => (
                <FeaturedAgentCard key={agent.id} agent={agent} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Categories ──────────────────────────────────────────── */}
      <section className="section">
        <div className="container-wide">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Browse by Category
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Find agents by what they do
              </p>
            </div>
            <Link
              href="/categories"
              className="hidden sm:flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
            >
              All categories <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat, i) => (
              <CategoryCard key={cat.id} category={cat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container-wide">
          <div className="relative rounded-2xl border border-[var(--border-accent)] bg-[var(--bg-card)] p-10 sm:p-14 text-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[var(--accent)] opacity-[0.04] blur-[100px] rounded-full pointer-events-none" />

            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                List your agent on the switchboard
              </h2>
              <p className="text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
                Got an A2A-compatible agent? Submit it for review and get
                discovered by developers building the agentic web.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Submit an Agent
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/advertise"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:border-[var(--border-accent)] hover:text-[var(--text-primary)] transition-all"
                >
                  Advertise with us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
