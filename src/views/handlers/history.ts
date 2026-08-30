import * as vscode from 'vscode';
import * as path from 'node:path';
import { getLog } from '../../git/log';
import { getBlame } from '../../git/blame';
import type { WebviewToHostMessage } from '../../shared/protocol';
import type { PanelContext } from './types';
import { toCommitRows } from './commitRows';

/** Converts an absolute file URI to a repo-relative, forward-slash path, or
 * undefined when it isn't inside the active repository. */
export function toRepoRelativePath(root: string, uri: vscode.Uri): string | undefined {
  const rel = path.relative(root, uri.fsPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return undefined;
  return rel.split(path.sep).join('/');
}

export async function pushActiveFile(
  ctx: PanelContext,
  uri: vscode.Uri | undefined,
): Promise<void> {
  const git = ctx.container.activeGitService;
  const relativePath = git && uri ? toRepoRelativePath(git.root, uri) : undefined;
  ctx.post({ type: 'history:activeFile', path: relativePath });
}

async function pushEntries(ctx: PanelContext, filePath: string): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const signal = ctx.aborts.next('history:entries');
  const raws = await getLog(git, { path: filePath, maxCount: 200 }, signal);
  ctx.post({ type: 'history:entries', path: filePath, entries: toCommitRows(raws) });
}

async function pushBlame(ctx: PanelContext, filePath: string, revision?: string): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const signal = ctx.aborts.next('history:blame');
  const lines = await getBlame(git, filePath, signal, revision);
  ctx.post({ type: 'history:blame', path: filePath, lines });
}

export async function handle(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
  switch (msg.type) {
    case 'history:openFile':
      await Promise.all([pushEntries(ctx, msg.path), pushBlame(ctx, msg.path)]);
      return;
    case 'history:selectCommit':
      await pushBlame(ctx, msg.path, msg.hash);
      return;
  }
}
