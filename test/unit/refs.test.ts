import { describe, expect, it } from 'vitest';
import { parseDecoratedRefs, parseForEachRef, parseMergedRefNames } from '../../src/git/refs';

describe('parseDecoratedRefs', () => {
  it('parses HEAD pointer, local branch, remote branch and tag', () => {
    const refs = parseDecoratedRefs([
      'HEAD -> refs/heads/main',
      'refs/remotes/origin/main',
      'tag: refs/tags/v1.0.0',
    ]);
    expect(refs).toEqual([
      { name: 'main', kind: 'local-branch' },
      { name: 'origin/main', kind: 'remote-branch' },
      { name: 'v1.0.0', kind: 'tag' },
    ]);
  });

  it('parses a detached HEAD', () => {
    expect(parseDecoratedRefs(['HEAD'])).toEqual([{ name: 'HEAD', kind: 'head' }]);
  });

  it('returns an empty array for no refs', () => {
    expect(parseDecoratedRefs([])).toEqual([]);
  });
});

describe('parseForEachRef', () => {
  const FIELD = '\x1f';

  function refLine(fields: {
    refname: string;
    head?: string;
    upstream?: string;
    upstreamRemote?: string;
    track?: string;
    hash?: string;
    abbrev?: string;
    subject?: string;
    author?: string;
    date?: string;
  }): string {
    return [
      fields.refname,
      fields.head ?? '',
      fields.upstream ?? '',
      fields.upstreamRemote ?? '',
      fields.track ?? '',
      fields.hash ?? '',
      fields.abbrev ?? '',
      fields.subject ?? '',
      fields.author ?? '',
      fields.date ?? '',
    ].join(FIELD);
  }

  it('parses a local branch with an upstream and ahead/behind tracking', () => {
    const line = refLine({
      refname: 'refs/heads/main',
      head: '*',
      upstream: 'origin/main',
      upstreamRemote: 'origin',
      track: '[ahead 2, behind 5]',
      hash: 'abc123def',
      abbrev: 'abc123d',
      subject: 'Fix bug',
      author: 'Ada Lovelace',
      date: '2026-01-01T00:00:00Z',
    });
    const [branch] = parseForEachRef(line);
    expect(branch).toMatchObject({
      name: 'main',
      kind: 'local',
      isCurrent: true,
      ahead: 2,
      behind: 5,
      upstream: 'origin/main',
      remoteName: 'origin',
      lastCommitHash: 'abc123def',
      lastCommitAbbrev: 'abc123d',
      lastCommitSubject: 'Fix bug',
      lastCommitAuthor: 'Ada Lovelace',
    });
  });

  it('parses a local branch with no upstream', () => {
    const line = refLine({ refname: 'refs/heads/feature', head: '' });
    const [branch] = parseForEachRef(line);
    expect(branch.upstream).toBeUndefined();
    expect(branch.remoteName).toBeUndefined();
    expect(branch.ahead).toBeUndefined();
  });

  it("derives the remote name from a remote branch's ref path", () => {
    const raw = [
      refLine({
        refname: 'refs/remotes/origin/main',
        subject: 'Fix bug',
        author: 'Ada Lovelace',
        date: '2026-01-01T00:00:00Z',
      }),
      refLine({ refname: 'refs/tags/v1', subject: 'Release v1', author: 'Ada Lovelace' }),
    ].join('\n');
    const branches = parseForEachRef(raw);
    expect(branches[0]).toMatchObject({
      name: 'origin/main',
      kind: 'remote',
      isCurrent: false,
      remoteName: 'origin',
      lastCommitSubject: 'Fix bug',
      lastCommitAuthor: 'Ada Lovelace',
    });
    expect(branches[0].upstream).toBeUndefined();
    expect(branches[0].ahead).toBeUndefined();
    expect(branches[1]).toMatchObject({
      name: 'v1',
      kind: 'tag',
      lastCommitSubject: 'Release v1',
    });
    expect(branches[1].upstream).toBeUndefined();
    expect(branches[1].remoteName).toBeUndefined();
  });
});

describe('parseMergedRefNames', () => {
  it('parses newline-separated refnames into a set', () => {
    const raw = 'refs/heads/main\nrefs/heads/feature\n';
    expect(parseMergedRefNames(raw)).toEqual(new Set(['refs/heads/main', 'refs/heads/feature']));
  });

  it('trims whitespace and filters blank lines', () => {
    const raw = '  refs/heads/main  \n\n\nrefs/heads/feature\n';
    expect(parseMergedRefNames(raw)).toEqual(new Set(['refs/heads/main', 'refs/heads/feature']));
  });

  it('returns an empty set for empty input', () => {
    expect(parseMergedRefNames('')).toEqual(new Set());
  });
});
