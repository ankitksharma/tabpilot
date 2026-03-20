<script lang="ts">
  import type { WindowInfo } from "../../types/tab";
  import WindowColumn from "./WindowColumn.svelte";
  import NewWindowDropZone from "./NewWindowDropZone.svelte";
  import { getSearchState, filterAndSortWindows } from "../../lib/state/search.svelte";

  let { windows }: { windows: WindowInfo[] } = $props();

  const search = getSearchState();
  const filtered = $derived(filterAndSortWindows(windows));
</script>

<div class="grid auto-cols-[minmax(320px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
  {#each filtered as window, i (window.id)}
    <WindowColumn {window} index={i} />
  {/each}

  {#if filtered.length === 0}
    <div
      class="col-span-full flex items-center justify-center py-20"
      style="color: var(--text-muted);"
    >
      {#if search.query}
        No tabs match "{search.query}"
      {:else}
        No open windows
      {/if}
    </div>
  {/if}
</div>

<NewWindowDropZone />
