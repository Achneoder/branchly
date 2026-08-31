import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildAddedFileDiff, getWorkingTreeFileDiff } from '../../git/diff';
import type { GitService } from '../../git/gitService';
import { getStatusEntries, toFileStatus, type RawStatusEntry } from '../../git/status';
import { createStash } from '../../git/stash';
import type { ChangelistGroup, FileChange, WebviewToHostMessage } from '../../shared/protocol';
import type { PanelContext } from './types';
import { refreshAfterMutation } from './shared';

interface CommitPanelState {
  /** Files the user has opted into the next commit. Not git state: staging only
   * happens at commit time (`git add`), so the working index is never rewritten
   * just from ticking a checkbox. Tracked changes default to included; untracked
   * files default to excluded, matching typical VCS UX. */
  selection: Map<string, boolean>;
  message: string;
  amend: boolean;
}

const stateByRoot = new Map<string, CommitPanelState>();

function getState(root: string): CommitPanelState {
  let state = stateByRoot.get(root);
  if (!state) {
    state = { selection: new Map(), message: '', amend: false };
    stateByRoot.set(root, state);
  }
  return state;
}

function toFileChange(entry: RawStatusEntry): FileChange {
  return {
    path: entry.path,
    oldPath: entry.origPath,
    status: toFileStatus(entry),
    additions: 0,
    deletions: 0,
  };
}

async function pushChangelists(ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const entries = (await getStatusEntries(git)).filter((e) => e.kind !== 'ignored');
  const state = getState(git.root);

  const seen = new Set(entries.map((e) => e.path));
  for (const key of state.selection.keys()) {
    if (!seen.has(key)) state.selection.delete(key);
  }
  for (const entry of entries) {
    if (!state.selection.has(entry.path)) {
      state.selection.set(entry.path, entry.kind !== 'untracked');
    }
  }

  const defaultGroup: ChangelistGroup = { id: 'default', name: 'Default Changelist', files: [] };
  const untrackedGroup: ChangelistGroup = { id: 'untracked', name: 'Unversioned Files', files: [] };
  for (const entry of entries) {
    const file = { ...toFileChange(entry), staged: state.selection.get(entry.path) ?? false };
    (entry.kind === 'untracked' ? untrackedGroup : defaultGroup).files.push(file);
  }

  ctx.post({
    type: 'commit:changelists',
    groups: [defaultGroup, untrackedGroup].filter((g) => g.files.length > 0),
    amend: state.amend,
    message: state.message,
  });
}

export async function refresh(ctx: PanelContext): Promise<void> {
  if (ctx.container.activeGitService) await pushChangelists(ctx);
}

/** Selection is keyed by `entry.path` (a rename's *new* path), so a selected rename needs
 * its `origPath` added back in before it's handed to `git add`/`git stash push` — otherwise
 * the old side of the rename is left out of the pathspec entirely. */
async function resolveSelectedPaths(git: GitService, state: CommitPanelState): Promise<string[]> {
  const selected = [...state.selection.entries()]
    .filter(([, included]) => included)
    .map(([p]) => p);
  if (selected.length === 0) return selected;
  const selectedSet = new Set(selected);
  const entries = await getStatusEntries(git);
  const paths = new Set(selected);
  for (const entry of entries) {
    if (entry.kind === 'renamed' && entry.origPath && selectedSet.has(entry.path)) {
      paths.add(entry.origPath);
    }
  }
  return [...paths];
}

export async function handle(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const state = getState(git.root);

  switch (msg.type) {
    case 'commit:request':
      await pushChangelists(ctx);
      return;

    case 'commit:toggleFile':
      state.selection.set(msg.path, msg.staged);
      await pushChangelists(ctx);
      return;

    case 'commit:toggleFiles':
      for (const p of msg.paths) state.selection.set(p, msg.staged);
      await pushChangelists(ctx);
      return;

    case 'commit:setMessage':
      state.message = msg.message;
      return;

    case 'commit:setAmend':
      state.amend = msg.amend;
      return;

    case 'commit:selectFile': {
      const signal = ctx.aborts.next('commit:diff');
      const entries = await getStatusEntries(git, signal);
      const entry = entries.find((e) => e.path === msg.path);
      if (entry?.kind === 'untracked') {
        const content = readFileSync(join(git.root, msg.path), 'utf8');
        ctx.post({ type: 'commit:diff', diff: buildAddedFileDiff(msg.path, content) });
        return;
      }
      const diff = await getWorkingTreeFileDiff(git, msg.path, signal);
      if (diff) ctx.post({ type: 'commit:diff', diff });
      return;
    }

    case 'commit:submit': {
      const selected = await resolveSelectedPaths(git, state);
      if (selected.length === 0) {
        ctx.post({ type: 'commit:result', ok: false, message: 'No files selected to commit.' });
        return;
      }
      if (!state.message.trim() && !state.amend) {
        ctx.post({ type: 'commit:result', ok: false, message: 'A commit message is required.' });
        return;
      }
      try {
        await git.raw(['add', '--', ...selected]);
        const args = ['commit'];
        if (state.amend) args.push('--amend');
        if (state.message.trim()) args.push('-m', state.message);
        else args.push('--no-edit');
        await git.raw(args);
        if (msg.push) await git.raw(['push']);
        state.message = '';
        state.amend = false;
        ctx.post({ type: 'commit:result', ok: true });
        await refreshAfterMutation(ctx);
        await pushChangelists(ctx);
      } catch (err) {
        ctx.post({
          type: 'commit:result',
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    case 'commit:stashSelected': {
      const selected = await resolveSelectedPaths(git, state);
      if (selected.length === 0) {
        ctx.post({ type: 'commit:result', ok: false, message: 'No files selected to stash.' });
        return;
      }
      try {
        await createStash(git, msg.message || 'WIP', false, undefined, selected);
        ctx.post({ type: 'commit:result', ok: true });
        await refreshAfterMutation(ctx);
        await pushChangelists(ctx);
      } catch (err) {
        ctx.post({
          type: 'commit:result',
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }
  }
}
