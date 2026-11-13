/**
 * A missing-tool request: an agent tells the maintainer that the directory
 * has nothing for a job. Served by the MCP request_missing_tool tool and
 * POST /api/missing-tool. The request is only a private lead line
 * (lib/leads.ts) that the weekly run reads; nothing is published, no issue
 * is opened, and nobody replies.
 */

import { z } from 'zod';
import { logLead, type LeadSurface } from './leads';
import { clientIp, fixedWindowLimiter, type RateLimiter } from './rate-limit';
import { ALL_ACCESS_METHODS } from './search';

export const MISSING_TOOL_LIMITS = {
  perIpPerHour: 10,
  perInstancePerDay: 200,
} as const;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const limiters = {
  ip: fixedWindowLimiter({ limit: MISSING_TOOL_LIMITS.perIpPerHour, windowMs: HOUR }),
  instance: fixedWindowLimiter({ limit: MISSING_TOOL_LIMITS.perInstancePerDay, windowMs: DAY }),
};

export const missingToolInput = {
  need: z
    .string()
    .trim()
    .min(10)
    .max(500)
    .describe(
      'The job no listing does, in plain words (10–500 characters), e.g. "an MCP server that files expense reports in Expensify". Describe the job, not the user.'
    ),
  tried: z
    .string()
    .trim()
    .max(200)
    .describe('The search words that found nothing, if any')
    .optional(),
  category: z.string().trim().max(60).describe('Closest category slug from list_categories, if any').optional(),
  access: z
    .array(z.enum(ALL_ACCESS_METHODS as [string, ...string[]]))
    .max(4)
    .describe('How the agent needs to reach it: api, mcp, cli, browser-extension')
    .optional(),
};

export const missingToolSchema = z.object(missingToolInput).strict();
export type MissingToolInput = z.infer<typeof missingToolSchema>;

export const MISSING_TOOL_DESCRIPTION =
  'Tell the Agent Switchboard maintainer that the directory has nothing for a job. Use it after search_agents ' +
  '(and a task or category, if one fits) found nothing that does what the user needs. The request is recorded ' +
  'privately and read in the weekly review, which uses requests to decide what to look for and add; nothing is ' +
  'published, no issue is opened, and there is no reply. Describe the job, never the user: no names, emails, ' +
  `company details or conversation. Limited to ${MISSING_TOOL_LIMITS.perIpPerHour} requests per hour per caller.`;

export const missingToolOutput = {
  status: z.enum(['recorded', 'rate_limited']),
  message: z.string(),
};

export type MissingToolOutcome =
  | { status: 'recorded'; message: string }
  | { status: 'rate_limited'; message: string; retryAfterSeconds: number };

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

export function requestMissingTool(
  input: MissingToolInput,
  surface: LeadSurface,
  headers: HeaderSource,
  deps: { limits?: { ip: RateLimiter; instance: RateLimiter }; log?: typeof logLead } = {}
): MissingToolOutcome {
  const limits = deps.limits ?? limiters;
  const log = deps.log ?? logLead;

  for (const [key, limiter] of [
    [clientIp(headers), limits.ip],
    ['all', limits.instance],
  ] as const) {
    const taken = limiter.take(key);
    if (!taken.ok) {
      return {
        status: 'rate_limited',
        message: `Too many requests right now. Try again in about ${Math.ceil(taken.retryAfterSeconds / 60)} minutes.`,
        retryAfterSeconds: taken.retryAfterSeconds,
      };
    }
  }

  log('missing_tool', surface, headers, {
    need: input.need,
    tried: input.tried,
    category: input.category,
    access: input.access?.length ? [...new Set(input.access)].join('+') : undefined,
  });

  return {
    status: 'recorded',
    message:
      'Recorded for the weekly review. Nothing was published and there is no reply; if a tool for this is added, it will show up in search_agents.',
  };
}
