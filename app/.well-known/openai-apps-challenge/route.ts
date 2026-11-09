/**
 * OpenAI's plugin portal verifies domain ownership by fetching
 * https://agentswitchboard.dev/.well-known/openai-apps-challenge and expecting
 * the exact token it shows, as plain text and nothing else.
 * Set OPENAI_APPS_CHALLENGE in Vercel to that token and redeploy; 404 until then.
 */

export const dynamic = 'force-dynamic';

export function GET(): Response {
  const token = process.env.OPENAI_APPS_CHALLENGE?.trim();
  if (!token) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  return new Response(token, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
