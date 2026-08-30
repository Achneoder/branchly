import type { ConflictEntry } from '@shared/protocol';
import { onHostMessage, postToHost } from '../lib/bridge';

function createConflictsState() {
  let entries = $state<ConflictEntry[]>([]);
  let selectedPath = $state<string | undefined>(undefined);

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'conflicts:list':
        entries = msg.entries;
        if (!selectedPath || !entries.some((e) => e.path === selectedPath)) {
          selectedPath = entries[0]?.path;
        }
        break;
      case 'status':
        postToHost({ type: 'conflicts:request' });
        break;
    }
  });

  postToHost({ type: 'conflicts:request' });

  const selected = $derived(entries.find((e) => e.path === selectedPath));

  return {
    get entries() {
      return entries;
    },
    get selectedPath() {
      return selectedPath;
    },
    get selected() {
      return selected;
    },
    select(path: string) {
      selectedPath = path;
    },
    acceptOurs(path: string) {
      postToHost({ type: 'conflicts:acceptOurs', path });
    },
    acceptTheirs(path: string) {
      postToHost({ type: 'conflicts:acceptTheirs', path });
    },
    keepBoth(path: string) {
      postToHost({ type: 'conflicts:keepBoth', path });
    },
    openMergeEditor(path: string) {
      postToHost({ type: 'conflicts:openMergeEditor', path });
    },
  };
}

export const conflictsState = createConflictsState();
