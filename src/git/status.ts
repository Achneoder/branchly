import type { GitService } from './gitService';
import type { FileChange, RepoStatusSummary } from '../shared/protocol';

export interface RawStatusEntry {
  path: string;
  origPath?: string;
  x: string;
  y: string;
  kind: 'ordinary' | 'renamed' | 'unmerged' | 'untracked' | 'ignored';
}

const ORDINARY = /^1 (\S)(\S) \S+ \S+ \S+ \S+ \S+ \S+ (.*)$/;
const RENAMED = /^2 (\S)(\S) \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.*)$/;
const UNMERGED = /^u (\S)(\S) \S+ \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.*)$/;

/** Parses `git status --porcelain=v2 -z` output. */
export function parsePorcelainV2(raw: string): RawStatusEntry[] {
  const tokens = raw.split('\0').filter((t) => t.length > 0);
  const entries: RawStatusEntry[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith('1 ')) {
      const m = ORDINARY.exec(token);
      if (m) entries.push({ path: m[3], x: m[1], y: m[2], kind: 'ordinary' });
    } else if (token.startsWith('2 ')) {
      const m = RENAMED.exec(token);
      if (m) {
        const origPath = tokens[++i];
        entries.push({ path: m[3], origPath, x: m[1], y: m[2], kind: 'renamed' });
      }
    } else if (token.startsWith('u ')) {
      const m = UNMERGED.exec(token);
      if (m) entries.push({ path: m[3], x: m[1], y: m[2], kind: 'unmerged' });
    } else if (token.startsWith('? ')) {
      entries.push({ path: token.slice(2), x: '?', y: '?', kind: 'untracked' });
    } else if (token.startsWith('! ')) {
      entries.push({ path: token.slice(2), x: '!', y: '!', kind: 'ignored' });
    }
  }
  return entries;
}

export function toFileStatus(entry: RawStatusEntry): FileChange['status'] {
  if (entry.kind === 'untracked') return '?';
  if (entry.kind === 'ignored') return '!';
  if (entry.kind === 'unmerged') return 'U';
  if (entry.kind === 'renamed') return 'R';
  const code = entry.y !== '.' ? entry.y : entry.x;
  switch (code) {
    case 'A':
      return 'A';
    case 'D':
      return 'D';
    case 'C':
      return 'C';
    default:
      return 'M';
  }
}

/** True when the change is only staged (index differs from HEAD, worktree matches index). */
export function isStagedOnly(entry: RawStatusEntry): boolean {
  return entry.x !== '.' && entry.x !== '?' && entry.y === '.';
}

export async function getStatusEntries(
  git: GitService,
  signal?: AbortSignal,
): Promise<RawStatusEntry[]> {
  const raw = await git.raw(['status', '--porcelain=v2', '-z'], signal);
  return parsePorcelainV2(raw);
}

export async function getStatusSummary(
  git: GitService,
  signal?: AbortSignal,
): Promise<RepoStatusSummary> {
  const [branch, counts, entries] = await Promise.all([
    git.raw(['rev-parse', '--abbrev-ref', 'HEAD'], signal).catch(() => ''),
    git.raw(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], signal).catch(() => '0\t0'),
    getStatusEntries(git, signal),
  ]);
  const [ahead = '0', behind = '0'] = counts.trim().split(/\s+/);
  const trimmedBranch = branch.trim();
  return {
    // `rev-parse --abbrev-ref HEAD` returns the literal string "HEAD" in detached state;
    // normalize to empty so the UI's "detached" fallback actually applies.
    branch: trimmedBranch === 'HEAD' ? '' : trimmedBranch,
    ahead: Number(ahead) || 0,
    behind: Number(behind) || 0,
    conflictCount: entries.filter((e) => e.kind === 'unmerged').length,
    hasRepo: true,
  };
}
