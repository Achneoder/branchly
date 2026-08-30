<script lang="ts">
  import type { FileDiff } from '@shared/protocol';
  import { zipHunkForSplit } from './diffZip';

  interface Props {
    diff: FileDiff | undefined;
    mode: 'split' | 'unified';
  }
  let { diff, mode }: Props = $props();
</script>

{#if !diff}
  <div class="empty">Select a commit or file to see its diff.</div>
{:else if diff.binary}
  <div class="empty">Binary file not shown.</div>
{:else if mode === 'split'}
  <div class="split">
    <div class="col">
      {#each diff.hunks as hunk, hi (hi)}
        {#each zipHunkForSplit(hunk) as row, ri (ri)}
          <div
            class="line"
            style="background:{row.left?.type === 'del' ? 'var(--del)' : 'transparent'}"
          >
            <span class="ln">{row.left?.ln1 ?? ''}</span>
            <span
              class="text"
              style="color:{row.left?.type === 'del' ? 'var(--delb)' : 'var(--fg)'}"
              >{row.left?.text ?? ''}</span
            >
          </div>
        {/each}
      {/each}
    </div>
    <div class="col">
      {#each diff.hunks as hunk, hi (hi)}
        {#each zipHunkForSplit(hunk) as row, ri (ri)}
          <div
            class="line"
            style="background:{row.right?.type === 'add' ? 'var(--add)' : 'transparent'}"
          >
            <span class="ln">{row.right?.ln2 ?? ''}</span>
            <span
              class="text"
              style="color:{row.right?.type === 'add' ? 'var(--addb)' : 'var(--fg)'}"
              >{row.right?.text ?? ''}</span
            >
          </div>
        {/each}
      {/each}
    </div>
  </div>
{:else}
  <div class="unified">
    {#each diff.hunks as hunk, hi (hi)}
      <div class="hunk-header">{hunk.header}</div>
      {#each hunk.lines as line, li (li)}
        <div
          class="line"
          style="background:{line.type === 'add'
            ? 'var(--add)'
            : line.type === 'del'
              ? 'var(--del)'
              : 'transparent'}"
        >
          <span class="ln">{line.ln1 ?? ''}</span>
          <span class="ln">{line.ln2 ?? ''}</span>
          <span class="sign">{line.type === 'add' ? '+' : line.type === 'del' ? '-' : ''}</span>
          <span
            class="text"
            style="color:{line.type === 'add'
              ? 'var(--addb)'
              : line.type === 'del'
                ? 'var(--delb)'
                : 'var(--fg)'}">{line.text}</span
          >
        </div>
      {/each}
    {/each}
  </div>
{/if}

<style>
  .empty {
    padding: 20px;
    color: var(--fg3);
  }
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 100%;
    overflow: auto;
  }
  .col {
    border-right: 1px solid var(--border);
    overflow: hidden;
  }
  .col:last-child {
    border-right: none;
  }
  .unified {
    overflow: auto;
    height: 100%;
  }
  .hunk-header {
    padding: 2px 8px;
    color: var(--fg3);
    background: var(--panel2);
    font: var(--code);
  }
  .line {
    display: flex;
    font: var(--code);
    white-space: pre;
  }
  .ln {
    flex: none;
    width: 38px;
    text-align: right;
    padding-right: 9px;
    color: var(--fg3);
  }
  .sign {
    flex: none;
    width: 14px;
  }
  .text {
    padding: 0 8px;
    white-space: pre;
    overflow: hidden;
  }
</style>
