<script lang="ts">
  import type { RebaseTodoItem } from '@shared/protocol';
  import { rebaseState } from './rebaseState.svelte';

  function actionColor(action: RebaseTodoItem['action']): string {
    switch (action) {
      case 'pick':
        return 'var(--a2)';
      case 'reword':
        return 'var(--a1)';
      case 'squash':
      case 'fixup':
        return 'var(--a4)';
      case 'drop':
        return 'var(--a5)';
    }
  }
</script>

<div class="rebase-tab">
  {#if rebaseState.status.inProgress}
    <div class="in-progress">
      <div class="ip-header">
        <span
          >Rebasing <span class="mono">{rebaseState.status.branch}</span> onto
          <span class="mono">{rebaseState.status.onto}</span></span
        >
        {#if rebaseState.status.totalSteps}
          <span class="step-count">
            step {rebaseState.status.currentStep} / {rebaseState.status.totalSteps}
          </span>
        {/if}
      </div>
      {#if rebaseState.status.conflicted}
        <div class="conflict-banner">
          Rebase stopped on a conflict. Resolve it in the Conflicts tab, then continue.
        </div>
      {/if}
      <div class="ip-actions">
        <button class="primary" onclick={() => rebaseState.continueRebase()}>Continue</button>
        <button onclick={() => rebaseState.skip()}>Skip</button>
        <button class="danger" onclick={() => rebaseState.abort()}>Abort</button>
      </div>
    </div>
  {:else}
    <div class="todo-col">
      <div class="toolbar">
        <span
          >Rebase <span class="mono current">HEAD</span> onto
          <span class="mono">{rebaseState.base}</span></span
        >
        <div class="spacer"></div>
        <span class="hint">Drag rows to reorder · click an action to change it</span>
        <button class="primary" onclick={() => rebaseState.start()}>Start Rebasing</button>
      </div>
      <div class="rows">
        {#each rebaseState.todo as item, i (item.id)}
          <div
            class="row"
            class:dragging={rebaseState.dragIndex === i}
            draggable="true"
            role="row"
            tabindex="0"
            ondragstart={() => rebaseState.startDrag(i)}
            ondragover={(e) => e.preventDefault()}
            ondrop={() => rebaseState.dropAt(i)}
          >
            <div class="grip">
              <div></div>
              <div></div>
              <div></div>
            </div>
            <button
              class="action"
              style="color:{actionColor(item.action)};background:color-mix(in srgb, {actionColor(
                item.action,
              )} 16%, transparent);border-color:{actionColor(item.action)}"
              onclick={() => rebaseState.cycleAction(item.id)}
            >
              {item.action}
            </button>
            <span class="hash">{item.abbrev}</span>
            <span class="subject">{item.subject}</span>
            <div class="spacer"></div>
            <span class="author">{item.author}</span>
          </div>
        {/each}
        {#if rebaseState.todo.length === 0}
          <div class="empty">No commits between {rebaseState.base} and HEAD.</div>
        {/if}
      </div>
    </div>

    <div class="preview-col">
      <div class="preview-title">Result preview</div>
      {#each rebaseState.preview as p, i (i)}
        <div class="preview-row">
          <div class="preview-dot" style="border-color:{p.color}"></div>
          <span class="preview-text">{p.text}</span>
        </div>
      {/each}
      <div class="preview-note">
        Squash and fixup commits fold into the pick or reword before them. Drop removes a commit
        entirely.
      </div>
    </div>
  {/if}
</div>

<style>
  .rebase-tab {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .mono {
    font-family: ui-monospace, monospace;
  }
  .mono.current {
    color: var(--a3);
  }

  .in-progress {
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ip-header {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--fg2);
  }
  .step-count {
    color: var(--fg3);
    font-size: 11px;
  }
  .conflict-banner {
    padding: 9px 12px;
    border-radius: 6px;
    background: var(--del);
    color: var(--delb);
    font-size: 12px;
  }
  .ip-actions {
    display: flex;
    gap: 8px;
  }
  .ip-actions button {
    padding: 5px 14px;
    border-radius: 5px;
    border: 1px solid var(--border);
    color: var(--fg2);
  }
  .ip-actions button.primary {
    background: var(--a1);
    color: #fff;
    border: none;
    font-weight: 600;
  }
  .ip-actions button.danger {
    color: var(--a5);
    border-color: var(--a5);
  }

  .todo-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .toolbar {
    height: 34px;
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    color: var(--fg2);
  }
  .spacer {
    flex: 1;
  }
  .hint {
    color: var(--fg3);
    font-size: 11px;
  }
  .toolbar button.primary {
    padding: 4px 12px;
    border-radius: 5px;
    background: var(--a1);
    color: #fff;
    font-weight: 600;
    border: none;
  }

  .rows {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 30px;
    padding: 0 12px;
    border-left: 2px solid transparent;
    cursor: grab;
  }
  .row:hover {
    background: var(--hl);
  }
  .row.dragging {
    opacity: 0.4;
  }
  .grip {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    opacity: 0.5;
  }
  .grip div {
    width: 12px;
    height: 1.5px;
    background: var(--fg2);
  }
  .action {
    flex: none;
    width: 78px;
    text-align: center;
    padding: 2px 0;
    border-radius: 4px;
    font:
      600 10.5px ui-monospace,
      monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid;
  }
  .hash {
    flex: none;
    font:
      11px ui-monospace,
      monospace;
    color: var(--fg3);
  }
  .subject {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg);
  }
  .author {
    color: var(--fg3);
    font-size: 11px;
  }
  .empty {
    padding: 20px;
    color: var(--fg3);
  }

  .preview-col {
    flex: none;
    width: 300px;
    border-left: 1px solid var(--border);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .preview-title {
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fg3);
  }
  .preview-row {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .preview-dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid;
    box-sizing: border-box;
  }
  .preview-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg2);
  }
  .preview-note {
    margin-top: auto;
    padding: 9px 10px;
    border-radius: 6px;
    background: var(--panel2);
    border: 1px solid var(--border);
    color: var(--fg2);
    font-size: 11.5px;
  }
</style>
