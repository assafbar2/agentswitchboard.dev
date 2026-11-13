import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  changelogProblems,
  EVERY_RELEASE_HIGHLIGHTS_SINCE,
  getReleases,
  HIGHLIGHTS_SINCE,
  highlightedReleases,
  MAX_HIGHLIGHTS,
  parseChangelog,
  tryItProblems,
} from '@/lib/changelog';
import { escapeHtml, inlineMarkdownToHtml, inlineMarkdownToText } from '@/lib/inline-markdown';

const SAMPLE = `# Changelog

Intro text for GitHub readers.

## [1.1.0] - 2026-02-01 - Second

### Added
- A [link](https://agentswitchboard.dev/connect) and \`code\`.
  Continued on the next line.

### Fixed
- One fix.

## [1.0.0] - 2026-01-01 - First

### Added
- Launch.
`;

describe('parseChangelog', () => {
  it('reads releases, sections, bullets and continuation lines', () => {
    const releases = parseChangelog(SAMPLE);
    expect(releases.map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);
    expect(releases[0]).toMatchObject({ date: '2026-02-01', title: 'Second' });
    expect(releases[0].sections.map((s) => s.name)).toEqual(['Added', 'Fixed']);
    expect(releases[0].sections[0].items).toEqual([
      'A [link](https://agentswitchboard.dev/connect) and `code`. Continued on the next line.',
    ]);
    expect(changelogProblems(releases)).toEqual([]);
  });

  it('rejects headings, sections and lines it does not understand', () => {
    expect(() => parseChangelog('## 1.0.0 - 2026-01-01')).toThrow(/release headings/);
    expect(() => parseChangelog('## [1.0.0] - 2026-01-01 - X\n### Improved\n- y')).toThrow(/unknown section/);
    expect(() => parseChangelog('## [1.0.0] - 2026-01-01 - X\n- orphan')).toThrow(/Section/);
    expect(() => parseChangelog('## [1.0.0] - 2026-01-01 - X\n### Added\nloose text')).toThrow(/expected/);
  });

  it('flags out-of-order versions and dates', () => {
    const releases = parseChangelog(
      '## [1.0.0] - 2026-02-01 - A\n### Added\n- a\n## [1.1.0] - 2026-01-01 - B\n### Added\n- b'
    );
    expect(changelogProblems(releases)).toEqual([expect.stringMatching(/newest first/)]);
  });
});

const highlight = (text: string, path = '/browse') => `- ${text} [Try it](https://agentswitchboard.dev${path})`;

function release(version: string, lines: string[]): string {
  return [`## [${version}] - 2026-03-01 - Third`, ...lines].join('\n');
}

describe('highlights', () => {
  it('splits each line into what you can do and the path to try it, query and hash kept', () => {
    const [r] = parseChangelog(
      release(HIGHLIGHTS_SINCE, [
        '### Highlights',
        highlight('Search with `?q=`.', '/browse?q=postgres&verified=1#results'),
        highlight('See the home page.', '/'),
        '### Added',
        '- The search.',
      ])
    );
    expect(r.highlights).toEqual([
      { text: 'Search with `?q=`.', tryIt: '/browse?q=postgres&verified=1#results' },
      { text: 'See the home page.', tryIt: '/' },
    ]);
    expect(r.sections.map((s) => s.name)).toEqual(['Added']);
    expect(changelogProblems([r])).toEqual([]);
  });

  it('needs a Try it link on this site at the end of every line', () => {
    const parse = (line: string) => () => parseChangelog(release(HIGHLIGHTS_SINCE, ['### Highlights', line, '### Added', '- x']));
    expect(parse('- No link at all.')).toThrow(/ends with a \[Try it\]/);
    expect(parse('- Elsewhere. [Try it](https://example.com/page)')).toThrow(/ends with a \[Try it\]/);
    expect(parse('- Link first. [Try it](https://agentswitchboard.dev/browse) then more')).toThrow(/ends with a \[Try it\]/);
  });

  it('come once, before the other sections', () => {
    const twice = release(HIGHLIGHTS_SINCE, ['### Highlights', highlight('a'), '### Highlights', highlight('b'), '### Added', '- x']);
    const late = release(HIGHLIGHTS_SINCE, ['### Added', '- x', '### Highlights', highlight('a')]);
    expect(() => parseChangelog(twice)).toThrow(/comes once, before the other sections/);
    expect(() => parseChangelog(late)).toThrow(/comes once, before the other sections/);
  });

  it(`are required on x.y.0 releases from ${HIGHLIGHTS_SINCE} on, and capped at ${MAX_HIGHLIGHTS}`, () => {
    expect(changelogProblems(parseChangelog(release(HIGHLIGHTS_SINCE, ['### Added', '- x'])))).toEqual([
      `${HIGHLIGHTS_SINCE}: every x.y.0 release from ${HIGHLIGHTS_SINCE} on opens with "### Highlights"`,
    ]);
    expect(changelogProblems(parseChangelog(release('2.1.9', ['### Added', '- x'])))).toEqual([]);
    expect(changelogProblems(parseChangelog(release('2.2.10', ['### Fixed', '- x'])))).toEqual([]);
    const many = Array.from({ length: MAX_HIGHLIGHTS + 1 }, (_, i) => highlight(`Thing ${i}.`));
    expect(changelogProblems(parseChangelog(release(HIGHLIGHTS_SINCE, ['### Highlights', ...many, '### Added', '- x'])))).toEqual([
      `${HIGHLIGHTS_SINCE}: ${MAX_HIGHLIGHTS + 1} highlights; keep it to ${MAX_HIGHLIGHTS}`,
    ]);
  });

  it(`are required on every release from ${EVERY_RELEASE_HIGHLIGHTS_SINCE} on, patches too`, () => {
    for (const version of [EVERY_RELEASE_HIGHLIGHTS_SINCE, '2.9.7', '2.10.0', '3.0.1']) {
      expect(changelogProblems(parseChangelog(release(version, ['### Fixed', '- x'])))).toEqual([
        `${version}: every release from ${EVERY_RELEASE_HIGHLIGHTS_SINCE} on opens with "### Highlights"`,
      ]);
    }
    expect(changelogProblems(parseChangelog(release('2.9.7', ['### Highlights', highlight('a'), '### Fixed', '- x'])))).toEqual([]);
  });

  it('leave out the releases without any', () => {
    const releases = parseChangelog(
      [release('2.2.0', ['### Highlights', highlight('a'), '### Added', '- x']), release('2.1.0', ['### Added', '- y'])].join('\n')
    );
    expect(highlightedReleases(releases).map((r) => r.version)).toEqual(['2.2.0']);
  });
});

describe('tryItProblems', () => {
  const releases = parseChangelog(
    release('2.2.0', [
      '### Highlights',
      highlight('Browse.', '/browse?q=x#top'),
      highlight('Home.', '/#i-need-an-agent-to'),
      highlight('Gone.', '/agents/removed-listing'),
      '### Added',
      '- x',
    ])
  );

  it('checks the path of each link against the pages the build generates, ignoring query and hash', () => {
    expect(tryItProblems(releases, new Set(['/', '/browse']))).toEqual([
      '2.2.0: Try it /agents/removed-listing is not a page the build generates',
    ]);
  });
});

describe('CHANGELOG.md', () => {
  const releases = getReleases();

  it('parses cleanly, newest first', () => {
    expect(changelogProblems(releases)).toEqual([]);
  });

  it('leads with the version in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(releases[0].version).toBe(pkg.version);
  });

  it('makes every highlight link a page, not an API route or file', () => {
    const tries = highlightedReleases(releases).flatMap((r) => r.highlights.map((h) => h.tryIt));
    expect(tries.length).toBeGreaterThan(0);
    expect(tries.filter((t) => /^\/(api\/|.*\.(json|xml|txt|md|png)(?:[?#]|$))/.test(t))).toEqual([]);
  });
});

describe('inlineMarkdownToText', () => {
  it('keeps link labels, code and bold text', () => {
    expect(inlineMarkdownToText('See [/connect](https://agentswitchboard.dev/connect), `x` and **y**.')).toBe(
      'See /connect, x and y.'
    );
  });
});

describe('inlineMarkdownToHtml', () => {
  it('turns links, code and bold into HTML and escapes everything else', () => {
    expect(inlineMarkdownToHtml('See [/connect](https://agentswitchboard.dev/connect?a=1&b=2), `<x>` and **y & z**.')).toBe(
      'See <a href="https://agentswitchboard.dev/connect?a=1&amp;b=2">/connect</a>, <code>&lt;x&gt;</code> and <strong>y &amp; z</strong>.'
    );
    expect(inlineMarkdownToHtml('Plain "quotes" & <tags>')).toBe('Plain &quot;quotes&quot; &amp; &lt;tags&gt;');
  });

  it('escapes the four characters HTML and XML attributes need', () => {
    expect(escapeHtml(`a & b < c > d "e"`)).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
  });
});
