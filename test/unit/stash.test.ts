import { describe, expect, it } from 'vitest';
import { parseStashList, stashKind } from '../../src/git/stash';

const FIELD = '\x1f';

describe('parseStashList', () => {
  it('parses stash entries in order', () => {
    const raw = [
      ['stash@{0}', 'WIP on main: abc Add feature', 'Ana Petrova', '2026-01-02T00:00:00Z'].join(
        FIELD,
      ),
      ['stash@{1}', 'branchly-shelf: cleanup', 'Ana Petrova', '2026-01-01T00:00:00Z'].join(FIELD),
    ].join('\n');
    const stashes = parseStashList(raw);
    expect(stashes).toHaveLength(2);
    expect(stashes[0]).toMatchObject({ ref: 'stash@{0}', index: 0 });
    expect(stashes[1]).toMatchObject({ ref: 'stash@{1}', index: 1 });
  });

  it('returns an empty array for no stashes', () => {
    expect(parseStashList('')).toEqual([]);
  });
});

describe('stashKind', () => {
  it('tags branchly-shelf messages as shelf', () => {
    expect(stashKind('branchly-shelf: WIP')).toBe('shelf');
  });

  it('treats everything else as a plain stash', () => {
    expect(stashKind('WIP on main: abc123 message')).toBe('stash');
  });
});
