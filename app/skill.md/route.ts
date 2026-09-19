import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-static';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET(): Promise<Response> {
  const body = await readFile(path.join(process.cwd(), 'public/skill.md'), 'utf8');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      ...CORS,
    },
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}
