<script lang="ts">
  import { getSelectionState } from "../../lib/state/selection.svelte";
  import { getUndoState } from "../../lib/state/undo.svelte";
  import { getTabState } from "../../lib/state/tabs.svelte";
  import { sendToBackground } from "../../lib/messaging/protocol";

  const selection = getSelectionState();
  const undo = getUndoState();
  const tabState = getTabState();

  function getSelectedTabs() {
    return tabState.allTabs.filter((t) => selection.isSelected(t.id));
  }

  async function closeSelected() {
    const tabs = getSelectedTabs();
    undo.push({
      type: "REOPEN_TABS",
      tabs: tabs.map((t) => ({
        url: t.url,
        windowId: t.windowId,
        index: t.index,
        pinned: t.pinned,
      })),
    });
    await sendToBackground({ type: "CLOSE_TABS", tabIds: selection.ids });
    selection.clearSelection();
  }

  async function suspendSelected() {
    const ids = selection.ids.filter((id) => {
      const tab = tabState.allTabs.find((t) => t.id === id);
      return tab && !tab.active && !tab.discarded;
    });
    if (ids.length > 0) {
      await sendToBackground({ type: "DISCARD_TABS", tabIds: ids });
    }
    selection.clearSelection();
  }

  async function muteSelected() {
    const tabs = getSelectedTabs();
    const anyUnmuted = tabs.some((t) => !t.mutedInfo.muted);
    undo.push({
      type: "UNMUTE_TABS",
      tabs: tabs.map((t) => ({ tabId: t.id, muted: t.mutedInfo.muted })),
    });
    await sendToBackground({
      type: "MUTE_TABS",
      tabs: tabs.map((t) => ({ tabId: t.id, muted: anyUnmuted })),
    });
    selection.clearSelection();
  }

  async function moveToNewWindow() {
    const tabs = getSelectedTabs();
    undo.push({
      type: "UNMOVE_TABS",
      moves: tabs.map((t) => ({
        tabId: t.id,
        windowId: t.windowId,
        index: t.index,
      })),
    });
    await sendToBackground({ type: "CREATE_WINDOW", tabIds: selection.ids });
    selection.clearSelection();
  }
</script>

{#if selection.count > 0}
  <div
    class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border px-5 py-3 shadow-2xl"
    style="background-color: var(--bg-secondary); border-color: var(--border);"
  >
    <span class="text-sm font-medium" style="color: var(--text-primary);">
      {selection.count} tab{selection.count > 1 ? "s" : ""} selected
    </span>

    <div class="mx-1 h-4 w-px" style="background-color: var(--border);"></div>

    <button
      onclick={closeSelected}
      class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
      style="background-color: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger);"
    >
      Close
    </button>
    <button
      onclick={suspendSelected}
      class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
      style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
    >
      Suspend
    </button>
    <button
      onclick={muteSelected}
      class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
      style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
    >
      Mute
    </button>
    <button
      onclick={moveToNewWindow}
      class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
      style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
    >
      New Window
    </button>

    <div class="mx-1 h-4 w-px" style="background-color: var(--border);"></div>

    <button
      onclick={() => selection.clearSelection()}
      class="rounded-md px-2 py-1 text-xs transition-colors"
      style="color: var(--text-muted);"
    >
      Deselect
    </button>
  </div>
{/if}
