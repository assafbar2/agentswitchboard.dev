/**
 * Catalog data layer — git-as-CMS.
 *
 * Reads the directory's content from checked-in files:
 *   content/agents/<slug>.json   one file per agent (source of truth)
 *   content/categories.json      category definitions, ordered
 *   content/site.json            site settings
 *
 * The public API and its semantics are byte-compatible with the previous
 * Contentful layer (lib/contentful.ts, removed in the git-cms migration):
 * same Agent/Category types, same ordering (featured first, then name),
 * same published-status filter. All reads are wrapped in React cache()
 * so a render shares one filesystem pass.
 *
 * Editing content = editing files + committing. Validation is enforced
 * by scripts/validate-content.ts in CI.
 */

import * as fs from 'fs';
import * as path from 'path';
import { cache } from 'react';
import type { Agent, Category, HomepageAgent, SiteSettings } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');

// ── Raw file loading ────────────────────────────────────────────────

const loadAllAgentsRaw = cache(async (): Promise<Agent[]> => {
  const dir = path.join(CONTENT_DIR, 'agents');
  const files = await fs.promises.readdir(dir);
  const agents = await Promise.all(
    files
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => {
        const raw = await fs.promises.readFile(path.join(dir, f), 'utf8');
        const data = JSON.parse(raw);
        // categories are stored as slugs; hydrate to Category objects
        const cats = await loadCategoriesRaw();
        const bySlug = new Map(cats.map((c) => [c.slug, c]));
        return {
          ...data,
          categories: (data.categories ?? [])
            .map((slug: string) => bySlug.get(slug))
            .filter(Boolean),
          tags: data.tags ?? [],
          skills: data.skills ?? [],
          accessMethods: data.accessMethods ?? [],
        } as Agent;
      })
  );
  return agents;
});

const loadCategoriesRaw = cache(async (): Promise<Category[]> => {
  const raw = await fs.promises.readFile(path.join(CONTENT_DIR, 'categories.json'), 'utf8');
  return JSON.parse(raw) as Category[];
});

// ── Public API (same shape as the former Contentful layer) ─────────

/** Every published agent, featured first then A→Z (the canonical order). */
export const getEveryAgent = cache(async (): Promise<Agent[]> => {
  const agents = await loadAllAgentsRaw();
  return agents
    .filter((a) => a.status === 'published')
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name)
    );
});

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const agents = await getEveryAgent();
  return agents.find((a) => a.slug === slug) ?? null;
}

export async function getAllCategories(): Promise<Category[]> {
  const [categories, agents] = await Promise.all([
    loadCategoriesRaw(),
    getEveryAgent(),
  ]);

  const counts = new Map<string, number>();
  for (const agent of agents) {
    for (const cat of agent.categories) {
      counts.set(cat.slug, (counts.get(cat.slug) ?? 0) + 1);
    }
  }

  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cat) => ({ ...cat, agentCount: counts.get(cat.slug) ?? 0 }));
}

export async function getCategoryBySlug(
  slug: string
): Promise<{ category: Category; agents: Agent[] } | null> {
  const categories = await getAllCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;

  const agents = (await getEveryAgent()).filter((a) =>
    a.categories.some((c) => c.slug === slug)
  );
  return { category, agents };
}

/**
 * Homepage slots, fully content-driven: agents with `featured: true` (and
 * an unexpired `featuredUntil`, when set) fill up to SLOTS positions,
 * ordered by name; the first is labeled Editor's Pick. Remaining slots are
 * filled with the newest additions.
 */
export async function getHomepageAgents(): Promise<HomepageAgent[]> {
  const SLOTS = 6;
  const now = new Date().toISOString();
  const agents = await getEveryAgent();

  const featured: HomepageAgent[] = agents
    .filter((a) => a.featured && (!a.featuredUntil || a.featuredUntil >= now))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, SLOTS)
    .map((agent, i) => ({
      agent,
      label: i === 0 ? ('editors-pick' as const) : ('featured' as const),
    }));

  const featuredIds = new Set(featured.map((f) => f.agent.id));

  const newest: HomepageAgent[] = agents
    .filter((a) => !featuredIds.has(a.id) && a.createdAt)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, Math.max(0, SLOTS - featured.length))
    .map((agent) => ({ agent, label: 'new' as const }));

  return [...featured, ...newest];
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const raw = await fs.promises.readFile(path.join(CONTENT_DIR, 'site.json'), 'utf8');
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return null;
  }
}

export async function getAgentCount(): Promise<number> {
  return (await getEveryAgent()).length;
}

export async function getTotalSkillsCount(): Promise<number> {
  const agents = await getEveryAgent();
  return agents.reduce((sum, a) => sum + a.skills.length, 0);
}

export async function getUniqueProviderCount(): Promise<number> {
  const agents = await getEveryAgent();
  return new Set(agents.map((a) => a.providerName)).size;
}
