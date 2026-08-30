import { describe, expect, it } from 'vitest';
import { zipHunkForSplit } from '../../webview/lib/diffZip';
import type { DiffHunk } from '../../src/shared/protocol';

function line(type: 'context' | 'add' | 'del', text: string) {
  return { ln1: null, ln2: null, type, text };
}

describe('zipHunkForSplit', () => {
  it('mirrors context lines on both sides', () => {
    const hunk: DiffHunk = { header: '', lines: [line('context', 'a'), line('context', 'b')] };
    const rows = zipHunkForSplit(hunk);
    expect(rows).toEqual([
      { left: hunk.lines[0], right: hunk.lines[0] },
      { left: hunk.lines[1], right: hunk.lines[1] },
    ]);
  });

  it('zips an equal-length del/add run side by side', () => {
    const hunk: DiffHunk = {
      header: '',
      lines: [line('del', 'old1'), line('del', 'old2'), line('add', 'new1'), line('add', 'new2')],
    };
    const rows = zipHunkForSplit(hunk);
    expect(rows).toEqual([
      { left: hunk.lines[0], right: hunk.lines[2] },
      { left: hunk.lines[1], right: hunk.lines[3] },
    ]);
  });

  it('pads the shorter side with undefined when del/add counts differ', () => {
    const hunk: DiffHunk = {
      header: '',
      lines: [line('del', 'old1'), line('add', 'new1'), line('add', 'new2')],
    };
    const rows = zipHunkForSplit(hunk);
    expect(rows).toEqual([
      { left: hunk.lines[0], right: hunk.lines[1] },
      { left: undefined, right: hunk.lines[2] },
    ]);
  });

  it('handles a context/change/context sequence', () => {
    const hunk: DiffHunk = {
      header: '',
      lines: [
        line('context', 'ctx1'),
        line('del', 'old'),
        line('add', 'new'),
        line('context', 'ctx2'),
      ],
    };
    const rows = zipHunkForSplit(hunk);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ left: hunk.lines[0], right: hunk.lines[0] });
    expect(rows[1]).toEqual({ left: hunk.lines[1], right: hunk.lines[2] });
    expect(rows[2]).toEqual({ left: hunk.lines[3], right: hunk.lines[3] });
  });
});
