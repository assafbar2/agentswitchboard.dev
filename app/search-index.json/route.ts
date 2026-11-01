import { buildSuggestIndex } from '@/lib/autocomplete';
import { getAllCategories, getEveryAgent, getOfficialGroups } from '@/lib/catalog';

export const dynamic = 'force-static';

/** The search box's suggestion index (lib/autocomplete.ts). For the site's own pages, so kept out of search engines. */
export async function GET() {
  // Sequential on purpose: each call reads the whole catalog from disk.
  const agents = await getEveryAgent();
  const categories = await getAllCategories();
  const vendors = await getOfficialGroups();
  return Response.json(buildSuggestIndex(agents, categories, vendors), {
    headers: { 'X-Robots-Tag': 'noindex' },
  });
}
