/**
 * A missing-tool request over plain HTTP: the REST sibling of the MCP
 * request_missing_tool tool (lib/missing-tool.ts).
 *
 *   POST /api/missing-tool   { need, tried?, category?, access? }
 *   → 202 { status: "recorded", message }
 *   → 400 { error: "invalid_request", message }   bad JSON or fields
 *   → 429 { status: "rate_limited", message }      with Retry-After
 *
 * The request is a private lead line for the weekly run. Nothing is
 * published and there is no reply. No auth, open CORS, never cached.
 */

import { logConsumer } from '@/lib/log';
import { missingToolSchema, requestMissingTool } from '@/lib/missing-tool';

const MAX_BODY_BYTES = 8 * 1024;

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function reply(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { ...HEADERS, ...extra } });
}

function invalid(message: string): Response {
  return reply({ error: 'invalid_request', message }, 400);
}

export async function POST(req: Request): Promise<Response> {
  logConsumer('/api/missing-tool', req);

  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return invalid(`The body is over ${MAX_BODY_BYTES} bytes.`);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return invalid('Send a JSON body: { "need": "the job no listing does" }.');
  }
  const parsed = missingToolSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join('.') || 'body';
    return invalid(`${field}: ${issue?.message ?? 'invalid'}. Required: need (10–500 characters).`);
  }

  const outcome = requestMissingTool(parsed.data, 'rest', req.headers);
  if (outcome.status === 'rate_limited') {
    return reply({ status: outcome.status, message: outcome.message }, 429, {
      'Retry-After': String(outcome.retryAfterSeconds),
    });
  }
  return reply({ status: outcome.status, message: outcome.message }, 202);
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: HEADERS });
}
