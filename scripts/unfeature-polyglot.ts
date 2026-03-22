import * as dotenv from 'dotenv';
import * as path from 'path';
import { getAppToken } from './get-cma-token';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID!;
const BASE = `https://api.contentful.com/spaces/${SPACE_ID}/environments/master`;

async function run() {
  const token = await getAppToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/vnd.contentful.management.v1+json',
  };

  // Fetch the entry
  const res = await fetch(`${BASE}/entries/4JfBf3QmQAzPBzzNidjqqh`, { headers });
  const entry = await res.json() as any;
  const version = entry.sys.version;

  // Set featured = false
  entry.fields.featured = { 'en-US': false };
  entry.fields.featuredUntil = { 'en-US': undefined };

  // Update
  const updateRes = await fetch(`${BASE}/entries/4JfBf3QmQAzPBzzNidjqqh`, {
    method: 'PUT',
    headers: { ...headers, 'X-Contentful-Version': String(version) },
    body: JSON.stringify({ fields: entry.fields }),
  });
  const updated = await updateRes.json() as any;
  if (!updateRes.ok) throw new Error(`Update failed: ${JSON.stringify(updated)}`);
  console.log(`Updated Polyglot to v${updated.sys.version}, featured=${updated.fields.featured?.['en-US']}`);

  // Re-publish
  const pubRes = await fetch(`${BASE}/entries/4JfBf3QmQAzPBzzNidjqqh/published`, {
    method: 'PUT',
    headers: { ...headers, 'X-Contentful-Version': String(updated.sys.version) },
  });
  const pub = await pubRes.json() as any;
  if (!pubRes.ok) throw new Error(`Publish failed: ${JSON.stringify(pub)}`);
  console.log(`✅ Polyglot Translate unfeatured and republished`);
}

run().catch(console.error);
