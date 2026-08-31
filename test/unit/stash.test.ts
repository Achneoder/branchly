import { describe, expect, it } from 'vitest';
import { buildStashListArgs, parseStashList } from '../../src/git/stash';

const FIELD = '\x1f';

describe('buildStashListArgs', () => {
  it('never passes --date, which would corrupt %gd into a date-based (unusable) ref', () => {
    const args = buildStashListArgs();
    expect(args.some((a) => a.startsWith('--date'))).toBe(false);
    expect(args.some((a) => a.includes('%gd'))).toBe(true);
  });
});

describe('parseStashList', () => {
  it('parses stash entries in order', () => {
    const raw = [
      ['stash@{0}', 'WIP on main: abc Add feature', 'Ana Petrova', '2026-01-02T00:00:00Z'].join(
        FIELD,
      ),
      ['stash@{1}', 'On feature/foo: cleanup', 'Ana Petrova', '2026-01-01T00:00:00Z'].join(FIELD),
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

