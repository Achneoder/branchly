import * as vscode from 'vscode';
import * as path from 'node:path';
import { getLog } from '../../git/log';
import {
  getCommitFileDiff,
  getCommitFiles,
  getCommitFileStatuses,
  numstatToFileChange,
} from '../../git/diff';
import { getLogPageSize } from '../../core/config';
import { encodeGitUri } from '../../editor/contentProvider';
import type {
  CommitDetail,
  ContextMenuItem,
  FileChange,
  WebviewToHostMessage,
} from '../../shared/protocol';
import type { PanelContext } from './types';
import { refreshAfterMutation } from './shared';
import { formatDate, toCommitRows } from './commitRows';

interface ParsedFilters {
  revisionRange?: string;
  author?: string;
  since?: string;
  until?: string;
  path?: string;
}

function parseFilters(filters: string[]): ParsedFilters {
  const result: ParsedFilters = {};
  for (const filter of filters) {
    const idx = filter.indexOf(':');
    if (idx === -1) continue;
    const key = filter.slice(0, idx);
    const value = filter.slice(idx + 1);
    if (key === 'branch') result.revisionRange = value;
    else if (key === 'author') result.author = value;
    else if (key === 'since') result.since = value;
    else if (key === 'until') result.until = value;
    else if (key === 'path') result.path = value;
  }
  return result;
}

function buildContextMenu(): ContextMenuItem[] {
  return [
    { id: 'checkoutRevision', label: 'Checkout Revision' },
    { id: 'compareWithLocal', label: 'Compare with Local', keybinding: '⌘D' },
    { id: 'showDiffWithWorkingTree', label: 'Show Diff with Working Tree' },
    { id: 'sep1', label: '', separator: true },
    { id: 'cherryPick', label: 'Cherry-Pick into Current Branch' },
    { id: 'rebaseFromHere', label: 'Interactively Rebase from Here…' },
    { id: 'revertCommit', label: 'Revert Commit' },
    { id: 'sep2', label: '', separator: true },
    { id: 'copyRevisionNumber', label: 'Copy Revision Number', keybinding: '⌘C' },
    { id: 'newBranchFrom', label: 'New Branch from Here…' },
  ];
}

async function openDiffWithWorkingTree(ctx: PanelContext, hash: string): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const files = await getCommitFiles(git, hash);
  const MAX_FILES = 20;
  for (const file of files.slice(0, MAX_FILES)) {
    const localUri = vscode.Uri.file(path.join(git.root, file.path));
    const revisionUri = encodeGitUri(git.root, hash, file.path);
    await vscode.commands.executeCommand(
      'vscode.diff',
      revisionUri,
      localUri,
      `${file.path} (${hash.slice(0, 7)} ↔ Working Tree)`,
    );
  }
  if (files.length > MAX_FILES) {
    void vscode.window.showInformationMessage(
      `Opened the first ${MAX_FILES} of ${files.length} changed files.`,
    );
  }
}

async function runContextAction(hash: string, action: string, ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;

  switch (action) {
    case 'checkoutRevision':
      await git.raw(['checkout', hash]);
      break;
    case 'compareWithLocal':
    case 'showDiffWithWorkingTree':
      await openDiffWithWorkingTree(ctx, hash);
      return;
    case 'cherryPick':
      await git.raw(['cherry-pick', hash]);
      break;
    case 'rebaseFromHere':
      ctx.post({ type: 'setTab', tab: 'rebase' });
      return;
    case 'revertCommit':
      await git.raw(['revert', '--no-edit', hash]);
      break;
    case 'copyRevisionNumber':
      await vscode.env.clipboard.writeText(hash);
      return;
    case 'newBranchFrom': {
      const name = await vscode.window.showInputBox({
        prompt: `New branch name from ${hash.slice(0, 7)}`,
        validateInput: (v) => (v.trim() ? undefined : 'Branch name is required'),
      });
      if (!name) return;
      await git.raw(['checkout', '-b', name.trim(), hash]);
      break;
    }
    default:
      return;
  }
  await refreshAfterMutation(ctx);
}

export async function handle(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;

  switch (msg.type) {
    case 'log:request': {
      const signal = ctx.aborts.next('log:request');
      const pageSize = getLogPageSize();
      const filters = parseFilters(msg.filters);
      const raws = await getLog(
        git,
        {
          maxCount: pageSize,
          revisionRange: filters.revisionRange,
          author: filters.author,
          since: filters.since,
          until: filters.until,
          path: filters.path,
        },
        signal,
      );
      ctx.post({
        type: 'log:rows',
        rows: toCommitRows(raws),
        append: msg.append,
        hasMore: raws.length === pageSize,
      });
      return;
    }
    case 'log:selectCommit': {
      const signal = ctx.aborts.next('log:detail');
      const [raws, numstatFiles, statuses] = await Promise.all([
        getLog(git, { maxCount: 1, revisionRange: msg.hash }, signal),
        getCommitFiles(git, msg.hash, signal),
        getCommitFileStatuses(git, msg.hash, signal),
      ]);
      const commit = raws[0];
      if (!commit) return;
      const files: FileChange[] = numstatFiles.map((f) =>
        numstatToFileChange(f, statuses.get(f.path) ?? 'M'),
      );
      const totalAdd = numstatFiles.reduce((sum, f) => sum + f.additions, 0);
      const totalDel = numstatFiles.reduce((sum, f) => sum + f.deletions, 0);
      const detail: CommitDetail = {
        hash: commit.hash,
        abbrev: commit.hash.slice(0, 7),
        author: commit.authorName,
        authorEmail: commit.authorEmail,
        date: formatDate(commit.authorDate),
        subject: commit.subject,
        body: commit.body,
        stat: `${files.length} file${files.length === 1 ? '' : 's'}, +${totalAdd} −${totalDel}`,
        files,
      };
      ctx.post({ type: 'log:detail', detail });
      return;
    }
    case 'log:selectFile': {
      const signal = ctx.aborts.next('log:diff');
      const diff = await getCommitFileDiff(git, msg.hash, msg.path, signal);
      if (diff) ctx.post({ type: 'log:diff', diff });
      return;
    }
    case 'log:contextMenu': {
      ctx.post({
        type: 'menu:open',
        x: msg.x,
        y: msg.y,
        contextHash: msg.hash,
        items: buildContextMenu(),
      });
      return;
    }
    case 'log:contextAction':
      await runContextAction(msg.hash, msg.action, ctx);
      return;
  }
}
