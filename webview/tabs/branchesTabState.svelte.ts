import type { BranchCommitSummary, BranchItem, ContextMenuItem } from '@shared/protocol';
import { onHostMessage, postToHost } from '../lib/bridge';

export interface BranchSelection {
  name: string;
  kind: BranchItem['kind'];
}

interface MenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
  ref: string;
}

function refFor(item: BranchSelection): string {
  return `${item.kind}:${item.name}`;
}

function createBranchesTabState() {
  let branches = $state<BranchItem[]>([]);
  let selected = $state<BranchSelection | undefined>(undefined);
  let commits = $state<BranchCommitSummary[]>([]);
  let menu = $state<MenuState | undefined>(undefined);

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'branches:list':
        branches = msg.branches;
        break;
      case 'branches:detail':
        if (selected && refFor(selected) === msg.ref) commits = msg.commits;
        break;
      case 'menu:open':
        menu = { x: msg.x, y: msg.y, items: msg.items, ref: msg.contextHash };
        break;
      case 'status':
        postToHost({ type: 'branches:request' });
        break;
    }
  });

  postToHost({ type: 'branches:request' });

  return {
    get branches() {
      return branches;
    },
    get selected() {
      return selected;
    },
    get commits() {
      return commits;
    },
    get menu() {
      return menu;
    },
    select(item: BranchItem) {
      selected = { name: item.name, kind: item.kind };
      commits = [];
      postToHost({ type: 'branches:select', name: item.name, kind: item.kind });
    },
    checkout(name: string, kind: BranchItem['kind']) {
      postToHost({ type: 'branches:checkout', name, kind });
    },
    compare(name: string) {
      postToHost({ type: 'branches:compare', name });
    },
    newFrom(base: string) {
      postToHost({ type: 'branches:newFrom', base });
    },
    deleteBranch(name: string, kind: 'local' | 'remote') {
      postToHost({ type: 'branches:delete', name, kind });
    },
    rename(name: string) {
      postToHost({ type: 'branches:rename', name });
    },
    merge(name: string) {
      postToHost({ type: 'branches:merge', name });
    },
    rebaseOnto(name: string) {
      postToHost({ type: 'branches:rebaseOnto', name });
    },
    push(name: string) {
      postToHost({ type: 'branches:push', name });
    },
    pull() {
      postToHost({ type: 'branches:pull' });
    },
    fetchAll() {
      postToHost({ type: 'branches:fetchAll' });
    },
    setUpstream(name: string) {
      postToHost({ type: 'branches:setUpstream', name });
    },
    openContextMenu(item: BranchItem, x: number, y: number) {
      postToHost({ type: 'branches:contextMenu', ref: refFor(item), x, y });
    },
    runContextAction(action: string) {
      if (!menu) return;
      postToHost({ type: 'branches:contextAction', ref: menu.ref, action });
      menu = undefined;
    },
    closeMenu() {
      menu = undefined;
    },
  };
}

export const branchesTabState = createBranchesTabState();
