/**
 * The MCP submit_listing tool: an assistant files a listing suggestion on a
 * user's behalf. It goes through the same path as the /submit form
 * (lib/submission.ts), so it only ever opens a public GitHub issue for the
 * maintainer to review. Nothing is published by this call.
 */

import { z } from 'zod';
import { getEveryAgent } from './catalog';
import { ALL_ACCESS_METHODS } from './search';
import { clientIp, fixedWindowLimiter, type RateLimiter } from './rate-limit';
import { fileSubmission, type SubmissionResult } from './submission';
import type { Agent } from './types';

export const SUBMIT_LIMITS = {
  perIpPerHour: 5,
  perInstancePerDay: 50,
} as const;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const limiters = {
  ip: fixedWindowLimiter({ limit: SUBMIT_LIMITS.perIpPerHour, windowMs: HOUR }),
  url: fixedWindowLimiter({ limit: 1, windowMs: DAY }),
  instance: fixedWindowLimiter({ limit: SUBMIT_LIMITS.perInstancePerDay, windowMs: DAY }),
};

export const submitListingInput = {
  name: z.string().trim().min(2).max(100).describe('Product name, e.g. "Acme MCP"'),
  url: z
    .string()
    .trim()
    .url()
    .max(500)
    .describe("The product's own homepage, docs, or GitHub repo (https)"),
  description: z
    .string()
    .trim()
    .min(20)
    .max(1500)
    .describe('What it does and who it is for, in plain words (20–1500 characters)'),
  access: z
    .array(z.enum(ALL_ACCESS_METHODS as [string, ...string[]]))
    .max(4)
    .describe('How agents reach it: api, mcp, cli, browser-extension')
    .optional(),
  category: z.string().trim().max(60).describe('Suggested category slug from list_categories').optional(),
  contact_email: z
    .string()
    .trim()
    .email()
    .max(200)
    .describe(
      "Optional. Sent privately to the maintainer for follow-up, never posted. Only include an address the user gave you for this purpose."
    )
    .optional(),
};

export type SubmitListingInput = z.infer<z.ZodObject<typeof submitListingInput>>;

export const SUBMIT_LISTING_DESCRIPTION =
  'Suggest a new listing for the Agent Switchboard directory. This opens a PUBLIC GitHub issue ' +
  'that the maintainer reviews by hand; it does not publish anything. Use it only when the user ' +
  'asks to submit or list a product, after you show them the name, URL, and description you will send ' +
  'and they agree. Call search_agents first: if the product is already listed, tell the user instead. ' +
  `Limited to ${SUBMIT_LIMITS.perIpPerHour} submissions per hour per caller and one per URL per day.`;

export const submitListingOutput = {
  status: z.enum(['filed', 'already_listed', 'rate_limited', 'unavailable']),
  message: z.string(),
  issueUrl: z.string().optional(),
  existingSlug: z.string().optional(),
};

type Output = {
  status: 'filed' | 'already_listed' | 'rate_limited' | 'unavailable';
  message: string;
  issueUrl?: string;
  existingSlug?: string;
};

/** host (no www) + path (no trailing slash), lowercased; '' when not http(s). */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '').toLowerCase();
    return host + path;
  } catch {
    return '';
  }
}

export function findListed(agents: Agent[], url: string): Agent | undefined {
  const target = normalizeUrl(url);
  if (!target) return undefined;
  return agents.find((a) => normalizeUrl(a.agentUrl) === target);
}

export function composeAsk(input: SubmitListingInput): string {
  const lines = [`${input.name} — ${input.url}`];
  if (input.access?.length) lines.push(`Access: ${[...new Set(input.access)].join(', ')}`);
  if (input.category) lines.push(`Suggested category: ${input.category}`);
  lines.push('', input.description);
  return lines.join('\n');
}

function result(output: Output, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
    ...(isError ? { isError: true } : {}),
  };
}

export async function submitListing(
  input: SubmitListingInput,
  headers: Headers | Record<string, string | string[] | undefined>,
  deps: {
    agents?: () => Promise<Agent[]>;
    file?: typeof fileSubmission;
    limits?: { ip: RateLimiter; url: RateLimiter; instance: RateLimiter };
  } = {}
) {
  const agents = await (deps.agents ?? getEveryAgent)();
  const file = deps.file ?? fileSubmission;
  const limits = deps.limits ?? limiters;

  if (!/^https?:\/\//i.test(input.url)) {
    return result({ status: 'unavailable', message: 'The url must start with https:// or http://.' }, true);
  }

  const listed = findListed(agents, input.url);
  if (listed) {
    return result({
      status: 'already_listed',
      message: `${listed.name} is already in the directory. Nothing was filed.`,
      existingSlug: listed.slug,
    });
  }

  for (const [key, limiter] of [
    [clientIp(headers), limits.ip],
    [normalizeUrl(input.url), limits.url],
    ['all', limits.instance],
  ] as const) {
    const taken = limiter.take(key);
    if (!taken.ok) {
      return result(
        {
          status: 'rate_limited',
          message: `Too many submissions right now. Try again in about ${Math.ceil(taken.retryAfterSeconds / 60)} minutes, or use https://agentswitchboard.dev/submit.`,
        },
        true
      );
    }
  }

  const filed: SubmissionResult = await file({
    ask: composeAsk(input),
    email: input.contact_email,
    source: 'mcp',
  });

  if (!filed.ok) {
    return result(
      {
        status: 'unavailable',
        message: 'Submissions are briefly offline. Use https://agentswitchboard.dev/submit or email barnir@agentmail.to.',
      },
      true
    );
  }

  return result({
    status: 'filed',
    message:
      'Filed for review as a public GitHub issue. The maintainer checks it by hand and posts the decision on the issue.',
    issueUrl: filed.issueUrl,
  });
}
