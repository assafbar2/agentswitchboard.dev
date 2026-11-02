import { describe, expect, it } from 'vitest';
import { impactReport, slugList, type ListingFacts, type Snapshot } from '../scripts/lib/impact';

const OPTS = { base: 'origin/main (abc1234)', minAlternatives: 3, relatedSize: 2, taskPageSize: 2 };

function listing(overrides: Partial<ListingFacts> = {}): ListingFacts {
  return { name: 'x', hash: 'h', icon: true, skills: 2, prompts: 2, setup: [], fallbacks: [], alternatives: [], ...overrides };
}

function before(): Snapshot {
  return {
    listings: {
      alpha: listing({ alternatives: ['beta', 'gamma', 'delta'] }),
      beta: listing({ alternatives: ['alpha', 'gamma', 'delta'] }),
      gamma: listing({ alternatives: ['alpha', 'beta'] }),
      delta: listing({ alternatives: ['alpha', 'beta', 'gamma'] }),
    },
    tasks: [{ slug: 'query', label: 'query a database', fits: ['alpha', 'beta', 'gamma'] }],
    stacks: { starter: ['alpha', 'delta'] },
    homepage: ['alpha', 'beta'],
    pages: 10,
  };
}

describe('impactReport', () => {
  it('says so when no listing changed', () => {
    const report = impactReport(before(), before(), OPTS);
    expect(report).toContain('Compared with `origin/main (abc1234)`: 0 listings added, 0 archived, 0 edited.');
    expect(report).toContain('No listing changed.');
    expect(report).not.toContain('### ');
  });

  it('reports a new listing, an archived one and what moves elsewhere', () => {
    const after = before();
    delete after.listings.delta;
    after.listings.alpha = listing({ alternatives: ['beta', 'gamma', 'echo'] });
    after.listings.beta = listing({ alternatives: ['alpha', 'echo'] });
    after.listings.gamma = listing({ alternatives: ['alpha', 'beta', 'echo'] });
    after.listings.echo = listing({
      icon: false,
      prompts: 0,
      setup: ['setup guide'],
      fallbacks: ['mcp', 'cli'],
      alternatives: ['alpha', 'gamma', 'beta'],
    });
    after.listings.foxtrot = listing({ hash: 'h', alternatives: ['echo'], setup: ['MCP address'] });
    after.tasks = [{ slug: 'query', label: 'query a database', fits: ['foxtrot', 'alpha', 'beta'] }];
    after.homepage = ['alpha', 'echo'];
    after.pages = 12;

    const report = impactReport(before(), after, OPTS);
    expect(report).toContain('2 listings added, 1 archived, 0 edited.');
    expect(report).toContain('| `echo` | none | none | 3, page | no | setup guide |');
    expect(report).toContain('| `foxtrot` | query a database (1st) | 2 | 1 | yes | MCP address |');
    expect(report).toContain('- Fits no task (1): `echo`.');
    expect(report).toContain('- Skills but no Try this first prompts (1): `echo`.');
    expect(report).toContain('- No icon (1): `echo`.');
    expect(report).toContain('- MCP with no address or launch command, so the page shows a setup prompt (1): `echo`.');
    expect(report).toContain('- CLI with no install command, so the page links its docs (1): `echo`.');
    expect(report).not.toContain('API with no base URL');
    expect(report).toContain(
      '- `delta`: its page, share card and alternatives page go away; an alternative on 2 listings; **still in stack `starter`: swap it out**.'
    );
    expect(report).toContain(
      'Alternatives pages: 3 → 3. 1 new listing gets one. 1 existing listing gains one: `gamma`. **1 listing loses its page, and that URL will return 404: `beta`.**'
    );
    expect(report).toContain("3 existing listings' alternatives pages change, and 1 existing listing shows different Related Agents (1 now includes a new listing).");
    expect(report).toContain('The 2 best fits change on 1 of 1 task pages.');
    expect(report).toContain('- query a database: in `foxtrot`; out `beta`');
    expect(report).toContain('Homepage slots, in order: `alpha` and `echo` (were `alpha` and `beta`).');
    expect(report).toContain('The build makes 2 more pages, each with its share card.');
  });

  it('names where a new listing sits on each task page, and the tasks it fits below the top', () => {
    const after = before();
    after.listings.echo = listing();
    after.tasks = [
      { slug: 'query', label: 'query a database', fits: ['alpha', 'echo', 'beta'] },
      { slug: 'search', label: 'search the web', fits: ['alpha', 'beta', 'echo'] },
    ];
    expect(impactReport(before(), after, OPTS)).toContain('| `echo` | query a database (2nd); fits 1 more outside the top 2 |');

    after.tasks = [{ slug: 'query', label: 'query a database', fits: ['alpha', 'beta', 'echo'] }];
    expect(impactReport(before(), after, OPTS)).toContain('| `echo` | fits 1, outside its top 2 |');
  });

  it('folds a long table of new listings away', () => {
    const after = before();
    for (let i = 0; i < 21; i++) after.listings[`new-${i}`] = listing();
    const report = impactReport(before(), after, OPTS);
    expect(report).toContain('<details><summary>All 21 new listings</summary>');
    expect(report.indexOf('</details>')).toBeLessThan(report.indexOf('**Needs a look**'));
  });

  it('counts an edit as a changed listing', () => {
    const after = before();
    after.listings.alpha = listing({ hash: 'changed', alternatives: ['beta', 'gamma', 'delta'] });
    expect(impactReport(before(), after, OPTS)).toContain('0 listings added, 0 archived, 1 edited.');
  });
});

describe('slugList', () => {
  it('joins slugs as code, cutting a long list short', () => {
    expect(slugList(['a'])).toBe('`a`');
    expect(slugList(['a', 'b', 'c'])).toBe('`a`, `b` and `c`');
    expect(slugList(['a', 'b', 'c'], 2)).toBe('`a`, `b` and 1 more');
  });
});
