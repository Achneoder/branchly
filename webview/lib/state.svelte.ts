import type { AppearanceState, RepoStatusSummary, TabId } from '@shared/protocol';
import { onHostMessage, postToHost } from './bridge';

function createAppState() {
  let appearance = $state<AppearanceState>({
    theme: 'dark',
    density: 'comfortable',
    monoGraph: false,
    diffMode: 'split',
    showBlameGutter: true,
  });
  let status = $state<RepoStatusSummary>({
    branch: '',
    ahead: 0,
    behind: 0,
    conflictCount: 0,
    hasRepo: false,
  });
  let tab = $state<TabId>('log');
  let branchPopupOpen = $state(false);
  let lastError = $state<string | undefined>(undefined);

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'init':
        appearance = msg.appearance;
        status = msg.status;
        break;
      case 'appearance':
        appearance = msg.appearance;
        break;
      case 'status':
        status = msg.status;
        break;
      case 'error':
        lastError = msg.message;
        break;
    }
  });

  postToHost({ type: 'ready' });

  return {
    get appearance() {
      return appearance;
    },
    get status() {
      return status;
    },
    get tab() {
      return tab;
    },
    get branchPopupOpen() {
      return branchPopupOpen;
    },
    get lastError() {
      return lastError;
    },
    setTab(next: TabId) {
      tab = next;
      postToHost({ type: 'setTab', tab: next });
    },
    setAppearance(patch: Partial<AppearanceState>) {
      postToHost({ type: 'setAppearance', patch });
    },
    openBranchPopup() {
      branchPopupOpen = true;
      postToHost({ type: 'branches:request' });
    },
    closeBranchPopup() {
      branchPopupOpen = false;
    },
    dismissError() {
      lastError = undefined;
    },
  };
}

export const appState = createAppState();
