import { isAbsolute, join } from 'node:path';
import { getLog } from '../../git/log';
import type { GitService } from '../../git/gitService';
import {
  abortRebase,
  continueRebase,
  getRebaseStatus,
  skipRebase,
  startInteractiveRebase,
} from '../../git/rebase';
import type { RebaseTodoItem, WebviewToHostMessage } from '../../shared/protocol';
import type { PanelContext } from './types';
import { refreshAfterMutation } from './shared';

interface RebasePanelState {
  base: string;
  todo: RebaseTodoItem[];
}

const stateByRoot = new Map<string, RebasePanelState>();

function getState(root: string): RebasePanelState {
  let state = stateByRoot.get(root);
  if (!state) {
    state = { base: 'HEAD~10', todo: [] };
    stateByRoot.set(root, state);
  }
  return state;
}

async function resolveGitDir(git: GitService): Promise<string> {
  const out = (await git.raw(['rev-parse', '--git-dir'])).trim();
  return isAbsolute(out) ? out : join(git.root, out);
}

async function resolveDefaultBase(git: GitService): Promise<string> {
  try {
    await git.raw(['rev-parse', '--verify', '@{u}']);
    return '@{u}';
  } catch {
    return 'HEAD~10';
  }
}

function actionColor(action: RebaseTodoItem['action']): string {
  switch (action) {
    case 'pick':
      return 'var(--a2)';
    case 'reword':
      return 'var(--a1)';
    case 'squash':
    case 'fixup':
      return 'var(--a4)';
    case 'drop':
      return 'var(--a5)';
  }
}

/** A squash/fixup folds its subject into the previous surviving commit, so it never
 * gets its own row in the "what history will look like" preview. */
function buildPreview(todo: RebaseTodoItem[]): { text: string; color: string }[] {
  return todo
    .filter((item) => item.action !== 'drop' && item.action !== 'squash' && item.action !== 'fixup')
    .map((item) => ({ text: item.subject, color: actionColor(item.action) }));
}

async function pushTodo(ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const state = getState(git.root);
  ctx.post({ type: 'rebase:todo', items: state.todo, base: state.base });
  ctx.post({ type: 'rebase:preview', items: buildPreview(state.todo) });
}

async function loadTodoFromLog(ctx: PanelContext, git: GitService): Promise<void> {
  const state = getState(git.root);
  const raws = await getLog(git, { revisionRange: `${state.base}..HEAD` });
  state.todo = raws
    .slice()
    .reverse()
    .map((c) => ({
      id: c.hash,
      action: 'pick' as const,
      hash: c.hash,
      abbrev: c.hash.slice(0, 7),
      subject: c.subject,
      author: c.authorName,
    }));
  await pushTodo(ctx);
}

export async function refresh(ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const gitDir = await resolveGitDir(git);
  ctx.post({ type: 'rebase:status', status: getRebaseStatus(gitDir) });
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function handle(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const state = getState(git.root);

  switch (msg.type) {
    case 'rebase:request': {
      const gitDir = await resolveGitDir(git);
      const status = getRebaseStatus(gitDir);
      ctx.post({ type: 'rebase:status', status });
      if (!status.inProgress) {
        if (state.todo.length === 0) state.base = await resolveDefaultBase(git);
        await loadTodoFromLog(ctx, git);
      }
      return;
    }

    case 'rebase:reorder': {
      const [item] = state.todo.splice(msg.fromIndex, 1);
      if (item) state.todo.splice(msg.toIndex, 0, item);
      await pushTodo(ctx);
      return;
    }

    case 'rebase:setAction': {
      const item = state.todo.find((i) => i.id === msg.id);
      if (item) item.action = msg.action;
      await pushTodo(ctx);
      return;
    }

    case 'rebase:start':
      try {
        await startInteractiveRebase(git, msg.base, state.todo, {
          extensionPath: ctx.extensionUri.fsPath,
        });
      } catch (err) {
        ctx.post({ type: 'error', message: describeError(err) });
      }
      state.todo = [];
      await refresh(ctx);
      await refreshAfterMutation(ctx);
      return;

    case 'rebase:continue':
      try {
        await continueRebase(git);
      } catch (err) {
        ctx.post({ type: 'error', message: describeError(err) });
      }
      await refresh(ctx);
      await refreshAfterMutation(ctx);
      return;

    case 'rebase:abort':
      await abortRebase(git);
      state.todo = [];
      await refresh(ctx);
      await refreshAfterMutation(ctx);
      return;

    case 'rebase:skip':
      try {
        await skipRebase(git);
      } catch (err) {
        ctx.post({ type: 'error', message: describeError(err) });
      }
      await refresh(ctx);
      await refreshAfterMutation(ctx);
      return;
  }
}
