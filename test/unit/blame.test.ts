import { describe, expect, it } from 'vitest';
import { parseBlamePorcelain, toBlameLine } from '../../src/git/blame';

const HASH_A = 'a'.repeat(40);
const HASH_B = 'b'.repeat(40);

describe('parseBlamePorcelain', () => {
  it('parses full metadata on first occurrence and reuses it for repeats', () => {
    const raw = [
      `${HASH_A} 1 1 2`,
      'author Ada Lovelace',
      'author-mail <ada@example.com>',
      'author-time 1735689600',
      'author-tz +0000',
      'summary Initial commit',
      'filename src/a.ts',
      '\tconst a = 1;',
      `${HASH_A} 2 2`,
      '\tconst b = 2;',
      `${HASH_B} 3 3 1`,
      'author Miguel Ortiz',
      'author-time 1735776000',
      'summary Second commit',
      'filename src/a.ts',
      '\tconst c = 3;',
      '',
    ].join('\n');

    const lines = parseBlamePorcelain(raw);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({
      line: 1,
      hash: HASH_A,
      authorName: 'Ada Lovelace',
      content: 'const a = 1;',
    });
    expect(lines[1]).toMatchObject({
      line: 2,
      hash: HASH_A,
      authorName: 'Ada Lovelace',
      content: 'const b = 2;',
    });
    expect(lines[2]).toMatchObject({
      line: 3,
      hash: HASH_B,
      authorName: 'Miguel Ortiz',
      content: 'const c = 3;',
    });
  });

  it('returns an empty array for empty input', () => {
    expect(parseBlamePorcelain('')).toEqual([]);
  });
});

describe('toBlameLine', () => {
  it('formats the abbreviated hash and ISO date', () => {
    const line = toBlameLine({
      line: 1,
      hash: HASH_A,
      authorName: 'Ada',
      authorTime: 1735689600,
      content: 'x',
    });
    expect(line.abbrev).toBe(HASH_A.slice(0, 7));
    expect(line.date).toBe('2025-01-01');
  });
});
