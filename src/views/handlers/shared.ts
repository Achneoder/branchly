import * as vscode from 'vscode';
import { getStatusSummary } from '../../git/status';
import { listRemoteNames } from '../../git/refs';
import type { GitService } from '../../git/gitService';
import type { RepoStatusSummary } from '../../shared/protocol';
import type { PanelContext } from './types';

export const EMPTY_STATUS: RepoStatusSummary = {
  branch: '',
  ahead: 0,
  behind: 0,
  conflictCount: 0,
  hasRepo: false,
};

export async function getRepoStatus(ctx: PanelContext): Promise<RepoStatusSummary> {
  const git = ctx.container.activeGitService;
  if (!git) return EMPTY_STATUS;
  try {
    return await getStatusSummary(git);
  } catch (err) {
    ctx.container.logger.error('Failed to read repository status', err);
    return EMPTY_STATUS;
  }
}

/** Pushes a fresh status snapshot after a command that mutates repo state (checkout, commit,
 * cherry-pick, revert, stash apply, rebase step, conflict resolution, ...). The webview reacts
 * to the new status by re-requesting whatever list it currently has open. */
export async function refreshAfterMutation(ctx: PanelContext): Promise<void> {
  ctx.post({ type: 'status', status: await getRepoStatus(ctx) });
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function pickRemoteName(git: GitService): Promise<string | undefined> {
  const remotes = await listRemoteNames(git);
  if (remotes.length === 0) {
    void vscode.window.showErrorMessage('No remotes configured for this repository.');
    return undefined;
  }
  if (remotes.length === 1) return remotes[0];
  return vscode.window.showQuickPick(remotes, { placeHolder: 'Select a remote' });
}
