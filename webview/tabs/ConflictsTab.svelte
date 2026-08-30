<script lang="ts">
  import { conflictsState } from './conflictsState.svelte';
  import { appState } from '../lib/state.svelte';

  const rowHeight = $derived(appState.appearance.density === 'compact' ? 21 : 26);
</script>

<div class="conflicts-tab">
  {#if conflictsState.entries.length === 0}
    <div class="empty">No conflicts. You're all set.</div>
  {:else}
    <div class="file-list">
      {#each conflictsState.entries as entry (entry.path)}
        <button
          class="file-chip"
          class:selected={entry.path === conflictsState.selectedPath}
          onclick={() => conflictsState.select(entry.path)}
        >
          {entry.path}
        </button>
      {/each}
    </div>

    {#if conflictsState.selected}
      {@const entry = conflictsState.selected}
      <div class="toolbar">
        <span class="path">{entry.path}</span>
        <span class="conflict-label">unresolved conflict</span>
        <div class="spacer"></div>
        <button onclick={() => conflictsState.openMergeEditor(entry.path)}>Open Merge Editor</button
        >
        <button onclick={() => conflictsState.acceptOurs(entry.path)}>Accept Yours</button>
        <button onclick={() => conflictsState.acceptTheirs(entry.path)}>Accept Theirs</button>
        <button class="primary" onclick={() => conflictsState.keepBoth(entry.path)}
          >Keep Both</button
        >
      </div>
      <div class="panes">
        {#each entry.panes as pane (pane.label)}
          <div class="pane">
            <div class="pane-header pane-{pane.label}">
              <div class="pane-dot"></div>
              {pane.title}
            </div>
            <div class="pane-body">
              {#each pane.lines as line, i (i)}
                <div class="line" style="height:{rowHeight}px">
                  <span class="ln">{i + 1}</span>
                  <span class="text">{line}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .conflicts-tab {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg3);
  }

  .file-list {
    flex: none;
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }
  .file-chip {
    flex: none;
    padding: 4px 10px;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--fg2);
    font:
      11px ui-monospace,
      monospace;
    white-space: nowrap;
  }
  .file-chip:hover {
    color: var(--fg);
    border-color: var(--fg3);
  }
  .file-chip.selected {
    color: var(--fg);
    border-color: var(--a1);
    background: var(--sel);
  }

  .toolbar {
    flex: none;
    height: 34px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
  }
  .path {
    font-family: ui-monospace, monospace;
    color: var(--fg);
  }
  .conflict-label {
    color: var(--a5);
    font-size: 11.5px;
  }
  .spacer {
    flex: 1;
  }
  .toolbar button {
    padding: 4px 11px;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--fg2);
  }
  .toolbar button:hover {
    color: var(--fg);
    border-color: var(--a1);
  }
  .toolbar button.primary {
    background: var(--a1);
    color: #fff;
    font-weight: 600;
    border: none;
  }

  .panes {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
  }
  .pane {
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .pane:last-child {
    border-right: none;
  }
  .pane-header {
    height: 26px;
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    background: var(--panel2);
    border-bottom: 1px solid var(--border);
    font-size: 11px;
  }
  .pane-dot {
    width: 7px;
    height: 7px;
    border-radius: 2px;
  }
  .pane-base {
    color: var(--fg2);
  }
  .pane-base .pane-dot {
    background: var(--fg3);
  }
  .pane-ours {
    color: var(--a2);
  }
  .pane-ours .pane-dot {
    background: var(--a2);
  }
  .pane-theirs {
    color: var(--a3);
  }
  .pane-theirs .pane-dot {
    background: var(--a3);
  }
  .pane-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .line {
    display: flex;
    font: var(--code);
  }
  .ln {
    flex: none;
    width: 32px;
    text-align: right;
    padding-right: 8px;
    color: var(--fg3);
  }
  .text {
    white-space: pre;
    color: var(--fg);
  }
</style>
