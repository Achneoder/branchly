import { describe, expect, it } from 'vitest';
import {
  buildAddedFileDiff,
  parseNumstat,
  parseNumstatPath,
  parseUnifiedDiff,
} from '../../src/git/diff';

describe('parseNumstatPath', () => {
  it('leaves plain paths untouched', () => {
    expect(parseNumstatPath('src/a.ts')).toEqual({ path: 'src/a.ts' });
  });

  it('parses simple arrow renames', () => {
    expect(parseNumstatPath('src/old.ts => src/new.ts')).toEqual({
      path: 'src/new.ts',
      oldPath: 'src/old.ts',
    });
  });

  it('parses brace renames with shared prefix/suffix', () => {
    expect(parseNumstatPath('src/{old => new}/file.ts')).toEqual({
      path: 'src/new/file.ts',
      oldPath: 'src/old/file.ts',
    });
  });
});

describe('parseNumstat', () => {
  it('parses additions/deletions per file', () => {
    const raw = '12\t4\tsrc/a.ts\n0\t0\tsrc/b.ts\n';
    const lines = parseNumstat(raw);
    expect(lines).toEqual([
      { additions: 12, deletions: 4, path: 'src/a.ts', oldPath: undefined, binary: false },
      { additions: 0, deletions: 0, path: 'src/b.ts', oldPath: undefined, binary: false },
    ]);
  });

  it('marks binary files with dashes as zero-count binary entries', () => {
    const [entry] = parseNumstat('-\t-\tassets/icon.png\n');
    expect(entry).toMatchObject({ additions: 0, deletions: 0, binary: true });
  });
});

describe('parseUnifiedDiff', () => {
  const sample = [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 1111111..2222222 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,3 +1,3 @@',
    ' context line',
    '-removed line',
    '+added line',
    ' trailing context',
    '',
  ].join('\n');

  it('produces one file with typed hunks and lines', () => {
    const [file] = parseUnifiedDiff(sample);
    expect(file.path).toBe('src/a.ts');
    expect(file.hunks).toHaveLength(1);
    const types = file.hunks[0].lines.map((l) => l.type);
    expect(types).toEqual(['context', 'del', 'add', 'context']);
  });

  it('strips the leading +/-/space marker from line text', () => {
    const [file] = parseUnifiedDiff(sample);
    const added = file.hunks[0].lines.find((l) => l.type === 'add');
    expect(added?.text).toBe('added line');
  });
});

describe('buildAddedFileDiff', () => {
  it('renders every line as an addition starting at line 1', () => {
    const diff = buildAddedFileDiff('new.txt', 'a\nb');
    expect(diff.hunks[0].lines).toEqual([
      { ln1: null, ln2: 1, type: 'add', text: 'a' },
      { ln1: null, ln2: 2, type: 'add', text: 'b' },
    ]);
  });

  it('handles empty content without crashing', () => {
    const diff = buildAddedFileDiff('empty.txt', '');
    expect(diff.hunks[0].lines).toEqual([]);
  });

  it('does not render a spurious blank line for content ending in a newline', () => {
    const diff = buildAddedFileDiff('new.txt', 'a\nb\n');
    expect(diff.hunks[0].lines).toEqual([
      { ln1: null, ln2: 1, type: 'add', text: 'a' },
      { ln1: null, ln2: 2, type: 'add', text: 'b' },
    ]);
  });

  it('treats a lone trailing newline as an empty file, not a one-line file', () => {
    const diff = buildAddedFileDiff('empty.txt', '\n');
    expect(diff.hunks[0].lines).toEqual([]);
  });
});
