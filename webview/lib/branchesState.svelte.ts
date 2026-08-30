import type { BranchItem } from '@shared/protocol';
import { onHostMessage, postToHost } from './bridge';

function createBranchesState() {
  let branches = $state<BranchItem[]>([]);
  let query = $state('');

  onHostMessage((msg) => {
    if (msg.type === 'branches:list') branches = msg.branches;
  });

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  });

  return {
    get branches() {
      return filtered;
    },
    get query() {
      return query;
    },
    setQuery(value: string) {
      query = value;
    },
    checkout(name: string) {
      postToHost({ type: 'branches:checkout', name });
    },
    compare(name: string) {
      postToHost({ type: 'branches:compare', name });
    },
    newFrom(base: string) {
      postToHost({ type: 'branches:newFrom', base });
    },
  };
}

export const branchesState = createBranchesState();
