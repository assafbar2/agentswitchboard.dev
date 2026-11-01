import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { changelogProblems, getReleases, parseChangelog } from '@/lib/changelog';
import { inlineMarkdownToText } from '@/lib/inline-markdown';

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

describe('CHANGELOG.md', () => {
  const releases = getReleases();

  it('parses cleanly, newest first', () => {
    expect(changelogProblems(releases)).toEqual([]);
  });

  it('leads with the version in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    expect(releases[0].version).toBe(pkg.version);
  });
});

describe('inlineMarkdownToText', () => {
  it('keeps link labels, code and bold text', () => {
    expect(inlineMarkdownToText('See [/connect](https://agentswitchboard.dev/connect), `x` and **y**.')).toBe(
      'See /connect, x and y.'
    );
  });
});
