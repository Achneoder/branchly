<script lang="ts">
  import type { BranchItem } from '@shared/protocol';
  import { appState } from './state.svelte';
  import { branchesState } from './branchesState.svelte';

  const GROUPS: { kind: BranchItem['kind']; label: string }[] = [
    { kind: 'local', label: 'Local Branches' },
    { kind: 'remote', label: 'Remote Branches' },
    { kind: 'tag', label: 'Tags' },
  ];

  const grouped = $derived(
    GROUPS.map((g) => ({
      ...g,
      items: branchesState.branches.filter((b) => b.kind === g.kind),
    })).filter((g) => g.items.length > 0),
  );

  function dotColor(item: BranchItem): string {
    if (item.isCurrent) return 'var(--a3)';
    if (item.kind === 'remote') return 'var(--a1)';
    if (item.kind === 'tag') return 'var(--a2)';
    return 'var(--fg3)';
  }

  function meta(item: BranchItem): string {
    const parts: string[] = [];
    if (item.ahead) parts.push(`↑${item.ahead}`);
    if (item.behind) parts.push(`↓${item.behind}`);
    if (parts.length === 0 && item.lastCommitDate) parts.push(item.lastCommitDate.slice(0, 10));
    return parts.join(' ');
  }

  let searchInput: HTMLInputElement | undefined = $state();
  $effect(() => {
    searchInput?.focus();
  });

  function onKeydown(e: KeyboardEvent, item: BranchItem) {
    if (e.key !== 'Enter') return;
    if (e.metaKey || e.ctrlKey) branchesState.newFrom(item.name);
    else if (e.altKey) branchesState.compare(item.name);
    else branchesState.checkout(item.name);
    appState.closeBranchPopup();
  }
</script>

<div class="scrim" role="presentation" onclick={() => appState.closeBranchPopup()}></div>
<div class="popup">
  <div class="search">
    <input
      bind:this={searchInput}
      placeholder="Search branches, tags, remotes…"
      value={branchesState.query}
      oninput={(e) => branchesState.setQuery((e.currentTarget as HTMLInputElement).value)}
    />
  </div>
  <div class="list">
    {#each grouped as group (group.kind)}
      <div class="group-header">{group.label}</div>
      {#each group.items as item (item.name)}
        <div
          class="row"
          role="row"
          tabindex="0"
          onkeydown={(e) => onKeydown(e, item)}
          ondblclick={() => {
            branchesState.checkout(item.name);
            appState.closeBranchPopup();
          }}
        >
          <div class="dot" style="background:{dotColor(item)}"></div>
          <span class="name" class:current={item.isCurrent}>{item.name}</span>
          <div class="spacer"></div>
          <span class="meta">{meta(item)}</span>
        </div>
      {/each}
    {/each}
    {#if branchesState.branches.length === 0}
      <div class="empty">No matches.</div>
    {/if}
  </div>
  <div class="footer">↵ checkout · ⌥↵ compare with current · ⌘↵ new branch from…</div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.28);
    z-index: 60;
  }
  .popup {
    position: fixed;
    left: 12px;
    bottom: 30px;
    width: 390px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 9px;
    box-shadow: var(--shadow);
    overflow: hidden;
    animation: orbpop 0.13s ease-out;
    z-index: 61;
  }
  .search {
    padding: 9px 11px;
    border-bottom: 1px solid var(--border);
  }
  .search input {
    width: 100%;
    box-sizing: border-box;
    padding: 5px 9px;
  }
  .list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 5px 0;
  }
  .group-header {
    height: 22px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fg3);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 9px;
    height: 28px;
    padding: 0 12px;
    cursor: default;
  }
  .row:hover {
    background: var(--hl);
  }
  .dot {
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .name {
    font-family: ui-monospace, monospace;
    color: var(--fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name.current {
    color: var(--a3);
    font-weight: 600;
  }
  .spacer {
    flex: 1;
  }
  .meta {
    font:
      11px ui-monospace,
      monospace;
    color: var(--fg3);
  }
  .empty {
    padding: 20px;
    color: var(--fg3);
    text-align: center;
  }
  .footer {
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    color: var(--fg3);
    font-size: 11px;
  }
</style>
