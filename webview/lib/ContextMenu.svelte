<script lang="ts">
  import type { ContextMenuItem } from '@shared/protocol';

  interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onSelect: (id: string) => void;
    onClose: () => void;
  }
  let { x, y, items, onSelect, onClose }: Props = $props();
</script>

<div
  class="scrim"
  role="presentation"
  onclick={onClose}
  oncontextmenu={(e) => {
    e.preventDefault();
    onClose();
  }}
></div>
<div class="menu" role="menu" style="left:{x}px;top:{y}px">
  {#each items as item (item.id)}
    {#if item.separator}
      <div class="sep" role="separator"></div>
    {:else}
      <div
        class="item"
        role="menuitem"
        tabindex="0"
        onclick={() => onSelect(item.id)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelect(item.id);
        }}
      >
        <span>{item.label}</span>
        <div class="spacer"></div>
        {#if item.keybinding}<span class="kb">{item.keybinding}</span>{/if}
      </div>
    {/if}
  {/each}
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .menu {
    position: fixed;
    width: 262px;
    padding: 5px 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 7px;
    box-shadow: var(--shadow);
    animation: orbpop 0.1s ease-out;
    z-index: 50;
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 26px;
    padding: 0 12px;
    cursor: default;
  }
  .item:hover {
    background: var(--sel);
  }
  .spacer {
    flex: 1;
  }
  .kb {
    font:
      10.5px ui-monospace,
      monospace;
    color: var(--fg3);
  }
  .sep {
    height: 1px;
    margin: 5px 0;
    background: var(--border);
  }
</style>
