<script lang="ts">
  import { appState } from '../lib/state.svelte';
  import { stashState } from './stashState.svelte';
  import DiffView from '../lib/DiffView.svelte';

  const selected = $derived(
    stashState.selectedIndex !== undefined
      ? stashState.entries[stashState.selectedIndex]
      : undefined,
  );
</script>

<div class="stash-tab">
  <div class="list-col">
    <div class="list-header">
      <span>Stash</span>
      <div class="spacer"></div>
      <button class="new-btn" onclick={() => stashState.openComposer()}>Stash Changes…</button>
    </div>
    <div class="list">
      {#each stashState.entries as entry, i (entry.ref)}
        <div
          class="entry"
          class:selected={i === stashState.selectedIndex}
          role="row"
          tabindex="0"
          onclick={() => stashState.select(i)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') stashState.select(i);
          }}
        >
          <div class="entry-top">
            <span class="name">{entry.message || entry.ref}</span>
          </div>
          <div class="entry-meta">{entry.fileCount} files · {entry.date}</div>
        </div>
      {/each}
      {#if stashState.entries.length === 0}
        <div class="empty">No stashed changes.</div>
      {/if}
    </div>
  </div>

  <div class="diff-col">
    <div class="diff-header">
      <span>{selected?.message ?? ''}</span>
      <div class="spacer"></div>
      {#if selected}
        <button onclick={() => stashState.apply(selected.index, false)}>Apply…</button>
        <button class="primary" onclick={() => stashState.apply(selected.index, true)}
          >Apply and Drop</button
        >
        <button onclick={() => stashState.drop(selected.index)}>Drop</button>
      {/if}
    </div>
    <div class="diffs">
      {#each stashState.diffs as diff (diff.path)}
        <div class="file-header">{diff.path}</div>
        <DiffView {diff} mode={appState.appearance.diffMode} />
      {/each}
      {#if selected && stashState.diffs.length === 0}
        <div class="empty">Loading diff…</div>
      {/if}
    </div>
  </div>

  {#if stashState.composerOpen}
    <div class="scrim" role="presentation" onclick={() => stashState.closeComposer()}></div>
    <div class="composer">
      <div class="composer-title">Stash Changes</div>
      <input
        placeholder="Stash name"
        value={stashState.composerMessage}
        oninput={(e) => stashState.setComposerMessage((e.currentTarget as HTMLInputElement).value)}
      />
      <label class="keep-staged">
        <input
          type="checkbox"
          checked={stashState.keepStaged}
          onchange={(e) => stashState.setKeepStaged((e.currentTarget as HTMLInputElement).checked)}
        />
        Keep staged changes in the working tree
      </label>
      <div class="composer-actions">
        <button onclick={() => stashState.closeComposer()}>Cancel</button>
        <button class="primary" onclick={() => stashState.create()}>Stash</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .stash-tab {
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
