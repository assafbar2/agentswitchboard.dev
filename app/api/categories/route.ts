/**
 * Directory categories with live published-agent counts.
 * Slugs are valid `category` inputs for GET /api/agents.
 *
 *   GET /api/categories
 *   → { categories: [ { slug, name, description, agentCount } ] }
 */

import { getAllCategories } from '@/lib/catalog';
import { logConsumer } from '@/lib/log';
import { corsPreflight, jsonResponse, summarizeCategory } from '@/lib/public-api';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  logConsumer('/api/categories', req);
  const categories = await getAllCategories();
  return jsonResponse({
    categories: categories.map(summarizeCategory),
  });
}

export async function OPTIONS(): Promise<Response> {
  return corsPreflight();
}
