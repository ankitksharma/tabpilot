<script lang="ts">
  import type { WindowInfo } from "../../types/tab";
  import WindowHeader from "./WindowHeader.svelte";
  import TabCard from "./TabCard.svelte";

  let { window }: { window: WindowInfo } = $props();
</script>

<div
  class="flex flex-col rounded-lg border"
  style="background-color: var(--bg-secondary); border-color: var(--border);"
>
  <WindowHeader {window} />
  <div class="flex flex-1 flex-col gap-0.5 p-2">
    {#each window.tabs as tab (tab.id)}
      <TabCard {tab} />
    {/each}

    {#if window.tabs.length === 0}
      <div
        class="py-8 text-center text-sm"
        style="color: var(--text-muted);"
      >
        No tabs
      </div>
    {/if}
  </div>
</div>
