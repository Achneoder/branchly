<script lang="ts">
  import type { TabId } from '@shared/protocol';
  import { appState } from './lib/state.svelte';
  import LogTab from './tabs/LogTab.svelte';
  import CommitTab from './tabs/CommitTab.svelte';
  import ConflictsTab from './tabs/ConflictsTab.svelte';
  import RebaseTab from './tabs/RebaseTab.svelte';
  import ShelfTab from './tabs/ShelfTab.svelte';
  import HistoryTab from './tabs/HistoryTab.svelte';

  const TABS: { id: TabId; label: string }[] = [
    { id: 'log', label: 'Log' },
    { id: 'commit', label: 'Commit' },
    { id: 'conflicts', label: 'Conflicts' },
    { id: 'rebase', label: 'Rebase' },
    { id: 'shelf', label: 'Shelf' },
    { id: 'history', label: 'History' },
  ];
</script>

<div
  class="orb"
  data-theme={appState.appearance.theme}
  data-density={appState.appearance.density}
  data-mono={appState.appearance.monoGraph ? '1' : '0'}
>
  {#if appState.lastError}
    <div class="error-bar">
      <span>{appState.lastError}</span>
      <button onclick={() => appState.dismissError()}>Dismiss</button>
    </div>
  {/if}

  <div class="tabbar">
    {#each TABS as t (t.id)}
      <button
        class="tab"
        class:active={appState.tab === t.id}
        onclick={() => appState.setTab(t.id)}
      >
        {t.label}
      </button>
    {/each}
    <div class="spacer"></div>
    <button
      class="toggle"
      title="Toggle commit graph colors"
      onclick={() => appState.setAppearance({ monoGraph: !appState.appearance.monoGraph })}
    >
      {appState.appearance.monoGraph ? 'Lanes: mono' : 'Lanes: colored'}
    </button>
    <button
      class="toggle"
      title="Toggle diff view mode"
      onclick={() =>
        appState.setAppearance({
          diffMode: appState.appearance.diffMode === 'split' ? 'unified' : 'split',
        })}
    >
      {appState.appearance.diffMode === 'split' ? 'Diff: side-by-side' : 'Diff: unified'}
    </button>
    <button
      class="toggle"
      title="Toggle row density"
      onclick={() =>
        appState.setAppearance({
          density: appState.appearance.density === 'compact' ? 'comfortable' : 'compact',
        })}
    >
      {appState.appearance.density === 'compact' ? 'Compact' : 'Comfortable'}
    </button>
  </div>

  <div class="panel">
    {#if appState.tab === 'log'}
      <LogTab />
    {:else if appState.tab === 'commit'}
      <CommitTab />
    {:else if appState.tab === 'conflicts'}
      <ConflictsTab />
    {:else if appState.tab === 'rebase'}
      <RebaseTab />
    {:else if appState.tab === 'shelf'}
      <ShelfTab />
    {:else if appState.tab === 'history'}
      <HistoryTab />
    {/if}
  </div>

  <div class="statusbar">
    <button class="branch" onclick={() => appState.openBranchPopup()}>
      {appState.status.branch || (appState.status.hasRepo ? 'detached' : 'no repository')}
      <span class="chevron">▾</span>
    </button>
    {#if appState.status.hasRepo}
      <span class="ahead">↑ {appState.status.ahead}</span>
      <span class="behind">↓ {appState.status.behind}</span>
      {#if appState.status.conflictCount > 0}
        <span class="conflicts">⚠ {appState.status.conflictCount} conflicts</span>
      {/if}
    {/if}
    <div class="spacer"></div>
  </div>
</div>

<style>
  .orb {
    position: relative;
  }
  .error-bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    background: var(--del);
    color: var(--delb);
    border-bottom: 1px solid var(--border);
    font-size: 11.5px;
  }
  .error-bar button {
    margin-left: auto;
    text-decoration: underline;
  }

  .tabbar {
    flex: none;
    height: 31px;
    display: flex;
    align-items: stretch;
    background: var(--chrome);
    border-bottom: 1px solid var(--border);
  }
  .tab {
    padding: 0 14px;
    color: var(--fg2);
    font-size: 11.5px;
  }
  .tab:hover {
    color: var(--fg);
  }
  .tab.active {
    color: var(--fg);
    background: var(--bg);
    box-shadow: inset 0 -2px 0 var(--a1);
  }
  .spacer {
    flex: 1;
  }
  .toggle {
    padding: 0 10px;
    color: var(--fg3);
    font-size: 11px;
  }
  .toggle:hover {
    color: var(--fg);
  }

  .panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .statusbar {
    flex: none;
    height: 26px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 12px;
    background: var(--chrome);
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--fg2);
    font-family: ui-monospace, monospace;
  }
  .branch {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .branch:hover {
    background: var(--hl);
    color: var(--fg);
  }
  .chevron {
    color: var(--fg3);
  }
  .ahead {
    color: var(--a2);
  }
  .behind {
    color: var(--a1);
  }
  .conflicts {
    color: var(--a5);
  }
</style>
