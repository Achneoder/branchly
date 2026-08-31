import type { FileDiff, StashEntry } from '@shared/protocol';
import { onHostMessage, postToHost } from '../lib/bridge';

function createStashState() {
  let entries = $state<StashEntry[]>([]);
  let selectedIndex = $state<number | undefined>(undefined);
  let diffs = $state<FileDiff[]>([]);
  let composerOpen = $state(false);
  let composerMessage = $state('');
  let keepStaged = $state(false);

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'stash:list':
        entries = msg.entries;
        if (selectedIndex !== undefined && !entries[selectedIndex]) selectedIndex = undefined;
        break;
      case 'stash:diff':
        diffs = msg.diffs;
        break;
      case 'status':
        postToHost({ type: 'stash:request' });
        break;
    }
  });

  postToHost({ type: 'stash:request' });

  return {
    get entries() {
      return entries;
    },
    get selectedIndex() {
      return selectedIndex;
    },
    get diffs() {
      return diffs;
    },
    get composerOpen() {
      return composerOpen;
    },
    get composerMessage() {
      return composerMessage;
    },
    get keepStaged() {
      return keepStaged;
    },
    select(index: number) {
      selectedIndex = index;
      diffs = [];
      postToHost({ type: 'stash:selectEntry', index });
    },
    openComposer() {
      composerOpen = true;
      composerMessage = '';
      keepStaged = false;
    },
    closeComposer() {
      composerOpen = false;
    },
    setComposerMessage(value: string) {
      composerMessage = value;
    },
    setKeepStaged(value: boolean) {
      keepStaged = value;
    },
    create() {
      postToHost({ type: 'stash:create', message: composerMessage, keepStaged });
      composerOpen = false;
    },
    apply(index: number, drop: boolean) {
      postToHost({ type: 'stash:apply', index, drop });
    },
    drop(index: number) {
      postToHost({ type: 'stash:drop', index });
    },
  };
}

export const stashState = createStashState();
