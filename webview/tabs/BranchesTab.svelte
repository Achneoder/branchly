<script lang="ts">
  import type { BranchItem } from '@shared/protocol';
  import { branchesTabState } from './branchesTabState.svelte';
  import ContextMenu from '../lib/ContextMenu.svelte';
  import PaneResizer from '../lib/PaneResizer.svelte';
  import { getViewState, setViewState } from '../lib/bridge';

  const DEFAULT_LIST_WIDTH = 300;
  const MIN_LIST_WIDTH = 160;
  const MIN_DETAIL_WIDTH = 240;

  const storedWidth = getViewState('branches.listWidth', DEFAULT_LIST_WIDTH);
  let listWidth = $state(
    typeof storedWidth === 'number' && Number.isFinite(storedWidth)
      ? Math.max(MIN_LIST_WIDTH, storedWidth)
      : DEFAULT_LIST_WIDTH,
  );
  let tabWidth = $state(0);
  const maxListWidth = $derived(
    tabWidth > 0 ? Math.max(MIN_LIST_WIDTH, tabWidth - MIN_DETAIL_WIDTH) : 640,
  );

  function setListWidth(width: number) {
    listWidth = width;
    setViewState('branches.listWidth', width);
  }

  $effect(() => {
    if (listWidth > maxListWidth) setListWidth(maxListWidth);
  });

  interface RemoteGroup {
    remoteName: string;
    items: BranchItem[];
  }

  const localItems = $derived(branchesTabState.branches.filter((b) => b.kind === 'local'));
  const tagItems = $derived(branchesTabState.branches.filter((b) => b.kind === 'tag'));
  const remoteGroups = $derived.by<RemoteGroup[]>(() => {
    const remotes = branchesTabState.branches.filter((b) => b.kind === 'remote');
    const groups: RemoteGroup[] = [];
    for (const item of remotes) {
      const remoteName = item.remoteName ?? item.name.slice(0, item.name.indexOf('/'));
      const group = groups.find((g) => g.remoteName === remoteName);
      if (group) group.items.push(item);
      else groups.push({ remoteName, items: [item] });
    }
    return groups.sort((a, b) => a.remoteName.localeCompare(b.remoteName));
  });

  const selected = $derived(
    branchesTabState.branches.find(
      (b) =>
        branchesTabState.selected &&
        b.name === branchesTabState.selected.name &&
        b.kind === branchesTabState.selected.kind,
    ),
  );

  function isSelected(item: BranchItem): boolean {
    return (
      branchesTabState.selected?.name === item.name && branchesTabState.selected?.kind === item.kind
    );
  }

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
</script>

<div class="branches-tab" bind:clientWidth={tabWidth}>
  <div class="list-col" style="width:{listWidth}px">
    <div class="list-header">
      <span>Branches</span>
      <div class="spacer"></div>
      <button class="new-btn" onclick={() => branchesTabState.fetchAll()}>Fetch All</button>
    </div>
    <div class="list">
      {#if localItems.length > 0}
        <div class="group-header">Local Branches</div>
        {#each localItems as item (item.name)}
          <div
            class="row"
            class:selected={isSelected(item)}
            role="row"
            tabindex="0"
            onclick={() => branchesTabState.select(item)}
            oncontextmenu={(e) => {
              e.preventDefault();
              branchesTabState.select(item);
              branchesTabState.openContextMenu(item, e.clientX, e.clientY);
            }}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') branchesTabState.select(item);
            }}
          >
            <div class="dot" style="background:{dotColor(item)}"></div>
            <span class="name" class:current={item.isCurrent} title={item.name}>{item.name}</span>
            {#if item.merged && !item.isCurrent}
              <span class="merged" title="Merged into current branch">✓</span>
            {/if}
            <div class="spacer"></div>
            <span class="meta">{meta(item)}</span>
          </div>
        {/each}
      {/if}
      {#each remoteGroups as group (group.remoteName)}
        <div class="group-header">Remote: {group.remoteName}</div>
        {#each group.items as item (item.name)}
          <div
            class="row"
            class:selected={isSelected(item)}
            role="row"
            tabindex="0"
            onclick={() => branchesTabState.select(item)}
            oncontextmenu={(e) => {
              e.preventDefault();
              branchesTabState.select(item);
              branchesTabState.openContextMenu(item, e.clientX, e.clientY);
            }}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') branchesTabState.select(item);
            }}
          >
            <div class="dot" style="background:{dotColor(item)}"></div>
            <span class="name" title={item.name}>{item.name}</span>
            <div class="spacer"></div>
            <span class="meta">{meta(item)}</span>
          </div>
        {/each}
      {/each}
      {#if tagItems.length > 0}
        <div class="group-header">Tags</div>
        {#each tagItems as item (item.name)}
          <div
            class="row"
            class:selected={isSelected(item)}
            role="row"
            tabindex="0"
            onclick={() => branchesTabState.select(item)}
            oncontextmenu={(e) => {
              e.preventDefault();
              branchesTabState.select(item);
              branchesTabState.openContextMenu(item, e.clientX, e.clientY);
            }}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') branchesTabState.select(item);
            }}
          >
            <div class="dot" style="background:{dotColor(item)}"></div>
            <span class="name" title={item.name}>{item.name}</span>
            <div class="spacer"></div>
            <span class="meta">{meta(item)}</span>
          </div>
        {/each}
      {/if}
      {#if branchesTabState.branches.length === 0}
        <div class="empty">No branches.</div>
      {/if}
    </div>
  </div>

  <PaneResizer
    width={listWidth}
    min={MIN_LIST_WIDTH}
    max={maxListWidth}
    defaultWidth={DEFAULT_LIST_WIDTH}
    onResize={setListWidth}
    label="Resize branch list"
  />

  <div class="detail-col">
    {#if selected}
      <div class="detail-header">
        <div class="title-row">
          <span class="title">{selected.name}</span>
          {#if selected.isCurrent}<span class="badge">current</span>{/if}
        </div>
        <div class="sub">
          {#if selected.kind === 'local'}
            {#if selected.upstream}
              tracking {selected.upstream}
              {#if selected.ahead}<span class="ahead">↑{selected.ahead}</span>{/if}
              {#if selected.behind}<span class="behind">↓{selected.behind}</span>{/if}
            {:else}
              no upstream
            {/if}
          {:else if selected.kind === 'remote'}
            remote branch on {selected.remoteName}
          {:else}
            tag
          {/if}
        </div>
        <div class="actions">
          {#if selected.kind === 'tag'}
            <button onclick={() => branchesTabState.checkout(selected.name, 'tag')}>Checkout</button
            >
            <button onclick={() => branchesTabState.newFrom(selected.name)}
              >New Branch from Here…</button
            >
          {:else if selected.kind === 'remote'}
            <button onclick={() => branchesTabState.checkout(selected.name, 'remote')}
              >Checkout</button
            >
            <button onclick={() => branchesTabState.compare(selected.name)}
              >Compare with Current</button
            >
            <button onclick={() => branchesTabState.newFrom(selected.name)}
              >New Branch from Here…</button
            >
            <button
              class="danger"
              onclick={() => branchesTabState.deleteBranch(selected.name, 'remote')}
              >Delete on Remote…</button
            >
          {:else if selected.isCurrent}
            <button onclick={() => branchesTabState.push(selected.name)}
              >{selected.upstream ? 'Push' : 'Publish Branch…'}</button
            >
            <button onclick={() => branchesTabState.pull()}>Pull</button>
            <button onclick={() => branchesTabState.setUpstream(selected.name)}
              >Set Upstream…</button
            >
            <button onclick={() => branchesTabState.newFrom(selected.name)}
              >New Branch from Here…</button
            >
            <button onclick={() => branchesTabState.rename(selected.name)}>Rename…</button>
          {:else}
            <button onclick={() => branchesTabState.checkout(selected.name, 'local')}
              >Checkout</button
            >
            <button onclick={() => branchesTabState.compare(selected.name)}
              >Compare with Current</button
            >
            <button onclick={() => branchesTabState.merge(selected.name)}>Merge into Current</button
            >
            <button onclick={() => branchesTabState.rebaseOnto(selected.name)}
              >Rebase Current onto This</button
            >
            <button onclick={() => branchesTabState.push(selected.name)}
              >{selected.upstream ? 'Push' : 'Publish Branch…'}</button
            >
            <button onclick={() => branchesTabState.setUpstream(selected.name)}
              >Set Upstream…</button
            >
            <button onclick={() => branchesTabState.rename(selected.name)}>Rename…</button>
            <button
              class="danger"
              onclick={() => branchesTabState.deleteBranch(selected.name, 'local')}>Delete…</button
            >
          {/if}
        </div>
      </div>
      <div class="commits">
        {#each branchesTabState.commits as commit (commit.hash)}
          <div class="commit-row">
            <span class="hash">{commit.abbrev}</span>
            <span class="subject">{commit.subject}</span>
            <span class="author">{commit.author}</span>
            <span class="date">{commit.date}</span>
          </div>
        {/each}
        {#if branchesTabState.commits.length === 0}
          <div class="empty">No commits.</div>
        {/if}
      </div>
    {:else}
      <div class="empty">Select a branch to see details.</div>
    {/if}
  </div>

  {#if branchesTabState.menu}
    <ContextMenu
      x={branchesTabState.menu.x}
      y={branchesTabState.menu.y}
      items={branchesTabState.menu.items}
      onSelect={(id) => branchesTabState.runContextAction(id)}
      onClose={() => branchesTabState.closeMenu()}
    />
  {/if}
</div>

<style>
  .branches-tab {
    flex: 1;
    min-height: 0;
    display: flex;
    position: relative;
  }

  .list-col {
    flex: none;
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .list-header {
    height: 32px;
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    color: var(--fg2);
  }
  .spacer {
    flex: 1;
  }
  .new-btn {
    color: var(--a1);
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
    border-left: 2px solid transparent;
  }
  .row:hover {
    background: var(--hl);
  }
  .row.selected {
    background: var(--sel);
    border-left-color: var(--a1);
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
  .merged {
    flex: none;
    color: var(--a2);
    font-size: 10px;
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

  .detail-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .detail-header {
    flex: none;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .title {
    font-family: ui-monospace, monospace;
    font-size: 13px;
    color: var(--fg);
    font-weight: 600;
  }
  .badge {
    padding: 1px 7px;
    border-radius: 9px;
    background: var(--a3);
    color: #fff;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sub {
    margin-top: 4px;
    color: var(--fg3);
    font-size: 11.5px;
  }
  .sub .ahead {
    margin-left: 6px;
    color: var(--a2);
  }
  .sub .behind {
    margin-left: 4px;
    color: var(--a1);
  }
  .actions {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .actions button {
    padding: 4px 11px;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--fg2);
    font-size: 11.5px;
  }
  .actions button:hover {
    color: var(--fg);
    border-color: var(--fg3);
  }
  .actions button.danger:hover {
    color: var(--a5);
    border-color: var(--a5);
  }

  .commits {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .commit-row {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 26px;
    padding: 0 14px;
    font-size: 11.5px;
  }
  .commit-row:hover {
    background: var(--hl);
  }
  .commit-row .hash {
    flex: none;
    font-family: ui-monospace, monospace;
    color: var(--a1);
  }
  .commit-row .subject {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg);
  }
  .commit-row .author {
    flex: none;
    color: var(--fg3);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .commit-row .date {
    flex: none;
    color: var(--fg3);
  }
</style>
