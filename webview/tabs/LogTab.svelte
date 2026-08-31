<script lang="ts">
  import type { CommitRow } from '@shared/protocol';
  import { appState } from '../lib/state.svelte';
  import { logState } from './logState.svelte';
  import VirtualList from '../lib/VirtualList.svelte';
  import DiffView from '../lib/DiffView.svelte';
  import ContextMenu from '../lib/ContextMenu.svelte';

  const FILTER_CHIPS = [
    { id: 'branch:HEAD', label: 'Current branch' },
    { id: 'author:me', label: 'My commits' },
  ];

  const rowHeight = $derived(appState.appearance.density === 'compact' ? 21 : 26);

  const graphWidth = $derived.by(() => {
    let max = 40;
    for (const row of logState.rows) {
      for (const d of row.dots) max = Math.max(max, d.x);
      for (const s of row.segments) max = Math.max(max, s.x1, s.x2);
    }
    return Math.max(56, max + 20);
  });

  function segmentPath(x1: number, y1: number, x2: number, y2: number, rowHeight: number): string {
    const py1 = (y1 / 100) * rowHeight;
    const py2 = (y2 / 100) * rowHeight;
    if (x1 === x2) return `M${x1},${py1} L${x2},${py2}`;
    const midY = (py1 + py2) / 2;
    return `M${x1},${py1} C${x1},${midY} ${x2},${midY} ${x2},${py2}`;
  }

  function statusColor(status: string): string {
    if (status === 'A') return 'var(--a2)';
    if (status === 'D') return 'var(--a5)';
    return 'var(--a1)';
  }

  function refColor(kind: string): string {
    if (kind === 'local-branch') return 'var(--a3)';
    if (kind === 'remote-branch') return 'var(--a1)';
    if (kind === 'tag') return 'var(--a2)';
    return 'var(--a4)';
  }
</script>

<div class="log-tab">
  <div class="search-bar">
    <input
      type="text"
      placeholder="Speed search: subject, author, hash…"
      value={logState.query}
      oninput={(e) => logState.setQuery((e.currentTarget as HTMLInputElement).value)}
    />
    <div class="chips">
      {#each FILTER_CHIPS as chip (chip.id)}
        <button
          class="chip"
          class:active={logState.filters.includes(chip.id)}
          onclick={() => logState.toggleFilter(chip.id)}
        >
          {chip.label}
        </button>
      {/each}
    </div>
    <div class="spacer"></div>
    <span class="match-label">{logState.rows.length} commits</span>
  </div>

  <div class="body">
    <div class="list-col">
      <div class="list-header" style="grid-template-columns: minmax(0,1fr) 130px 104px">
        <span>Commit</span><span>Author</span><span>Date</span>
      </div>
      <VirtualList items={logState.rows} {rowHeight} overscan={8}>
        {#snippet row(commit: CommitRow)}
          <div
            class="commit-row"
            class:selected={commit.hash === logState.selectedHash}
            style="grid-template-columns: minmax(0,1fr) 130px 104px; height:{rowHeight}px"
            role="row"
            tabindex="0"
            onclick={() => logState.selectCommit(commit.hash)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') logState.selectCommit(commit.hash);
            }}
            oncontextmenu={(e) => {
              e.preventDefault();
              logState.selectCommit(commit.hash);
              logState.openContextMenu(commit.hash, e.clientX, e.clientY);
            }}
          >
            <div class="subject-cell">
              <svg
                class="graph-cell"
                width={graphWidth}
                height={rowHeight}
                viewBox="0 0 {graphWidth} {rowHeight}"
              >
                {#each commit.segments as seg, i (i)}
                  <path
                    d={segmentPath(seg.x1, seg.y1, seg.x2, seg.y2, rowHeight)}
                    stroke={seg.color}
                    class="graph-segment"
                  />
                {/each}
                {#each commit.dots as dot, i (i)}
                  <circle
                    class="graph-dot"
                    cx={dot.x}
                    cy={rowHeight / 2}
                    r="4.5"
                    stroke={dot.color}
                    fill={dot.fill}
                  />
                {/each}
              </svg>
              {#each commit.refs as ref (ref.name)}
                <span
                  class="ref-badge"
                  style="color:{refColor(ref.kind)};border-color:{refColor(ref.kind)}"
                  >{ref.name}</span
                >
              {/each}
              <span class="subject">{commit.subject}</span>
            </div>
            <span class="author">{commit.author}</span>
            <span class="date">{commit.date}</span>
          </div>
        {/snippet}
      </VirtualList>
      {#if logState.hasMore}
        <button class="load-more" onclick={() => logState.loadMore()}>Load more…</button>
      {/if}
    </div>

    <div class="detail-col">
      {#if logState.detail}
        <div class="detail-header">
          <div class="detail-top">
            <span class="hash">{logState.detail.abbrev}</span>
            <span class="date">{logState.detail.date}</span>
          </div>
          <div class="subject">{logState.detail.subject}</div>
          <div class="meta">{logState.detail.author} · {logState.detail.stat}</div>
        </div>
        <div class="file-list">
          {#each logState.detail.files as file (file.path)}
            <div
              class="file-row"
              class:selected={file.path === logState.selectedPath}
              role="row"
              tabindex="0"
              onclick={() => logState.selectFile(logState.detail!.hash, file.path)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  logState.selectFile(logState.detail!.hash, file.path);
              }}
            >
              <span class="status" style="color:{statusColor(file.status)}">{file.status}</span>
              <span class="path">{file.path}</span>
              <div class="spacer"></div>
              <span class="adds">+{file.additions}</span>
              <span class="dels">−{file.deletions}</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty">Select a commit</div>
      {/if}
    </div>

    <div class="diff-col">
      <div class="diff-header">
        <span>{logState.selectedPath ?? ''}</span>
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
      <DiffView diff={logState.diff} mode={appState.appearance.diffMode} />
    </div>
  </div>

  {#if logState.menu}
    <ContextMenu
      x={logState.menu.x}
      y={logState.menu.y}
      items={logState.menu.items}
      onSelect={(id) => logState.runContextAction(id)}
      onClose={() => logState.closeMenu()}
    />
  {/if}
</div>

<style>
  .log-tab {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .search-bar {
    flex: none;
    height: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 10px;
    border-bottom: 1px solid var(--border);
  }
  .search-bar input {
    width: 280px;
    padding: 4px 9px;
  }
  .chips {
    display: flex;
    gap: 6px;
  }
  .chip {
    white-space: nowrap;
    line-height: 16px;
    padding: 3px 9px;
    border-radius: 11px;
    font-size: 11px;
    border: 1px solid var(--border);
    color: var(--fg2);
  }
  .chip:hover {
    border-color: var(--fg3);
  }
  .chip.active {
    color: var(--fg);
    background: var(--sel);
  }
  .spacer {
    flex: 1;
  }
  .match-label {
    color: var(--fg3);
    font-size: 11px;
  }

  .body {
    flex: 1;
    min-height: 0;
    display: flex;
  }

  .list-col {
    flex: 2.1;
    min-width: 420px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .list-header {
    display: grid;
    padding: 0 0 0 10px;
    height: 24px;
    align-items: center;
    font-size: 10.5px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--fg3);
    border-bottom: 1px solid var(--border);
    flex: none;
  }
  .commit-row {
    display: grid;
    align-items: center;
    cursor: default;
    border-left: 2px solid transparent;
  }
  .commit-row:hover {
    background: var(--hl);
  }
  .commit-row.selected {
    background: var(--sel);
    border-left-color: var(--a1);
  }
  .subject-cell {
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .graph-cell {
    flex: none;
    overflow: visible;
  }
  .graph-segment {
    fill: none;
    stroke-width: 2px;
    opacity: 0.85;
    stroke-linecap: round;
  }
  .graph-dot {
    stroke-width: 2px;
  }
  .ref-badge {
    flex: none;
    min-width: 0;
    max-width: 124px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font:
      600 10px ui-monospace,
      monospace;
    padding: 1.5px 6px;
    border-radius: 3px;
    border: 1px solid;
  }
  .subject {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--fg);
  }
  .author {
    color: var(--fg2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .date {
    color: var(--fg3);
    font:
      11px ui-monospace,
      monospace;
  }
  .load-more {
    flex: none;
    padding: 8px;
    color: var(--a1);
    text-align: center;
  }

  .detail-col {
    flex: none;
    width: 268px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }
  .detail-header {
    flex: none;
    padding: 9px 12px;
    border-bottom: 1px solid var(--border);
  }
  .detail-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .detail-top .hash {
    font:
      600 11px ui-monospace,
      monospace;
    color: var(--a1);
  }
  .detail-header .subject {
    margin-top: 5px;
    white-space: normal;
    color: var(--fg);
  }
  .detail-header .meta {
    margin-top: 4px;
    color: var(--fg3);
    font-size: 11px;
  }
  .file-list {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px 0;
  }
  .file-row {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 26px;
    padding: 0 12px;
    cursor: default;
  }
  .file-row:hover {
    background: var(--hl);
  }
  .file-row.selected {
    background: var(--sel);
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
    direction: rtl;
    text-align: left;
    color: var(--fg);
  }
  .file-row .adds {
    font:
      11px ui-monospace,
      monospace;
    color: var(--addb);
  }
  .file-row .dels {
    font:
      11px ui-monospace,
      monospace;
    color: var(--delb);
  }

  .diff-col {
    flex: 1.15;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .diff-header {
    height: 26px;
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    color: var(--fg2);
    font-size: 11px;
    font-family: ui-monospace, monospace;
  }
  .diff-header button {
    color: var(--a1);
  }

  .empty {
    padding: 20px;
    color: var(--fg3);
  }
</style>
