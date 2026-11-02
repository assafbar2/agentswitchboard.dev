import { describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }));

import { withoutTypedText } from './analytics';

describe('withoutTypedText', () => {
  it('takes what people typed out of the page URL and keeps the page', () => {
    expect(
      withoutTypedText({ type: 'pageview', url: 'https://agentswitchboard.dev/operator?q=read+my+Notion,+ping+me#connect' })
    ).toEqual({ type: 'pageview', url: 'https://agentswitchboard.dev/operator#connect' });
    expect(withoutTypedText({ type: 'event', url: 'https://agentswitchboard.dev/browse?q=postgres&task=query-a-database' }).url).toBe(
      'https://agentswitchboard.dev/browse?task=query-a-database'
    );
    expect(withoutTypedText({ type: 'pageview', url: 'https://agentswitchboard.dev/stack?items=github&title=My+tools' }).url).toBe(
      'https://agentswitchboard.dev/stack?items=github'
    );
  });

  it('leaves a URL with nothing typed in it as it was', () => {
    const event = { type: 'pageview', url: 'https://agentswitchboard.dev/compare?a=github&b=linear' };
    expect(withoutTypedText(event)).toBe(event);
  });
});
