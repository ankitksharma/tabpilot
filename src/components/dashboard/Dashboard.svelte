<script lang="ts">
  import type { WindowInfo } from "../../types/tab";
  import WindowColumn from "./WindowColumn.svelte";
  import NewWindowDropZone from "./NewWindowDropZone.svelte";
  import { getSearchState, filterAndSortWindows } from "../../lib/state/search.svelte";

  let { windows }: { windows: WindowInfo[] } = $props();

  const search = getSearchState();
  const filtered = $derived(filterAndSortWindows(windows));
</script>

{#if search.tabIdFilter}
  <div
    class="mb-3 flex items-center justify-between rounded-md border px-3 py-2"
    style="background-color: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent);"
  >
    <span class="text-xs font-medium" style="color: var(--accent);">
      Filtered: {search.tabIdFilterLabel}
    </span>
    <button
      onclick={() => search.clearTabIdFilter()}
      class="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors"
      style="color: var(--accent); background-color: color-mix(in srgb, var(--accent) 15%, transparent);"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
      Clear
    </button>
  </div>
{/if}

<div class="grid auto-cols-[minmax(320px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
  {#each filtered as window, i (window.id)}
    <WindowColumn {window} index={i} />
  {/each}

  {#if filtered.length === 0}
    <div
      class="col-span-full flex items-center justify-center py-20"
      style="color: var(--text-muted);"
    >
      {#if search.tabIdFilter}
        No matching tabs found
      {:else if search.query}
        No tabs match "{search.query}"
      {:else}
        No open windows
      {/if}
    </div>
  {/if}
</div>

<NewWindowDropZone />
