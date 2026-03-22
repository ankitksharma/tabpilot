<script lang="ts">
  import type { TabInfo } from "../../types/tab";
  import { sendToBackground } from "../../lib/messaging/protocol";
  import { getContextMenuState } from "../../lib/state/ui.svelte";
  import { getSelectionState } from "../../lib/state/selection.svelte";
  import { getDuplicatesState } from "../../lib/state/duplicates.svelte";
  import { getTabState } from "../../lib/state/tabs.svelte";
  import { getVisibleTabs } from "../../lib/state/search.svelte";

  let { tab }: { tab: TabInfo } = $props();

  const ctx = getContextMenuState();
  const selection = getSelectionState();
  const dupes = getDuplicatesState();
  const tabState = getTabState();

  const isSelected = $derived(selection.isSelected(tab.id));
  const isDuplicate = $derived(dupes.isDuplicate(tab.id));

  const domain = $derived.by(() => {
    try {
      return new URL(tab.url).hostname;
    } catch {
      return tab.url;
    }
  });

  function handleClick(e: MouseEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      selection.toggle(tab.id);
      return;
    }
    if (e.shiftKey) {
      e.preventDefault();
      selection.rangeSelect(tab.id, getVisibleTabs(tabState.windows));
      return;
    }
    if (selection.count > 0) {
      selection.toggle(tab.id);
      return;
    }
    sendToBackground({ type: "ACTIVATE_TAB", tabId: tab.id });
  }

  function close(e: MouseEvent) {
    e.stopPropagation();
    sendToBackground({ type: "CLOSE_TAB", tabId: tab.id });
  }

  function toggleMute(e: MouseEvent) {
    e.stopPropagation();
    sendToBackground({
      type: "MUTE_TAB",
      tabId: tab.id,
      muted: !tab.mutedInfo.muted,
    });
  }

  function onContextMenu(e: MouseEvent) {
    ctx.openContextMenu(e, tab);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
  onclick={handleClick}
  oncontextmenu={onContextMenu}
  class="tab-card-draggable group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors"
  style="color: var(--text-primary); {isSelected ? `background-color: color-mix(in srgb, var(--accent) 15%, transparent); outline: 1px solid var(--accent);` : tab.active ? `background-color: var(--bg-tertiary);` : ''} {isDuplicate ? `border-left: 2px solid var(--warning);` : ''}"
  onmouseenter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
  onmouseleave={(e) => { e.currentTarget.style.backgroundColor = tab.active ? 'var(--bg-tertiary)' : 'transparent'; }}
  title={tab.url}
  role="button"
  tabindex="0"
  data-tab-id={tab.id}
  data-window-id={tab.windowId}
>
  <!-- Drag handle -->
  <div
    class="tab-drag-handle flex shrink-0 cursor-grab items-center opacity-0 transition-opacity group-hover:opacity-60"
    style="color: var(--text-muted);"
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="8" cy="4" r="2" /><circle cx="16" cy="4" r="2" />
      <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
      <circle cx="8" cy="20" r="2" /><circle cx="16" cy="20" r="2" />
    </svg>
  </div>

  <!-- Checkbox -->
  <input
    type="checkbox"
    checked={isSelected}
    onclick={(e) => { e.stopPropagation(); selection.toggle(tab.id); }}
    class="h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-[var(--accent)] {isSelected || selection.count > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'} transition-opacity"
  />

  <!-- Favicon -->
  <div class="flex h-4 w-4 shrink-0 items-center justify-center">
    {#if tab.favIconUrl}
      <img
        src={tab.favIconUrl}
        alt=""
        class="h-4 w-4 rounded-sm"
        onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    {:else}
      <div
        class="h-3 w-3 rounded-full"
        style="background-color: var(--text-muted);"
      ></div>
    {/if}
  </div>

  <!-- Title + domain -->
  <div class="flex min-w-0 flex-1 flex-col">
    <span
      class="truncate text-sm leading-tight"
      style="color: {tab.discarded ? 'var(--text-muted)' : 'var(--text-primary)'};"
    >
      {tab.title || "Untitled"}
    </span>
    <span class="truncate text-xs leading-tight" style="color: var(--text-muted);">
      {domain}
    </span>
  </div>

  <!-- Status indicators -->
  <div class="flex shrink-0 items-center gap-1">
    {#if tab.pinned}
      <span
        class="rounded px-1 py-0.5 text-xs"
        style="color: var(--accent);"
        title="Pinned"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
        </svg>
      </span>
    {/if}

    {#if tab.audible}
      <button
        onclick={toggleMute}
        class="rounded p-0.5 transition-colors"
        style="color: var(--text-secondary);"
        title={tab.mutedInfo.muted ? "Unmute tab" : "Mute tab"}
      >
        {#if tab.mutedInfo.muted}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
          </svg>
        {:else}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
          </svg>
        {/if}
      </button>
    {/if}

    {#if tab.discarded}
      <span
        class="text-xs"
        style="color: var(--text-muted);"
        title="Suspended"
      >
        zzz
      </span>
    {/if}

    <!-- Close button -->
    <button
      onclick={close}
      class="rounded p-0.5 opacity-0 transition-all group-hover:opacity-100"
      style="color: var(--text-muted);"
      title="Close tab"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</div>
