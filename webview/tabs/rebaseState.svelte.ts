import type { RebaseStatus, RebaseTodoItem } from '@shared/protocol';
import { onHostMessage, postToHost } from '../lib/bridge';

const ACTIONS: RebaseTodoItem['action'][] = ['pick', 'reword', 'squash', 'fixup', 'drop'];

function createRebaseState() {
  let status = $state<RebaseStatus>({ inProgress: false, conflicted: false });
  let todo = $state<RebaseTodoItem[]>([]);
  let base = $state('');
  let preview = $state<{ text: string; color: string }[]>([]);
  let dragIndex = $state<number | undefined>(undefined);

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'rebase:status':
        status = msg.status;
        break;
      case 'rebase:todo':
        todo = msg.items;
        base = msg.base;
        break;
      case 'rebase:preview':
        preview = msg.items;
        break;
      case 'status':
        postToHost({ type: 'rebase:request' });
        break;
    }
  });

  postToHost({ type: 'rebase:request' });

  return {
    get status() {
      return status;
    },
    get todo() {
      return todo;
    },
    get base() {
      return base;
    },
    get preview() {
      return preview;
    },
    get dragIndex() {
      return dragIndex;
    },
    cycleAction(id: string) {
      const item = todo.find((t) => t.id === id);
      if (!item) return;
      const next = ACTIONS[(ACTIONS.indexOf(item.action) + 1) % ACTIONS.length];
      postToHost({ type: 'rebase:setAction', id, action: next });
    },
    startDrag(index: number) {
      dragIndex = index;
    },
    dropAt(index: number) {
      if (dragIndex === undefined || dragIndex === index) {
        dragIndex = undefined;
        return;
      }
      postToHost({ type: 'rebase:reorder', fromIndex: dragIndex, toIndex: index });
      dragIndex = undefined;
    },
    start() {
      postToHost({ type: 'rebase:start', base });
    },
    continueRebase() {
      postToHost({ type: 'rebase:continue' });
    },
    abort() {
      postToHost({ type: 'rebase:abort' });
    },
    skip() {
      postToHost({ type: 'rebase:skip' });
    },
  };
}

export const rebaseState = createRebaseState();
