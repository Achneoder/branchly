<script lang="ts">
  import type { BlameLine } from '@shared/protocol';
  import { appState } from '../lib/state.svelte';
  import { historyState } from './historyState.svelte';
  import VirtualList from '../lib/VirtualList.svelte';

  const rowHeight = $derived(appState.appearance.density === 'compact' ? 21 : 26);
  const fileName = $derived(historyState.filePath?.split('/').pop() ?? '');
</script>

<div class="history-tab">
  {#if !historyState.filePath}
    <div class="empty">Open a tracked file to see its history and blame.</div>
  {:else}
    <div class="history-col">
      <div class="history-header">History · {fileName}</div>
      <div class="history-list">
        {#each historyState.entries as entry (entry.hash)}
          <div
            class="history-row"
            class:selected={entry.hash === historyState.selectedHash}
            role="row"
            tabindex="0"
            onclick={() => historyState.selectCommit(entry.hash)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') historyState.selectCommit(entry.hash);
            }}
          >
            <div class="dot" style="border-color:{entry.dots[0]?.color ?? 'var(--fg3)'}"></div>
            <span class="hash">{entry.abbrev}</span>
            <span class="subject">{entry.subject}</span>
            <div class="spacer"></div>
            <span class="date">{entry.date}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="blame-col">
      <VirtualList items={historyState.blame} {rowHeight} overscan={12}>
        {#snippet row(line: BlameLine)}
          <div class="blame-row" style="height:{rowHeight}px">
            <div class="blame-gutter">
              <span class="blame-hash">{line.abbrev}</span>
              <span class="blame-who">{line.author}</span>
              <div class="spacer"></div>
              <span class="blame-date">{line.date}</span>
            </div>
            <span class="line-no">{line.line}</span>
            <span class="code">{line.text}</span>
          </div>
        {/snippet}
      </VirtualList>
    </div>
  {/if}
</div>

<style>
  .history-tab {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg3);
  }

  .history-col {
    flex: none;
    width: 340px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .history-header {
    height: 28px;
    flex: none;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 10.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--fg3);
    border-bottom: 1px solid var(--border);
  }
  .history-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .history-row {
    display: flex;
    align-items: center;
    gap: 9px;
    height: 30px;
    padding: 0 12px;
    cursor: default;
  }
  .history-row:hover {
    background: var(--hl);
  }
  .history-row.selected {
    background: var(--sel);
  }
  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid;
    box-sizing: border-box;
  }
  .hash {
    flex: none;
    font:
      11px ui-monospace,
      monospace;
    color: var(--a1);
  }
  .subject {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg);
  }
  .spacer {
    flex: 1;
  }
  .date {
    color: var(--fg3);
    font-size: 11px;
  }

  .blame-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .blame-row {
    display: flex;
    font: var(--code);
  }
  .blame-gutter {
    flex: none;
    width: 250px;
    display: flex;
    gap: 9px;
    padding: 0 10px;
    background: var(--panel2);
    border-right: 1px solid var(--border);
    color: var(--fg3);
    white-space: nowrap;
    overflow: hidden;
  }
  .blame-hash {
    color: var(--a1);
    font-weight: 500;
  }
  .blame-who {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .line-no {
    flex: none;
    width: 40px;
    text-align: right;
    padding-right: 10px;
    color: var(--fg3);
  }
  .code {
    white-space: pre;
    color: var(--fg);
  }
</style>
