<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  interface Props {
    items: T[];
    rowHeight: number;
    overscan?: number;
    row: Snippet<[T, number]>;
  }
  let { items, rowHeight, overscan = 6, row }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let scrollTop = $state(0);
  let viewportHeight = $state(0);

  function onScroll(e: Event) {
    scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
  }

  $effect(() => {
    if (!container) return;
    const el = container;
    const ro = new ResizeObserver(() => {
      viewportHeight = el.clientHeight;
    });
    ro.observe(el);
    viewportHeight = el.clientHeight;
    return () => ro.disconnect();
  });

  const totalHeight = $derived(items.length * rowHeight);
  const startIndex = $derived(Math.max(0, Math.floor(scrollTop / rowHeight) - overscan));
  const endIndex = $derived(
    Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan),
  );
  const visibleIndices = $derived.by(() =>
    Array.from({ length: Math.max(0, endIndex - startIndex) }, (_, i) => startIndex + i),
  );
</script>

<div class="vlist" bind:this={container} onscroll={onScroll}>
  <div class="vlist-spacer" style="height:{totalHeight}px">
    {#each visibleIndices as index (index)}
      <div
        class="vlist-row"
        style="position:absolute;top:{index * rowHeight}px;left:0;right:0;height:{rowHeight}px"
      >
        {@render row(items[index], index)}
      </div>
    {/each}
  </div>
</div>

<style>
  .vlist {
    flex: 1;
    min-height: 0;
    overflow: auto;
    position: relative;
  }
  .vlist-spacer {
    position: relative;
  }
</style>
