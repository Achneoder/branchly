import Fuse from 'fuse.js';
import type { CommitDetail, CommitRow, ContextMenuItem, FileDiff } from '@shared/protocol';
import { onHostMessage, postToHost } from '../lib/bridge';

export interface MenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
  hash: string;
}

function createLogState() {
  let rows = $state<CommitRow[]>([]);
  let hasMore = $state(false);
  let query = $state('');
  let filters = $state<string[]>([]);
  let selectedHash = $state<string | undefined>(undefined);
  let selectedPath = $state<string | undefined>(undefined);
  let detail = $state<CommitDetail | undefined>(undefined);
  let diff = $state<FileDiff | undefined>(undefined);
  let menu = $state<MenuState | undefined>(undefined);
  let loading = $state(false);
  let fuse: Fuse<CommitRow> | undefined;

  function request(append: boolean): void {
    loading = true;
    postToHost({ type: 'log:request', query: '', filters, append });
  }

  function selectCommit(hash: string): void {
    selectedHash = hash;
    selectedPath = undefined;
    diff = undefined;
    postToHost({ type: 'log:selectCommit', hash });
  }

  function selectFile(hash: string, filePath: string): void {
    selectedPath = filePath;
    postToHost({ type: 'log:selectFile', hash, path: filePath });
  }

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'log:rows': {
        rows = msg.append ? [...rows, ...msg.rows] : msg.rows;
        hasMore = msg.hasMore;
        loading = false;
        fuse = new Fuse(rows, { keys: ['subject', 'author', 'abbrev', 'hash'], threshold: 0.3 });
        if (!selectedHash && rows.length) selectCommit(rows[0].hash);
        break;
      }
      case 'log:detail':
        detail = msg.detail;
        if (detail.files.length && !selectedPath) {
          selectFile(detail.hash, detail.files[0].path);
        }
        break;
      case 'log:diff':
        diff = msg.diff;
        break;
      case 'menu:open':
        menu = { x: msg.x, y: msg.y, items: msg.items, hash: msg.contextHash };
        break;
      case 'status':
        request(false);
        break;
    }
  });

  request(false);

  const filteredRows = $derived.by(() => {
    const trimmed = query.trim();
    if (!trimmed || !fuse) return rows;
    return fuse.search(trimmed).map((r) => r.item);
  });

  return {
    get rows() {
      return filteredRows;
    },
    get hasMore() {
      return hasMore;
    },
    get query() {
      return query;
    },
    get filters() {
      return filters;
    },
    get selectedHash() {
      return selectedHash;
    },
    get selectedPath() {
      return selectedPath;
    },
    get detail() {
      return detail;
    },
    get diff() {
      return diff;
    },
    get menu() {
      return menu;
    },
    get loading() {
      return loading;
    },
    setQuery(q: string) {
      query = q;
    },
    toggleFilter(f: string) {
      filters = filters.includes(f) ? filters.filter((x) => x !== f) : [...filters, f];
      request(false);
    },
    selectCommit,
    selectFile,
    openContextMenu(hash: string, x: number, y: number) {
      postToHost({ type: 'log:contextMenu', hash, x, y });
    },
    runContextAction(action: string) {
      if (!menu) return;
      postToHost({ type: 'log:contextAction', hash: menu.hash, action });
      menu = undefined;
    },
    closeMenu() {
      menu = undefined;
    },
    loadMore() {
      if (hasMore && !loading) request(true);
    },
  };
}

export const logState = createLogState();
