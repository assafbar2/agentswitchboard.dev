import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { redirectToCanonicalCard } from '@/lib/card-route';

const req = (path: string) => new NextRequest(new URL(path, 'https://agentswitchboard.dev'));
const CANONICAL = '/stack/card.png?items=agentmail,claude-code&title=My%20stack&v=778e0521';

describe('redirectToCanonicalCard', () => {
  it('renders at the published URL, however the platform encodes it', () => {
    expect(redirectToCanonicalCard(req(CANONICAL), CANONICAL)).toBeNull();
    expect(redirectToCanonicalCard(req('/stack/card.png?items=agentmail%2Cclaude-code&title=My+stack&v=778e0521'), CANONICAL)).toBeNull();
  });

  it.each([
    ['an extra key', `${CANONICAL}&zz=1`],
    ['a stale version', '/stack/card.png?items=agentmail,claude-code&title=My%20stack&v=00000000'],
    ['no version', '/stack/card.png?items=agentmail,claude-code&title=My%20stack'],
    ['another key order', '/stack/card.png?title=My%20stack&items=agentmail,claude-code&v=778e0521'],
  ])('sends %s to the published URL', (_name, path) => {
    const res = redirectToCanonicalCard(req(path), CANONICAL);
    expect(res?.status).toBe(307);
    expect(new URL(res!.headers.get('location')!).search).toBe(new URL(CANONICAL, 'https://x').search);
  });
});
