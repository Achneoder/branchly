import type { GitService } from './gitService';
import type { BlameLine } from '../shared/protocol';

export interface RawBlameLine {
  line: number;
  hash: string;
  authorName: string;
  authorTime: number;
  content: string;
}

const HEADER = /^([0-9a-f]{40}) (\d+) (\d+)/;

/** Parses `git blame --porcelain <path>` output. */
export function parseBlamePorcelain(raw: string): RawBlameLine[] {
  const lines = raw.split('\n');
  const meta = new Map<string, { authorName: string; authorTime: number }>();
  const result: RawBlameLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const header = HEADER.exec(lines[i]);
    if (!header) {
      i++;
      continue;
    }
    const [, hash, , finalLineRaw] = header;
    const finalLine = Number(finalLineRaw);
    if (!meta.has(hash)) meta.set(hash, { authorName: '', authorTime: 0 });
    i++;
    while (i < lines.length && !lines[i].startsWith('\t')) {
      const entry = lines[i];
      if (entry.startsWith('author ')) meta.get(hash)!.authorName = entry.slice('author '.length);
      else if (entry.startsWith('author-time '))
        meta.get(hash)!.authorTime = Number(entry.slice('author-time '.length));
      i++;
    }
    const content = (lines[i] ?? '').slice(1);
    const info = meta.get(hash)!;
    result.push({
      line: finalLine,
      hash,
      authorName: info.authorName,
      authorTime: info.authorTime,
      content,
    });
    i++;
  }
  return result;
}

export function toBlameLine(raw: RawBlameLine): BlameLine {
  const date = raw.authorTime ? new Date(raw.authorTime * 1000).toISOString().slice(0, 10) : '';
  return {
    line: raw.line,
    hash: raw.hash,
    abbrev: raw.hash.slice(0, 7),
    author: raw.authorName,
    date,
    text: raw.content,
  };
}

export async function getBlame(
  git: GitService,
  path: string,
  signal?: AbortSignal,
  revision?: string,
): Promise<BlameLine[]> {
  const args = ['blame', '--porcelain'];
  if (revision) args.push(revision);
  args.push('--', path);
  const raw = await git.raw(args, signal);
  return parseBlamePorcelain(raw).map(toBlameLine);
}
