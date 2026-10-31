import { describe, expect, it, vi } from 'vitest';
import {
  composeAsk,
  findListed,
  normalizeUrl,
  submitListing,
  type SubmitListingInput,
} from '@/lib/mcp-submit';
import { fixedWindowLimiter } from '@/lib/rate-limit';
import { withoutMentions, fileSubmission } from '@/lib/submission';
import type { Agent } from '@/lib/types';

const LISTED = { name: 'Playwright MCP', slug: 'playwright-mcp', agentUrl: 'https://github.com/microsoft/playwright-mcp' } as Agent;

const INPUT: SubmitListingInput = {
  name: 'Taskfolk',
  url: 'https://taskfolk.example/',
  description: 'Shared task lists that agents can read and update over MCP.',
  access: ['mcp', 'api', 'mcp'],
  category: 'productivity',
};

function freshLimits() {
  return {
    ip: fixedWindowLimiter({ limit: 2, windowMs: 60_000 }),
    url: fixedWindowLimiter({ limit: 1, windowMs: 60_000 }),
    instance: fixedWindowLimiter({ limit: 10, windowMs: 60_000 }),
  };
}

function deps(
  file: ReturnType<typeof vi.fn<typeof fileSubmission>> = vi.fn<typeof fileSubmission>(async () => ({
    ok: true,
    issueUrl: 'https://github.com/assafbar2/agentswitchboard.dev/issues/9',
  }))
) {
  return { agents: async () => [LISTED], file, limits: freshLimits() };
}

const headers = { 'x-forwarded-for': '203.0.113.7' };

describe('submit_listing', () => {
  it('files through the shared submission path with source "mcp"', async () => {
    const d = deps();
    const res = await submitListing({ ...INPUT, contact_email: 'maker@example.com' }, headers, d);
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toMatchObject({ status: 'filed', issueUrl: expect.stringContaining('/issues/9') });
    expect(d.file).toHaveBeenCalledWith({
      ask: composeAsk({ ...INPUT, contact_email: 'maker@example.com' }),
      email: 'maker@example.com',
      source: 'mcp',
    });
  });

  it('does not file a product that is already listed', async () => {
    const d = deps();
    const res = await submitListing({ ...INPUT, url: 'https://www.github.com/Microsoft/playwright-mcp/' }, headers, d);
    expect(res.structuredContent).toMatchObject({ status: 'already_listed', existingSlug: 'playwright-mcp' });
    expect(d.file).not.toHaveBeenCalled();
  });

  it('rejects non-http URLs without filing', async () => {
    const d = deps();
    const res = await submitListing({ ...INPUT, url: 'javascript:alert(1)' }, headers, d);
    expect(res.isError).toBe(true);
    expect(d.file).not.toHaveBeenCalled();
  });

  it('files one URL once per window, and caps each caller', async () => {
    const d = deps();
    expect((await submitListing(INPUT, headers, d)).structuredContent.status).toBe('filed');
    expect((await submitListing(INPUT, headers, d)).structuredContent.status).toBe('rate_limited');
    // The per-IP budget (2) is now spent, so a different URL is refused too.
    const other = await submitListing({ ...INPUT, url: 'https://other.example' }, headers, d);
    expect(other.structuredContent.status).toBe('rate_limited');
    expect(other.isError).toBe(true);
    expect(d.file).toHaveBeenCalledTimes(1);
  });

  it('reports an outage as a tool error, not a crash', async () => {
    const d = deps(vi.fn<typeof fileSubmission>(async () => ({ ok: false, reason: 'not_configured' })));
    const res = await submitListing(INPUT, headers, d);
    expect(res.isError).toBe(true);
    expect(res.structuredContent.status).toBe('unavailable');
  });
});

describe('composeAsk', () => {
  it('puts name, url, access, and category above the description', () => {
    expect(composeAsk(INPUT)).toBe(
      [
        'Taskfolk — https://taskfolk.example/',
        'Access: mcp, api',
        'Suggested category: productivity',
        '',
        INPUT.description,
      ].join('\n')
    );
  });
});

describe('normalizeUrl / findListed', () => {
  it('ignores www, case, and trailing slashes', () => {
    expect(normalizeUrl('https://WWW.Example.com/Foo/')).toBe('example.com/foo');
    expect(normalizeUrl('ftp://example.com')).toBe('');
    expect(findListed([LISTED], 'http://github.com/microsoft/playwright-mcp')?.slug).toBe('playwright-mcp');
    expect(findListed([LISTED], 'https://github.com/microsoft')).toBeUndefined();
  });
});

describe('withoutMentions', () => {
  it('breaks @mentions but leaves email addresses alone', () => {
    const out = withoutMentions('cc @octocat and @org/team, mail me@example.com');
    expect(out).not.toMatch(/(^|\s)@octocat/);
    expect(out).toContain('@\u200boctocat');
    expect(out).toContain('@\u200borg/team');
    expect(out).toContain('me@example.com');
  });
});
