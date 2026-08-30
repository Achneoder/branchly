<script lang="ts">
  import { appState } from '../lib/state.svelte';
  import { shelfState } from './shelfState.svelte';
  import DiffView from '../lib/DiffView.svelte';

  const selected = $derived(
    shelfState.selectedIndex !== undefined
      ? shelfState.entries[shelfState.selectedIndex]
      : undefined,
  );
</script>

<div class="shelf-tab">
  <div class="list-col">
    <div class="list-header">
      <span>Shelf</span>
      <div class="spacer"></div>
      <button class="new-btn" onclick={() => shelfState.openComposer()}>Shelve Changes…</button>
    </div>
    <div class="list">
      {#each shelfState.entries as entry, i (entry.ref)}
        <div
          class="entry"
          class:selected={i === shelfState.selectedIndex}
          role="row"
          tabindex="0"
          onclick={() => shelfState.select(i)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') shelfState.select(i);
          }}
        >
          <div class="entry-top">
            <span class="kind">{entry.kind}</span>
            <span class="name">{entry.message || entry.ref}</span>
          </div>
          <div class="entry-meta">{entry.fileCount} files · {entry.date}</div>
        </div>
      {/each}
      {#if shelfState.entries.length === 0}
        <div class="empty">No shelved or stashed changes.</div>
      {/if}
    </div>
  </div>

  <div class="diff-col">
    <div class="diff-header">
      <span>{selected?.message ?? ''}</span>
      <div class="spacer"></div>
      {#if selected}
        <button onclick={() => shelfState.apply(selected.index, false)}>Unshelve…</button>
        <button class="primary" onclick={() => shelfState.apply(selected.index, true)}
          >Apply and Drop</button
        >
        <button onclick={() => shelfState.drop(selected.index)}>Drop</button>
      {/if}
    </div>
    <div class="diffs">
      {#each shelfState.diffs as diff (diff.path)}
        <div class="file-header">{diff.path}</div>
        <DiffView {diff} mode={appState.appearance.diffMode} />
      {/each}
      {#if selected && shelfState.diffs.length === 0}
        <div class="empty">Loading diff…</div>
      {/if}
    </div>
  </div>

  {#if shelfState.composerOpen}
    <div class="scrim" role="presentation" onclick={() => shelfState.closeComposer()}></div>
    <div class="composer">
      <div class="composer-title">Shelve Changes</div>
      <input
        placeholder="Shelf name"
        value={shelfState.composerMessage}
        oninput={(e) => shelfState.setComposerMessage((e.currentTarget as HTMLInputElement).value)}
      />
      <label class="keep-staged">
        <input
          type="checkbox"
          checked={shelfState.keepStaged}
          onchange={(e) => shelfState.setKeepStaged((e.currentTarget as HTMLInputElement).checked)}
        />
        Keep staged changes in the working tree
      </label>
      <div class="composer-actions">
        <button onclick={() => shelfState.closeComposer()}>Cancel</button>
        <button class="primary" onclick={() => shelfState.create()}>Shelve</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .shelf-tab {
    flex: 1;
    min-height: 0;
    display: flex;
    position: relative;
  }

  .list-col {
    flex: none;
    width: 330px;
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
    padding: 6px 0;
  }
  .entry {
    padding: 8px 12px;
    border-left: 2px solid transparent;
    cursor: default;
  }
  .entry:hover {
    background: var(--hl);
  }
  .entry.selected {
    background: var(--sel);
    border-left-color: var(--a1);
  }
  .entry-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kind {
    font:
      600 10px ui-monospace,
      monospace;
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--a1);
    border: 1px solid var(--a1);
    text-transform: uppercase;
  }
  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg);
  }
  .entry-meta {
    margin-top: 3px;
    color: var(--fg3);
    font-size: 11px;
  }
  .empty {
    padding: 20px;
    color: var(--fg3);
  }

  .diff-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .diff-header {
    height: 34px;
    flex: none;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    color: var(--fg);
  }
  .diff-header button {
    padding: 4px 11px;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--fg2);
  }
  .diff-header button:hover {
    color: var(--fg);
    border-color: var(--fg3);
  }
  .diff-header button.primary {
    background: var(--a1);
    color: #fff;
    font-weight: 600;
    border: none;
  }
  .diffs {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }
  .file-header {
    padding: 4px 12px;
    color: var(--fg2);
    background: var(--panel2);
    border-bottom: 1px solid var(--border);
    font:
      11px ui-monospace,
      monospace;
    flex: none;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.28);
    z-index: 40;
  }
  .composer {
    position: absolute;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 360px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 9px;
    box-shadow: var(--shadow);
    z-index: 50;
  }
  .composer-title {
    font-weight: 600;
    color: var(--fg);
  }
  .composer input:not([type]) {
    padding: 6px 9px;
  }
  .keep-staged {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--fg2);
    font-size: 11.5px;
  }
  .composer-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .composer-actions button {
    padding: 5px 12px;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--fg2);
  }
  .composer-actions button.primary {
    background: var(--a1);
    color: #fff;
    font-weight: 600;
    border: none;
  }
</style>
