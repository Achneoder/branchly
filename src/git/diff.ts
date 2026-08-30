import parseDiffLib from 'parse-diff';
import type { GitService } from './gitService';
import type { DiffHunk, DiffLine, FileChange, FileDiff } from '../shared/protocol';

export interface NumstatLine {
  additions: number;
  deletions: number;
  path: string;
  oldPath?: string;
  binary: boolean;
}

const RENAME_BRACE = /^(.*)\{(.*) => (.*)\}(.*)$/;
const RENAME_ARROW = /^(.*) => (.*)$/;

export function parseNumstatPath(raw: string): { path: string; oldPath?: string } {
  const brace = RENAME_BRACE.exec(raw);
  if (brace) {
    const [, prefix, from, to, suffix] = brace;
    return { path: `${prefix}${to}${suffix}`, oldPath: `${prefix}${from}${suffix}` };
  }
  const arrow = RENAME_ARROW.exec(raw);
  if (arrow) {
    return { path: arrow[2], oldPath: arrow[1] };
  }
  return { path: raw };
}

/** Parses `--numstat` output (without `-z`, since renames need the `=>`/`{}` text form). */
export function parseNumstat(raw: string): NumstatLine[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [addRaw, delRaw, pathRaw] = line.split('\t');
      const binary = addRaw === '-' || delRaw === '-';
      const { path, oldPath } = parseNumstatPath(pathRaw ?? '');
      return {
        additions: binary ? 0 : Number(addRaw),
        deletions: binary ? 0 : Number(delRaw),
        path,
        oldPath,
        binary,
      };
    });
}

export function numstatToFileChange(line: NumstatLine, status: FileChange['status']): FileChange {
  return {
    path: line.path,
    oldPath: line.oldPath,
    status,
    additions: line.additions,
    deletions: line.deletions,
  };
}

const BINARY_MARKER = /^Binary files (?:a\/(.+) and b\/(.+)|(.+)) differ$/gm;

function findBinaryPaths(raw: string): Set<string> {
  const paths = new Set<string>();
  for (const m of raw.matchAll(BINARY_MARKER)) {
    if (m[1]) paths.add(m[1]);
    if (m[2]) paths.add(m[2]);
    if (m[3]) paths.add(m[3]);
  }
  return paths;
}

/** Converts a unified diff (as text) into our typed hunk/line shape. */
export function parseUnifiedDiff(raw: string): FileDiff[] {
  const files = parseDiffLib(raw);
  const binaryPaths = findBinaryPaths(raw);
  return files.map((f) => {
    const hunks: DiffHunk[] = f.chunks.map((chunk) => {
      const lines: DiffLine[] = chunk.changes.map((c) => {
        const text = c.content.length > 0 ? c.content.slice(1) : '';
        if (c.type === 'add') {
          return { ln1: null, ln2: c.ln ?? null, type: 'add', text };
        }
        if (c.type === 'del') {
          return { ln1: c.ln ?? null, ln2: null, type: 'del', text };
        }
        return { ln1: c.ln1 ?? null, ln2: c.ln2 ?? null, type: 'context', text };
      });
      return { header: chunk.content, lines };
    });
    const path = f.to && f.to !== '/dev/null' ? f.to : (f.from ?? '');
    const oldPath = f.from && f.from !== '/dev/null' && f.from !== path ? f.from : undefined;
    return {
      path,
      oldPath,
      hunks,
      binary: binaryPaths.has(path) || binaryPaths.has(oldPath ?? ''),
    };
  });
}

/** Builds a synthetic all-additions diff for an untracked file (nothing to diff against). */
export function buildAddedFileDiff(path: string, content: string): FileDiff {
  const lines = content.length ? content.split('\n') : [];
  return {
    path,
    binary: false,
    hunks: [
      {
        header: `@@ -0,0 +1,${lines.length} @@`,
        lines: lines.map((text, i) => ({ ln1: null, ln2: i + 1, type: 'add', text })),
      },
    ],
  };
}

export async function getCommitFiles(
  git: GitService,
  hash: string,
  signal?: AbortSignal,
): Promise<NumstatLine[]> {
  const raw = await git.raw(['show', '--numstat', '--format=', hash], signal);
  return parseNumstat(raw);
}

/** `--numstat` cannot tell A/M/D apart, so status comes from a second, `--name-status` call. */
export function parseNameStatus(raw: string): Map<string, FileChange['status']> {
  const map = new Map<string, FileChange['status']>();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [code, ...rest] = trimmed.split('\t');
    const path = rest[rest.length - 1];
    if (!path) continue;
    map.set(path, code.charAt(0) as FileChange['status']);
  }
  return map;
}

export async function getCommitFileStatuses(
  git: GitService,
  hash: string,
  signal?: AbortSignal,
): Promise<Map<string, FileChange['status']>> {
  const raw = await git.raw(['show', '--name-status', '--format=', hash], signal);
  return parseNameStatus(raw);
}

export async function getCommitFileDiff(
  git: GitService,
  hash: string,
  path: string,
  signal?: AbortSignal,
): Promise<FileDiff | undefined> {
  const raw = await git.raw(['show', '--format=', hash, '--', path], signal);
  return parseUnifiedDiff(raw)[0];
}

/** Diff of the working tree + index against HEAD for a single path. */
export async function getWorkingTreeFileDiff(
  git: GitService,
  path: string,
  signal?: AbortSignal,
): Promise<FileDiff | undefined> {
  const raw = await git.raw(['diff', 'HEAD', '--', path], signal);
  return parseUnifiedDiff(raw)[0];
}
