<script lang="ts">
  interface Props {
    label: string;
  }
  let { label }: Props = $props();
</script>

<div class="placeholder">{label} tab coming soon.</div>

<style>
  .placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg3);
  }
</style>
