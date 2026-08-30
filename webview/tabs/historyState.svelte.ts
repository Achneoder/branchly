import type { BlameLine, CommitRow } from '@shared/protocol';
import { onHostMessage, postToHost } from '../lib/bridge';

function createHistoryState() {
  let filePath = $state<string | undefined>(undefined);
  let entries = $state<CommitRow[]>([]);
  let blame = $state<BlameLine[]>([]);
  let selectedHash = $state<string | undefined>(undefined);

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'history:activeFile':
        filePath = msg.path;
        selectedHash = undefined;
        entries = [];
        blame = [];
        if (filePath) postToHost({ type: 'history:openFile', path: filePath });
        break;
      case 'history:entries':
        if (msg.path === filePath) entries = msg.entries;
        break;
      case 'history:blame':
        if (msg.path === filePath) blame = msg.lines;
        break;
    }
  });

  return {
    get filePath() {
      return filePath;
    },
    get entries() {
      return entries;
    },
    get blame() {
      return blame;
    },
    get selectedHash() {
      return selectedHash;
    },
    selectCommit(hash: string) {
      if (!filePath) return;
      selectedHash = hash;
      postToHost({ type: 'history:selectCommit', path: filePath, hash });
    },
    showLatest() {
      if (!filePath) return;
      selectedHash = undefined;
      postToHost({ type: 'history:openFile', path: filePath });
    },
  };
}

export const historyState = createHistoryState();
