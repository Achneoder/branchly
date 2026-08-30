import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GitService } from './gitService';

export interface ConflictStages {
  base?: string;
  ours?: string;
  theirs?: string;
}

export async function listConflictedPaths(
  git: GitService,
  signal?: AbortSignal,
): Promise<string[]> {
  const raw = await git.raw(['diff', '--name-only', '--diff-filter=U'], signal);
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function getConflictStages(
  git: GitService,
  path: string,
  signal?: AbortSignal,
): Promise<ConflictStages> {
  const [base, ours, theirs] = await Promise.all([
    git.raw(['show', `:1:${path}`], signal).catch(() => undefined),
    git.raw(['show', `:2:${path}`], signal).catch(() => undefined),
    git.raw(['show', `:3:${path}`], signal).catch(() => undefined),
  ]);
  return { base, ours, theirs };
}

export async function acceptOurs(git: GitService, path: string): Promise<void> {
  await git.raw(['checkout', '--ours', '--', path]);
  await git.raw(['add', '--', path]);
}

export async function acceptTheirs(git: GitService, path: string): Promise<void> {
  await git.raw(['checkout', '--theirs', '--', path]);
  await git.raw(['add', '--', path]);
}

export async function keepBoth(
  git: GitService,
  path: string,
  ours: string,
  theirs: string,
): Promise<void> {
  const merged = `${ours.replace(/\n$/, '')}\n${theirs.replace(/\n$/, '')}\n`;
  writeFileSync(join(git.root, path), merged, 'utf8');
  await git.raw(['add', '--', path]);
}
