<script lang="ts">
  import { appState } from '../lib/state.svelte';
  import { commitState } from './commitState.svelte';
  import DiffView from '../lib/DiffView.svelte';
  import CommitFileTree from './CommitFileTree.svelte';
  import { buildFileTree } from '../lib/fileTree';
</script>

<div class="commit-tab">
  <div class="changes-col">
    <div class="changes-header">
      <span>Changes</span>
      <div class="spacer"></div>
      <span class="staged-label">{commitState.totalFiles} files</span>
    </div>

    <div class="groups">
      {#each commitState.groups as group (group.id)}
        <div>
          <div class="group-header">
            <span class="disclosure">▾</span>
            <span class="group-name">{group.name}</span>
            <span class="group-meta">{group.files.length} files</span>
          </div>
          <CommitFileTree node={buildFileTree(group.files)} depth={0} />
        </div>
      {/each}
      {#if commitState.totalFiles === 0}
        <div class="empty">No changes to commit.</div>
      {/if}
    </div>

    <div class="commit-form">
      {#if commitState.resultMessage}
        <div class="result-error">{commitState.resultMessage}</div>
      {/if}
      <textarea
        placeholder="Commit message"
        value={commitState.message}
        oninput={(e) => commitState.setMessage((e.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
      <div class="actions">
        <button
          class="primary"
          disabled={commitState.submitting}
          onclick={() => commitState.submit(false)}
        >
          Commit
        </button>
        <button disabled={commitState.submitting} onclick={() => commitState.submit(true)}>
          Commit and Push…
        </button>
        <button
          disabled={commitState.submitting}
          onclick={() => commitState.openStashComposer()}
        >
          Stash Selected…
        </button>
        <div class="spacer"></div>
        <label class="amend">
          <input
            type="checkbox"
            checked={commitState.amend}
            onchange={(e) => commitState.setAmend((e.currentTarget as HTMLInputElement).checked)}
          />
          Amend
        </label>
      </div>
    </div>
  </div>

  <div class="diff-col">
    <div class="diff-header">
      <span>{commitState.selectedPath ?? ''}</span>
      <span class="local-vs-head">local ↔ HEAD</span>
      <div class="spacer"></div>
      <button
        onclick={() =>
          appState.setAppearance({
            diffMode: appState.appearance.diffMode === 'split' ? 'unified' : 'split',
          })}
      >
        {appState.appearance.diffMode === 'split' ? 'Unified ▸' : 'Side-by-side ▸'}
      </button>
    </div>
    <DiffView diff={commitState.diff} mode={appState.appearance.diffMode} />
  </div>

  {#if commitState.stashComposerOpen}
    <div class="scrim" role="presentation" onclick={() => commitState.closeStashComposer()}></div>
    <div class="composer">
      <div class="composer-title">Stash Selected Files</div>
      <input
        placeholder="Stash message"
        value={commitState.stashMessage}
        oninput={(e) =>
          commitState.setStashMessage((e.currentTarget as HTMLInputElement).value)}
      />
      <div class="composer-actions">
        <button onclick={() => commitState.closeStashComposer()}>Cancel</button>
        <button class="primary" onclick={() => commitState.stashSelected()}>Stash</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .commit-tab {
    flex: 1;
    min-height: 0;
    display: flex;
    position: relative;
  }

  .changes-col {
    flex: none;
    width: 360px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .changes-header {
    height: 28px;
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fg3);
  }
  .staged-label {
    text-transform: none;
    letter-spacing: 0;
    font-size: 11px;
  }
  .spacer {
    flex: 1;
  }

  .groups {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px 0;
  }
  .group-header {
    display: flex;
    align-items: center;
    gap: 7px;
    height: 26px;
    padding: 0 12px;
    color: var(--fg2);
  }
  .group-name {
    font-weight: 600;
  }
  .group-meta {
    color: var(--fg3);
  }
  .empty {
    padding: 20px;
    color: var(--fg3);
  }

  .commit-form {
    flex: none;
    border-top: 1px solid var(--border);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .result-error {
    padding: 6px 9px;
    border-radius: 5px;
    background: var(--del);
    color: var(--delb);
    font-size: 11.5px;
  }
  .commit-form textarea {
    height: 76px;
    resize: none;
    padding: 8px 9px;
    font: var(--code);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .actions button {
    padding: 5px 12px;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--fg2);
  }
  .actions button:hover {
    color: var(--fg);
    border-color: var(--fg3);
  }
  .actions button.primary {
    background: var(--a1);
    color: #fff;
    font-weight: 600;
    border: none;
  }
  .actions button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .amend {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--fg3);
    font-size: 11px;
  }

  .diff-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .diff-header {
    height: 26px;
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    color: var(--fg2);
    font-size: 11px;
    font-family: ui-monospace, monospace;
  }
  .local-vs-head {
    color: var(--fg3);
  }
  .diff-header button {
    color: var(--a1);
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
  .composer input {
    padding: 6px 9px;
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
