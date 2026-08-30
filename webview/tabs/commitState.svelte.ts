import type { ChangelistGroup, FileDiff } from '@shared/protocol';
import { onHostMessage, postToHost } from '../lib/bridge';

function createCommitState() {
  let groups = $state<ChangelistGroup[]>([]);
  let message = $state('');
  let amend = $state(false);
  let selectedPath = $state<string | undefined>(undefined);
  let diff = $state<FileDiff | undefined>(undefined);
  let resultMessage = $state<string | undefined>(undefined);
  let submitting = $state(false);

  onHostMessage((msg) => {
    switch (msg.type) {
      case 'commit:changelists':
        groups = msg.groups;
        message = msg.message;
        amend = msg.amend;
        break;
      case 'commit:diff':
        diff = msg.diff;
        break;
      case 'commit:result':
        submitting = false;
        resultMessage = msg.ok ? undefined : (msg.message ?? 'Commit failed.');
        break;
      case 'status':
        postToHost({ type: 'commit:request' });
        break;
    }
  });

  postToHost({ type: 'commit:request' });

  const totalFiles = $derived(groups.reduce((sum, g) => sum + g.files.length, 0));

  return {
    get groups() {
      return groups;
    },
    get message() {
      return message;
    },
    get amend() {
      return amend;
    },
    get selectedPath() {
      return selectedPath;
    },
    get diff() {
      return diff;
    },
    get resultMessage() {
      return resultMessage;
    },
    get submitting() {
      return submitting;
    },
    get totalFiles() {
      return totalFiles;
    },
    setMessage(value: string) {
      message = value;
      postToHost({ type: 'commit:setMessage', message: value });
    },
    setAmend(value: boolean) {
      amend = value;
      postToHost({ type: 'commit:setAmend', amend: value });
    },
    toggleFile(filePath: string, staged: boolean) {
      postToHost({ type: 'commit:toggleFile', path: filePath, staged });
    },
    selectFile(filePath: string) {
      selectedPath = filePath;
      diff = undefined;
      postToHost({ type: 'commit:selectFile', path: filePath });
    },
    submit(push: boolean) {
      submitting = true;
      resultMessage = undefined;
      postToHost({ type: 'commit:submit', push });
    },
    dismissResult() {
      resultMessage = undefined;
    },
  };
}

export const commitState = createCommitState();
