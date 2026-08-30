import type { DiffHunk, DiffLine } from '@shared/protocol';

export interface SplitRow {
  left?: DiffLine;
  right?: DiffLine;
}

/**
 * Pairs up a unified hunk's lines into left/right rows for the split diff view:
 * context lines mirror on both sides, and consecutive del/add runs are zipped
 * side by side (padding the shorter run with a blank cell) instead of stacking
 * every deletion above every addition.
 */
export function zipHunkForSplit(hunk: DiffHunk): SplitRow[] {
  const rows: SplitRow[] = [];
  const lines = hunk.lines;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'context') {
      rows.push({ left: line, right: line });
      i++;
      continue;
    }

    const dels: DiffLine[] = [];
    while (i < lines.length && lines[i].type === 'del') {
      dels.push(lines[i]);
      i++;
    }
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i].type === 'add') {
      adds.push(lines[i]);
      i++;
    }

    const max = Math.max(dels.length, adds.length);
    for (let j = 0; j < max; j++) {
      rows.push({ left: dels[j], right: adds[j] });
    }
  }

  return rows;
}
