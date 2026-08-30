import * as vscode from 'vscode';
import { join } from 'node:path';
import type { GitService } from '../../git/gitService';
import {
  acceptOurs,
  acceptTheirs,
  getConflictStages,
  keepBoth,
  listConflictedPaths,
} from '../../git/worktree';
import type { ConflictEntry, WebviewToHostMessage } from '../../shared/protocol';
import type { PanelContext } from './types';
import { refreshAfterMutation } from './shared';

async function buildEntry(git: GitService, path: string): Promise<ConflictEntry> {
  const stages = await getConflictStages(git, path);
  return {
    path,
    panes: [
      { label: 'base', title: 'Base', lines: (stages.base ?? '').split('\n') },
      { label: 'ours', title: 'Ours (local)', lines: (stages.ours ?? '').split('\n') },
      { label: 'theirs', title: 'Theirs (incoming)', lines: (stages.theirs ?? '').split('\n') },
    ],
  };
}

async function pushList(ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const paths = await listConflictedPaths(git);
  const entries = await Promise.all(paths.map((p) => buildEntry(git, p)));
  ctx.post({ type: 'conflicts:list', entries });
}

export async function refresh(ctx: PanelContext): Promise<void> {
  if (ctx.container.activeGitService) await pushList(ctx);
}

export async function handle(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;

  switch (msg.type) {
    case 'conflicts:request':
      await pushList(ctx);
      return;

    case 'conflicts:acceptOurs':
      await acceptOurs(git, msg.path);
      ctx.post({ type: 'conflicts:resolved', path: msg.path });
      await pushList(ctx);
      await refreshAfterMutation(ctx);
      return;

    case 'conflicts:acceptTheirs':
      await acceptTheirs(git, msg.path);
      ctx.post({ type: 'conflicts:resolved', path: msg.path });
      await pushList(ctx);
      await refreshAfterMutation(ctx);
      return;

    case 'conflicts:keepBoth': {
      const stages = await getConflictStages(git, msg.path);
      await keepBoth(git, msg.path, stages.ours ?? '', stages.theirs ?? '');
      ctx.post({ type: 'conflicts:resolved', path: msg.path });
      await pushList(ctx);
      await refreshAfterMutation(ctx);
      return;
    }

    case 'conflicts:openMergeEditor':
      await vscode.commands.executeCommand(
        'git.openMergeEditor',
        vscode.Uri.file(join(git.root, msg.path)),
      );
      return;
  }
}
