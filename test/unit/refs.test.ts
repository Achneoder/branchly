import { describe, expect, it } from 'vitest';
import { parseDecoratedRefs, parseForEachRef } from '../../src/git/refs';

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

  it('parses local branches with ahead/behind tracking', () => {
    const line = ['refs/heads/main', '*', '[ahead 2, behind 5]', '2026-01-01T00:00:00Z'].join(
      FIELD,
    );
    const [branch] = parseForEachRef(line);
    expect(branch).toMatchObject({
      name: 'main',
      kind: 'local',
      isCurrent: true,
      ahead: 2,
      behind: 5,
    });
  });

  it('parses remote branches and tags without tracking info', () => {
    const raw = [
      ['refs/remotes/origin/main', '', '', 'd1'].join(FIELD),
      ['refs/tags/v1', '', '', 'd2'].join(FIELD),
    ].join('\n');
    const branches = parseForEachRef(raw);
    expect(branches[0]).toMatchObject({ name: 'origin/main', kind: 'remote', isCurrent: false });
    expect(branches[1]).toMatchObject({ name: 'v1', kind: 'tag' });
    expect(branches[0].ahead).toBeUndefined();
  });
});
