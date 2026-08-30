import type { GitService } from './gitService';
import type { StashEntry } from '../shared/protocol';
import { parseNumstat } from './diff';

const FIELD = '\x1f';

export interface RawStash {
  ref: string;
  index: number;
  message: string;
  authorName: string;
  date: string;
}

export function buildStashListArgs(): string[] {
  // %gd (the stash's ordinal ref, e.g. "stash@{0}") silently switches to rendering the
  // reflog *date* instead the moment any `--date=` flag is present on the command, in
  // which case `applyStash`/`dropStash` are handed an unusable ref. Using %ai instead of
  // %ad + --date=iso-strict gets an ISO-ish timestamp without ever setting that flag.
  return ['stash', 'list', `--format=%gd${FIELD}%s${FIELD}%an${FIELD}%ai`];
}

export function parseStashList(raw: string): RawStash[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [ref, message, authorName, date] = line.split(FIELD);
      return {
        ref,
        index: i,
        message: message ?? '',
        authorName: authorName ?? '',
        date: date ?? '',
      };
    });
}

/**
 * git has one stash mechanism; JetBrains' "Shelve" vs. "Stash" distinction is a UI
 * convention only, so we infer it from Branchly's own message prefix.
 */
export function stashKind(message: string): StashEntry['kind'] {
  return message.startsWith('branchly-shelf:') ? 'shelf' : 'stash';
}

export async function listStashes(git: GitService, signal?: AbortSignal): Promise<RawStash[]> {
  const raw = await git.raw(buildStashListArgs(), signal);
  return parseStashList(raw);
}

export async function getStashFileCount(
  git: GitService,
  ref: string,
  signal?: AbortSignal,
): Promise<number> {
  const raw = await git.raw(['stash', 'show', '--numstat', ref], signal);
  return parseNumstat(raw).length;
}

export async function createStash(
  git: GitService,
  message: string,
  keepIndex: boolean,
  signal?: AbortSignal,
): Promise<void> {
  const args = ['stash', 'push', '-u', '-m', message];
  if (keepIndex) args.push('--keep-index');
  await git.raw(args, signal);
}

export async function applyStash(
  git: GitService,
  ref: string,
  drop: boolean,
  signal?: AbortSignal,
): Promise<void> {
  await git.raw(['stash', drop ? 'pop' : 'apply', ref], signal);
}

export async function dropStash(git: GitService, ref: string, signal?: AbortSignal): Promise<void> {
  await git.raw(['stash', 'drop', ref], signal);
}

export async function getStashDiff(
  git: GitService,
  ref: string,
  signal?: AbortSignal,
): Promise<string> {
  return git.raw(['stash', 'show', '-p', ref], signal);
}
