import {
  applyStash,
  createStash,
  dropStash,
  getStashDiff,
  getStashFileCount,
  listStashes,
  stashKind,
  type RawStash,
} from '../../git/stash';
import { parseUnifiedDiff } from '../../git/diff';
import type { StashEntry, WebviewToHostMessage } from '../../shared/protocol';
import type { PanelContext } from './types';
import { refreshAfterMutation } from './shared';

const BRANCH_PATTERN = /^(?:WIP on|On) ([^:]+):\s*(.*)$/;

function toStashEntry(raw: RawStash, fileCount: number): StashEntry {
  const match = BRANCH_PATTERN.exec(raw.message);
  return {
    index: raw.index,
    ref: raw.ref,
    kind: stashKind(raw.message),
    message: match ? match[2] || raw.message : raw.message,
    branch: match ? match[1] : '',
    date: raw.date,
    fileCount,
  };
}

async function pushList(ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;
  const raws = await listStashes(git);
  const counts = await Promise.all(raws.map((r) => getStashFileCount(git, r.ref).catch(() => 0)));
  ctx.post({ type: 'shelf:list', entries: raws.map((r, i) => toStashEntry(r, counts[i])) });
}

export async function refresh(ctx: PanelContext): Promise<void> {
  if (ctx.container.activeGitService) await pushList(ctx);
}

export async function handle(msg: WebviewToHostMessage, ctx: PanelContext): Promise<void> {
  const git = ctx.container.activeGitService;
  if (!git) return;

  switch (msg.type) {
    case 'shelf:request':
      await pushList(ctx);
      return;

    case 'shelf:selectEntry': {
      const raws = await listStashes(git);
      const entry = raws[msg.index];
      if (!entry) return;
      const raw = await getStashDiff(git, entry.ref);
      ctx.post({ type: 'shelf:diff', diffs: parseUnifiedDiff(raw) });
      return;
    }

    case 'shelf:create':
      await createStash(git, msg.message || 'WIP', msg.keepStaged);
      await pushList(ctx);
      await refreshAfterMutation(ctx);
      return;

    case 'shelf:apply': {
      const raws = await listStashes(git);
      const entry = raws[msg.index];
      if (!entry) return;
      await applyStash(git, entry.ref, msg.drop);
      await pushList(ctx);
      await refreshAfterMutation(ctx);
      return;
    }

    case 'shelf:drop': {
      const raws = await listStashes(git);
      const entry = raws[msg.index];
      if (!entry) return;
      await dropStash(git, entry.ref);
      await pushList(ctx);
      return;
    }
  }
}
