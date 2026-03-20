<script lang="ts">
  import type { TabInfo } from "../../types/tab";

  let { tab, indent = false }: { tab: TabInfo; indent?: boolean } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  class="side-tab-item group flex cursor-pointer items-center gap-2 rounded py-1 pr-2 transition-colors"
  class:pl-8={indent}
  class:px-3={!indent}
  class:is-active={tab.active}
  onclick={() => chrome.runtime.sendMessage({ type: "ACTIVATE_TAB", tabId: tab.id })}
  title={tab.url}
  role="button"
  tabindex="0"
>
  {#if !indent}
    <div class="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
      {#if tab.favIconUrl}
        <img
          src={tab.favIconUrl}
          alt=""
          class="h-3.5 w-3.5 rounded-sm"
          onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      {:else}
        <div class="h-2.5 w-2.5 rounded-full" style="background-color: var(--text-muted);"></div>
      {/if}
    </div>
  {/if}

  <span
    class="min-w-0 flex-1 truncate text-xs"
    style="color: {tab.discarded ? 'var(--text-muted)' : tab.active ? 'var(--text-primary)' : 'var(--text-secondary)'};"
  >
    {tab.title || "Untitled"}
  </span>

  {#if tab.discarded}
    <span class="shrink-0 text-[10px]" style="color: var(--text-muted);">zzz</span>
  {/if}

  <button
    class="shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
    style="color: var(--text-muted);"
    onclick={(e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type: "CLOSE_TAB", tabId: tab.id }); }}
    aria-label="Close tab"
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  </button>
</div>

<style>
  .side-tab-item:hover {
    background-color: var(--bg-hover);
  }
  .side-tab-item.is-active {
    background-color: var(--bg-tertiary);
  }
</style>
