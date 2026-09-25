import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildIndex,
  findMatches,
  githubRepoOf,
  hostChanged,
  hostOf,
  lastDropDate,
  latestByKey,
  ledgerKey,
  ledgerVerdict,
  lookbackDays,
  normalizeName,
  parseCandidate,
  parseLedger,
  type LedgerEntry,
} from './weekly';

describe('lastDropDate', () => {
  it('takes the max subject date, not the most recent commit', () => {
    // Real history shape: a Jun 15 subject committed after the Jul 31 drop,
    // and a merge commit on top of the Sep 18 drop.
    const subjects = [
      'Merge pull request #108 from assafbar2/weekly-drop-2026-09-18',
      'Weekly drop 2026-09-18: added 30, updated 2',
      'Weekly drop 2026-09-13: added 31, updated 0 (#99)',
      'Weekly drop 2026-06-15: added Sentry MCP',
      'Weekly drop 2026-07-31: added 30, updated 1 (#11)',
    ];
    expect(lastDropDate(subjects)).toBe('2026-09-18');
  });

  it('ignores non-drop subjects and old formats', () => {
    expect(lastDropDate(['Weekly drop May 22, 2026: added 23 agents', 'chore: clear weekly-drop'])).toBeNull();
    expect(lastDropDate([])).toBeNull();
  });
});

describe('lookbackDays', () => {
  it('counts days since the last drop', () => {
    expect(lookbackDays('2026-09-18', '2026-09-25')).toBe(7);
  });
  it('caps at 14 and floors at 1', () => {
    expect(lookbackDays('2026-08-01', '2026-09-25')).toBe(14);
    expect(lookbackDays('2026-09-25', '2026-09-25')).toBe(1);
  });
  it('uses the cap with no prior drop', () => {
    expect(lookbackDays(null, '2026-09-25')).toBe(14);
  });
  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-10-02', -7)).toBe('2026-09-25');
  });
});

describe('url helpers', () => {
  it('hostOf strips www and lowercases', () => {
    expect(hostOf('https://WWW.Browserless.io/docs')).toBe('browserless.io');
    expect(hostOf('not a url')).toBeNull();
  });

  it('githubRepoOf handles URLs, owner/repo, and non-repo paths', () => {
    expect(githubRepoOf('https://github.com/Garrytan/GBrain/tree/master')).toBe('garrytan/gbrain');
    expect(githubRepoOf('https://github.com/block/goose.git')).toBe('block/goose');
    expect(githubRepoOf('mobile-next/mobile-mcp')).toBe('mobile-next/mobile-mcp');
    expect(githubRepoOf('https://github.com/orgs/foo')).toBeNull();
    expect(githubRepoOf('https://github.com/bytedance')).toBeNull();
    expect(githubRepoOf('https://gitlab.com/a/b')).toBeNull();
  });

  it('hostChanged ignores www and scheme, flags real moves', () => {
    expect(hostChanged('http://mcp-use.com', 'https://www.mcp-use.com/')).toBe(false);
    expect(hostChanged('https://mcp-use.com', 'https://manufact.com/')).toBe(true);
  });

  it('normalizeName collapses punctuation and case', () => {
    expect(normalizeName('Mobile MCP')).toBe(normalizeName('mobile-mcp'));
  });
});

describe('findMatches', () => {
  const index = buildIndex([
    { slug: 'goose', name: 'Goose', agentUrl: 'https://github.com/block/goose', providerUrl: 'https://block.xyz' },
    { slug: 'jev-ultrafast', name: 'Jev Ultrafast', agentUrl: 'https://browser-use.com/jev', providerUrl: 'https://browser-use.com' },
    { slug: 'framelink', name: 'Framelink', status: 'archived', agentUrl: 'https://github.com/GLips/Figma-Context-MCP', providerUrl: 'https://framelink.ai' },
    { slug: 'qm', name: 'qm', agentUrl: 'https://github.com/yc-software/qm', providerUrl: 'https://github.com/yc-software' },
  ]);

  it('matches by repo even when the name differs', () => {
    expect(findMatches(index, { name: 'Figma Context MCP', url: 'https://github.com/glips/figma-context-mcp' })).toEqual([
      { slug: 'framelink', kind: 'repo', status: 'archived' },
    ]);
  });

  it('matches by normalized name and slug', () => {
    const m = findMatches(index, { name: 'GOOSE' });
    expect(m.map((x) => x.kind).sort()).toEqual(['name', 'slug']);
  });

  it('reports host-only matches as weak (same company, maybe another product)', () => {
    expect(findMatches(index, { name: 'Browser Use Cloud', url: 'https://browser-use.com/cloud' })).toEqual([
      { slug: 'jev-ultrafast', kind: 'host', status: 'published' },
    ]);
  });

  it('never matches on shared hosts like github.com', () => {
    expect(findMatches(index, { name: 'Something', url: 'https://github.com/other/thing' })).toEqual([]);
  });

  it('returns nothing for a genuinely new product', () => {
    expect(findMatches(index, { name: 'GBrain', url: 'https://github.com/garrytan/gbrain' })).toEqual([]);
  });
});

describe('parseCandidate', () => {
  it('splits name and ref', () => {
    expect(parseCandidate('Cohere | https://cohere.com')).toEqual({ name: 'Cohere', url: 'https://cohere.com' });
    expect(parseCandidate('Mobile MCP\tmobile-next/mobile-mcp')).toEqual({ name: 'Mobile MCP', repo: 'mobile-next/mobile-mcp' });
  });
  it('accepts a bare URL or repo', () => {
    expect(parseCandidate('https://parallel.ai')).toEqual({ url: 'https://parallel.ai' });
    expect(parseCandidate('garrytan/gbrain')).toEqual({ repo: 'garrytan/gbrain' });
    expect(parseCandidate('Solid')).toEqual({ name: 'Solid' });
  });
});

describe('ledger', () => {
  const e = (over: Partial<LedgerEntry>): LedgerEntry => ({ key: 'k', name: 'n', status: 'rejected', date: '2026-09-25', ...over });

  it('keys by repo, then non-shared host, then name', () => {
    expect(ledgerKey({ name: 'X', url: 'https://github.com/A/B' })).toBe('a/b');
    expect(ledgerKey({ name: 'Ando', url: 'https://www.ando.so/' })).toBe('ando.so');
    expect(ledgerKey({ name: 'Some Tool', url: 'https://github.com/' })).toBe('name:sometool');
  });

  it('parses JSONL, skipping comments and malformed lines', () => {
    const text = [
      '# header',
      JSON.stringify(e({ key: 'a' })),
      '{not json',
      JSON.stringify({ key: 'b', status: 'bogus' }),
      '',
      JSON.stringify(e({ key: 'c', status: 'watch' })),
    ].join('\n');
    expect(parseLedger(text).map((x) => x.key)).toEqual(['a', 'c']);
  });

  it('later records win per key', () => {
    const latest = latestByKey([e({ status: 'watch', date: '2026-09-18' }), e({ status: 'added', date: '2026-10-02' })]);
    expect(latest.get('k')?.status).toBe('added');
  });

  it('verdicts: new, skip until due, recheck when due, added is final', () => {
    expect(ledgerVerdict(undefined, '2026-09-25')).toBe('new');
    expect(ledgerVerdict(e({ recheckAfter: '2026-10-23' }), '2026-09-25')).toBe('skip');
    expect(ledgerVerdict(e({ recheckAfter: '2026-10-23' }), '2026-10-23')).toBe('recheck');
    expect(ledgerVerdict(e({}), '2027-01-01')).toBe('skip');
    expect(ledgerVerdict(e({ status: 'added', recheckAfter: '2026-01-01' }), '2027-01-01')).toBe('skip');
  });
});
