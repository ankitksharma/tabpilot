<script lang="ts">
  import type { TabInfo } from "../../types/tab";
  import SideTabItem from "./SideTabItem.svelte";

  let { domain, tabs, favicon }: { domain: string; tabs: TabInfo[]; favicon: string } = $props();

  let collapsed = $state(false);
</script>

<div class="flex flex-col">
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="domain-header flex cursor-pointer items-center gap-2 rounded px-3 py-1 transition-colors"
    style="color: var(--text-secondary);"
    onclick={() => (collapsed = !collapsed)}
    role="button"
    tabindex="0"
  >
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      class="shrink-0 transition-transform"
      style="transform: rotate({collapsed ? '0deg' : '90deg'});"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>

    <div class="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      {#if favicon}
        <img
          src={favicon}
          alt=""
          class="h-3.5 w-3.5 rounded-sm"
          onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      {:else}
        <div class="h-2.5 w-2.5 rounded-full" style="background-color: var(--text-muted);"></div>
      {/if}
    </div>

    <span class="min-w-0 flex-1 truncate text-xs font-medium">
      {domain}
    </span>

    <span
      class="shrink-0 rounded px-1 py-0.5 text-[10px]"
      style="background-color: var(--bg-tertiary); color: var(--text-muted);"
    >
      {tabs.length}
    </span>
  </div>

  {#if !collapsed}
    <div class="flex flex-col">
      {#each tabs as tab (tab.id)}
        <SideTabItem {tab} indent={true} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .domain-header:hover {
    background-color: var(--bg-hover);
  }
</style>
