<script lang="ts">
  interface Props {
    /** Current width of the pane to the left of this divider, in px. */
    width: number;
    min?: number;
    max?: number;
    /** Width restored on double-click. */
    defaultWidth?: number;
    onResize: (width: number) => void;
    label?: string;
  }
  let {
    width,
    min = 160,
    max = 640,
    defaultWidth,
    onResize,
    label = 'Resize pane',
  }: Props = $props();

  let dragging = $state(false);
  let startX = 0;
  let startWidth = 0;

  function clamp(value: number): number {
    return Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startWidth = width;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    onResize(clamp(startWidth + (e.clientX - startX)));
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function onKeyDown(e: KeyboardEvent) {
    const step = e.shiftKey ? 24 : 8;
    if (e.key === 'ArrowLeft') onResize(clamp(width - step));
    else if (e.key === 'ArrowRight') onResize(clamp(width + step));
    else if (e.key === 'Home') onResize(clamp(min));
    else if (e.key === 'End') onResize(clamp(max));
    else return;
    e.preventDefault();
  }
</script>

<!-- A window-splitter is a focusable separator (WAI-ARIA), which svelte-check's
     non-interactive-element rules don't know about. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="resizer"
  class:dragging
  role="separator"
  aria-orientation="vertical"
  aria-label={label}
  aria-valuenow={Math.round(width)}
  aria-valuemin={min}
  aria-valuemax={max}
  tabindex="0"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  ondblclick={() => defaultWidth !== undefined && onResize(clamp(defaultWidth))}
  onkeydown={onKeyDown}
></div>

<style>
  .resizer {
    flex: none;
    width: 7px;
    margin: 0 -4px 0 -3px;
    z-index: 3;
    cursor: col-resize;
    background: transparent;
    touch-action: none;
  }
  .resizer::after {
    content: '';
    display: block;
    width: 1px;
    height: 100%;
    margin-left: 3px;
    background: transparent;
  }
  .resizer:hover::after,
  .resizer:focus-visible::after,
  .resizer.dragging::after {
    background: var(--a1);
  }
  .resizer:focus-visible {
    outline: none;
  }
</style>
