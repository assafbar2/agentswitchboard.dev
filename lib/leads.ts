/**
 * Leads for the weekly run: searches that found nothing, and missing-tool
 * requests (lib/missing-tool.ts). Each is one JSON line in the Vercel
 * runtime log, marked `asb_lead`, which the project keeps for 30 days; the
 * weekly run reads them from there and copies them into the ops repo.
 *
 * A lead line carries the words and filters, the surface and a coarse client
 * type. Never the IP address, the full user-agent, or anything else that
 * identifies who asked. Logging never throws or delays the response.
 */

import { bucketClient, type ClientBucket } from './log';

export type LeadKind = 'zero_results' | 'missing_tool';
export type LeadSurface = 'site' | 'rest' | 'mcp';

/** next/headers' read-only headers are not a Headers instance, but have get(). */
type HeaderSource = { get(name: string): string | null } | Record<string, string | string[] | undefined>;

/** Longest text a lead line keeps from any one field. */
export const MAX_LEAD_TEXT = 500;

function header(headers: HeaderSource, name: string): string | undefined {
  if (typeof headers.get === 'function') return (headers as { get(name: string): string | null }).get(name) ?? undefined;
  const value = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? value[0] : value;
}

/** The same test-traffic marks as isOwnTestTraffic() in lib/log.ts. */
function isOwnTest(headers: HeaderSource): boolean {
  return header(headers, 'x-asb-e2e') !== undefined || /\basb-(?:e2e|audit|verify)\b/i.test(header(headers, 'user-agent') ?? '');
}

/** Collapses whitespace, drops control characters and cuts to MAX_LEAD_TEXT. */
export function leadText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LEAD_TEXT);
}

/** Email addresses and phone-like digit runs, which a lead never needs. */
export function withoutContactDetails(text: string): string {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email removed]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[number removed]');
}

function compact(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = typeof value === 'string' ? leadText(withoutContactDetails(value)) : value;
  }
  return out;
}

export function leadLine(
  kind: LeadKind,
  surface: LeadSurface,
  headers: HeaderSource,
  data: Record<string, unknown>
): Record<string, unknown> {
  const client: ClientBucket = bucketClient(header(headers, 'user-agent'));
  const test = isOwnTest(headers);
  return { asb_lead: kind, surface, client, ...(test ? { test: true } : {}), ...compact(data) };
}

export function logLead(
  kind: LeadKind,
  surface: LeadSurface,
  headers: HeaderSource,
  data: Record<string, unknown>
): void {
  try {
    console.log(JSON.stringify(leadLine(kind, surface, headers, data)));
  } catch {
    // logging must never break the request
  }
}

/** Whether a search had anything to find with: words, a task or a filter. */
export function wasSearch(data: Record<string, unknown>): boolean {
  return Object.values(compact(data)).length > 0;
}

/** Logs a search that matched no listing at all, when it asked for something. */
export function logZeroResults(
  surface: LeadSurface,
  headers: HeaderSource,
  total: number,
  data: Record<string, unknown>
): void {
  if (total !== 0 || !wasSearch(data)) return;
  logLead('zero_results', surface, headers, data);
}
