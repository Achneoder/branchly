import { describe, expect, it } from 'vitest';
import { isStagedOnly, parsePorcelainV2, toFileStatus } from '../../src/git/status';

function z(...tokens: string[]): string {
  return tokens.join('\0') + '\0';
}

describe('parsePorcelainV2', () => {
  it('parses an ordinary modified file', () => {
    const raw = z('1 .M N... 100644 100644 100644 hhh hhh src/a.ts');
    const [entry] = parsePorcelainV2(raw);
    expect(entry).toMatchObject({ path: 'src/a.ts', x: '.', y: 'M', kind: 'ordinary' });
  });

  it('parses a staged addition', () => {
    const raw = z('1 A. N... 000000 100644 100644 000 hhh src/new.ts');
    const [entry] = parsePorcelainV2(raw);
    expect(entry).toMatchObject({ x: 'A', y: '.', kind: 'ordinary' });
    expect(isStagedOnly(entry)).toBe(true);
    expect(toFileStatus(entry)).toBe('A');
  });

  it('parses a rename with the extra origPath token', () => {
    const raw = z('2 R. N... 100644 100644 100644 hhh hhh R100 src/new.ts', 'src/old.ts');
    const [entry] = parsePorcelainV2(raw);
    expect(entry).toMatchObject({ path: 'src/new.ts', origPath: 'src/old.ts', kind: 'renamed' });
    expect(toFileStatus(entry)).toBe('R');
  });

  it('parses unmerged (conflicted) entries', () => {
    const raw = z('u UU N... 100644 100644 100644 100644 h1 h2 h3 src/conflict.ts');
    const [entry] = parsePorcelainV2(raw);
    expect(entry).toMatchObject({ path: 'src/conflict.ts', kind: 'unmerged' });
    expect(toFileStatus(entry)).toBe('U');
  });

  it('parses untracked and ignored entries', () => {
    const raw = z('? new-file.txt') + z('! dist/out.js');
    const entries = parsePorcelainV2(raw);
    expect(entries).toEqual([
      { path: 'new-file.txt', x: '?', y: '?', kind: 'untracked' },
      { path: 'dist/out.js', x: '!', y: '!', kind: 'ignored' },
    ]);
  });

  it('returns an empty array for a clean tree', () => {
    expect(parsePorcelainV2('')).toEqual([]);
  });
});
