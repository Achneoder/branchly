<script lang="ts">
  import { collectFilePaths, folderCheckState, type FileTreeNode } from '../lib/fileTree';
  import { commitState } from './commitState.svelte';
  import CommitFileTree from './CommitFileTree.svelte';

  let { node, depth }: { node: FileTreeNode; depth: number } = $props();

  let expanded = $state(true);
  const childDepth = $derived(node.name ? depth + 1 : depth);
  const checkState = $derived(folderCheckState(node));

  function statusColor(status: string): string {
    if (status === 'A' || status === '?') return 'var(--a2)';
    if (status === 'D') return 'var(--a5)';
    return 'var(--a1)';
  }

  function fileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  function indeterminateAction(el: HTMLInputElement, value: boolean) {
    el.indeterminate = value;
    return {
      update(next: boolean) {
        el.indeterminate = next;
      },
    };
  }

  function toggleFolder(): void {
    commitState.toggleFiles(collectFilePaths(node), checkState !== 'checked');
  }
</script>

{#if node.name}
  <div
    class="folder-row"
    style="padding-left:{12 + depth * 16}px"
    role="row"
    tabindex="0"
    onclick={() => (expanded = !expanded)}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') expanded = !expanded;
    }}
  >
    <span class="disclosure">{expanded ? '▾' : '▸'}</span>
    <input
      type="checkbox"
      checked={checkState === 'checked'}
      use:indeterminateAction={checkState === 'indeterminate'}
      onclick={(e) => e.stopPropagation()}
      onchange={() => toggleFolder()}
    />
    <span class="folder-name">{node.name}</span>
  </div>
{/if}

{#if expanded || !node.name}
  {#each node.children as child (child.path)}
    <CommitFileTree node={child} depth={childDepth} />
  {/each}
  {#each node.files as file (file.path)}
    <div
      class="file-row"
      style="padding-left:{12 + childDepth * 16}px"
      class:selected={file.path === commitState.selectedPath}
      role="row"
      tabindex="0"
      onclick={() => commitState.selectFile(file.path)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') commitState.selectFile(file.path);
      }}
    >
      <span class="disclosure"></span>
      <input
        type="checkbox"
        checked={file.staged}
        onclick={(e) => e.stopPropagation()}
        onchange={(e) =>
          commitState.toggleFile(file.path, (e.currentTarget as HTMLInputElement).checked)}
      />
      <span class="status" style="color:{statusColor(file.status)}">{file.status}</span>
      <span class="path">{fileName(file.path)}</span>
    </div>
  {/each}
{/if}

<style>
  .folder-row,
  .file-row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 26px;
    padding-right: 12px;
    cursor: default;
  }
  .folder-row:hover,
  .file-row:hover {
    background: var(--hl);
  }
  .file-row.selected {
    background: var(--sel);
  }
  .disclosure {
    flex: none;
    width: 10px;
    color: var(--fg3);
  }
  .folder-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg2);
    font-weight: 600;
  }
  .file-row .status {
    flex: none;
    width: 11px;
    text-align: center;
    font:
      600 10px ui-monospace,
      monospace;
  }
  .file-row .path {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg);
  }
</style>
