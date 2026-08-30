import { describe, expect, it } from 'vitest';
import { buildLogArgs, parseLogOutput } from '../../src/git/log';

const FIELD = '\x1f';
const RECORD = '\x1e';

function record(fields: string[]): string {
  return fields.join(FIELD) + RECORD;
}

describe('parseLogOutput', () => {
  it('parses a single commit record', () => {
    const raw = record([
      'abc123',
      '',
      'Ada Lovelace',
      'ada@example.com',
      '2026-01-01T00:00:00Z',
      'HEAD -> refs/heads/main',
      'Initial commit',
      'Body line 1\nBody line 2',
    ]);
    const commits = parseLogOutput(raw);
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      hash: 'abc123',
      parents: [],
      authorName: 'Ada Lovelace',
      subject: 'Initial commit',
      refs: ['HEAD -> refs/heads/main'],
    });
    expect(commits[0].body).toBe('Body line 1\nBody line 2');
  });

  it('parses multiple parents for a merge commit', () => {
    const raw = record(['m1', 'p1 p2', 'A', 'a@e.com', 'date', '', 'Merge', '']);
    const commits = parseLogOutput(raw);
    expect(commits[0].parents).toEqual(['p1', 'p2']);
  });

  it('parses multiple records back to back', () => {
    const raw =
      record(['h1', '', 'A', 'a@e.com', 'd1', '', 's1', '']) +
      record(['h2', 'h1', 'A', 'a@e.com', 'd2', '', 's2', '']);
    const commits = parseLogOutput(raw);
    expect(commits.map((c) => c.hash)).toEqual(['h1', 'h2']);
    expect(commits[1].parents).toEqual(['h1']);
  });

  it('ignores empty trailing output', () => {
    expect(parseLogOutput('')).toEqual([]);
  });
});

describe('buildLogArgs', () => {
  it('defaults to HEAD with no extra flags', () => {
    const args = buildLogArgs();
    expect(args).toContain('HEAD');
    expect(args).not.toContain('--max-count=undefined');
  });

  it('adds max-count, skip, range and path when provided', () => {
    const args = buildLogArgs({
      maxCount: 50,
      skip: 10,
      revisionRange: 'main..feature',
      path: 'src',
    });
    expect(args).toContain('--max-count=50');
    expect(args).toContain('--skip=10');
    expect(args).toContain('main..feature');
    expect(args.slice(-2)).toEqual(['--', 'src']);
  });

  it('adds author/since/until filters when provided', () => {
    const args = buildLogArgs({ author: 'Ada', since: '2026-01-01', until: '2026-02-01' });
    expect(args).toContain('--author=Ada');
    expect(args).toContain('--since=2026-01-01');
    expect(args).toContain('--until=2026-02-01');
  });
});
