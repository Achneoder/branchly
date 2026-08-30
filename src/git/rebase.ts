import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GitService } from './gitService';
import type { RebaseStatus, RebaseTodoItem } from '../shared/protocol';

export function buildRebaseTodoFile(items: RebaseTodoItem[]): string {
  return items.map((i) => `${i.action} ${i.hash} ${i.subject}`).join('\n') + '\n';
}

export function getRebaseStatus(gitDir: string): RebaseStatus {
  const mergeDir = join(gitDir, 'rebase-merge');
  const applyDir = join(gitDir, 'rebase-apply');
  if (existsSync(mergeDir)) {
    const onto = readTrim(join(mergeDir, 'onto'));
    const headName = readTrim(join(mergeDir, 'head-name')).replace(/^refs\/heads\//, '');
    const currentStep = Number(readTrim(join(mergeDir, 'msgnum')) || '0');
    const totalSteps = Number(readTrim(join(mergeDir, 'end')) || '0');
    return {
      inProgress: true,
      onto,
      branch: headName,
      currentStep,
      totalSteps,
      conflicted: existsSync(join(mergeDir, 'stopped-sha')),
    };
  }
  if (existsSync(applyDir)) {
    return { inProgress: true, conflicted: existsSync(join(applyDir, 'original-commit')) };
  }
  return { inProgress: false, conflicted: false };
}

function readTrim(path: string): string {
  try {
    return readFileSync(path, 'utf8').trim();
  } catch {
    return '';
  }
}

function quote(value: string): string {
  return process.platform === 'win32' ? `"${value}"` : `'${value}'`;
}

export interface RebaseHandles {
  extensionPath: string;
}

/**
 * Drives `git rebase -i` non-interactively: the todo list and any reword/squash
 * messages are decided up front in the panel, then handed to git via
 * GIT_SEQUENCE_EDITOR / GIT_EDITOR shims (see src/editor/rebaseEditor.ts) so no
 * blocking terminal editor ever opens.
 */
export async function startInteractiveRebase(
  git: GitService,
  base: string,
  items: RebaseTodoItem[],
  handles: RebaseHandles,
  signal?: AbortSignal,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'branchly-rebase-'));
  const todoFile = join(dir, 'git-rebase-todo');
  const msgQueueFile = join(dir, 'messages.json');
  writeFileSync(todoFile, buildRebaseTodoFile(items));

  const messages = items
    .filter((i) => i.action === 'reword' || i.action === 'squash')
    .map((i) => i.subject);
  writeFileSync(msgQueueFile, JSON.stringify(messages));

  const shim = join(handles.extensionPath, 'dist', 'editor', 'rebaseEditor.js');
  const editorCommand = `${quote(process.execPath)} ${quote(shim)}`;

  await git.raw(['rebase', '-i', base], signal, {
    GIT_SEQUENCE_EDITOR: editorCommand,
    GIT_EDITOR: editorCommand,
    BRANCHLY_REBASE_TODO_FILE: todoFile,
    BRANCHLY_REBASE_MSG_QUEUE: msgQueueFile,
  });
}

export async function continueRebase(git: GitService, signal?: AbortSignal): Promise<void> {
  await git.raw(['rebase', '--continue'], signal, { GIT_EDITOR: 'true' });
}

export async function abortRebase(git: GitService, signal?: AbortSignal): Promise<void> {
  await git.raw(['rebase', '--abort'], signal);
}

export async function skipRebase(git: GitService, signal?: AbortSignal): Promise<void> {
  await git.raw(['rebase', '--skip'], signal);
}
