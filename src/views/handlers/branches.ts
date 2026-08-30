import * as vscode from 'vscode';
import { listBranches } from '../../git/refs';
import type { WebviewToHostMessage } from '../../shared/protocol';
import type { PanelContext } from './types';
import { refreshAfterMutation } from './shared';
import { handle as handleLog } from './log';

async function pushList(ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const branches = await listBranches(git);
  ctx.post({ type: 'branches:list', branches });
}

export async function handle(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;

  switch (msg.type) {
    case 'branches:request':
      await pushList(ctx);
      return;

    case 'branches:checkout':
      await git.raw(['checkout', msg.name]);
      await pushList(ctx);
      await refreshAfterMutation(ctx);
      return;

    case 'branches:compare':
      ctx.post({ type: 'setTab', tab: 'log' });
      // Reuses the Log tab's branch filter, which passes its value straight through as a
      // revision range, so "name..HEAD" resolves to "what's on HEAD that name doesn't have".
      await handleLog(
        { type: 'log:request', query: '', filters: [`branch:${msg.name}..HEAD`], append: false },
        ctx,
      );
      return;

    case 'branches:newFrom': {
      const name = await vscode.window.showInputBox({
        prompt: `New branch name from ${msg.base}`,
        validateInput: (v) => (v.trim() ? undefined : 'Branch name is required'),
      });
      if (!name) return;
      await git.raw(['checkout', '-b', name.trim(), msg.base]);
      await pushList(ctx);
      await refreshAfterMutation(ctx);
      return;
    }
  }
}
