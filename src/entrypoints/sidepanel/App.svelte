<script lang="ts">
  import TabTree from "../../components/sidepanel/TabTree.svelte";
  import type { TabInfo, TabGroupInfo } from "../../types/tab";
  import { chromeTabGroupToInfo } from "../../types/tab";
  import type { BackgroundMessage, FullStatePayload } from "../../types/messages";

  let tabs = $state<TabInfo[]>([]);
  let tabGroups = $state<TabGroupInfo[]>([]);
  let loading = $state(true);
  let searchQuery = $state("");

  const filteredTabs = $derived.by(() => {
    if (!searchQuery.trim()) return tabs;
    const q = searchQuery.toLowerCase();
    return tabs.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q),
    );
  });

  async function loadTabs() {
    loading = true;
    try {
      const response: FullStatePayload = await chrome.runtime.sendMessage({
        type: "GET_FULL_STATE",
      });
      if (response?.windows) {
        const focusedWindow = response.windows.find((w) => w.focused);
        tabs = focusedWindow?.tabs ?? response.windows[0]?.tabs ?? [];
      }
    } catch {
      // Fallback: query tabs directly
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      tabs = allTabs.map((t) => ({
        id: t.id ?? -1,
        windowId: t.windowId ?? -1,
        index: t.index,
        title: t.title ?? "",
        url: t.url ?? "",
        favIconUrl: t.favIconUrl ?? "",
        active: t.active,
        pinned: t.pinned,
        audible: t.audible ?? false,
        mutedInfo: { muted: t.mutedInfo?.muted ?? false },
        discarded: t.discarded ?? false,
        groupId: t.groupId ?? -1,
        lastActiveTs: t.active ? Date.now() : 0,
      }));
    }
    // Always fetch tab groups directly — message passing can be unreliable
    // when multiple extension pages have onMessage listeners
    try {
      const groups = await chrome.tabGroups.query({});
      tabGroups = groups.map(chromeTabGroupToInfo);
    } catch {
      tabGroups = [];
    }
    loading = false;
  }

  const BG_MESSAGE_TYPES = new Set([
    "FULL_STATE", "TAB_UPDATED", "TAB_REMOVED", "TAB_MOVED",
    "TAB_ATTACHED", "TAB_DETACHED", "WINDOW_REMOVED", "WINDOW_CREATED",
    "TAB_GROUP_UPDATED", "TAB_GROUP_REMOVED",
  ]);

  function handleMessage(message: BackgroundMessage) {
    if (!message || typeof message !== "object" || !("type" in message)) return;
    if (!BG_MESSAGE_TYPES.has(message.type)) return;

    switch (message.type) {
      case "FULL_STATE": {
        const focused = message.payload.windows.find((w) => w.focused);
        tabs = focused?.tabs ?? message.payload.windows[0]?.tabs ?? [];
        tabGroups = message.payload.tabGroups ?? [];
        break;
      }
      case "TAB_GROUP_UPDATED": {
        const group = message.payload.group;
        const idx = tabGroups.findIndex((g) => g.id === group.id);
        if (idx >= 0) {
          const updated = [...tabGroups];
          updated[idx] = group;
          tabGroups = updated;
        } else {
          tabGroups = [...tabGroups, group];
        }
        break;
      }
      case "TAB_GROUP_REMOVED": {
        tabGroups = tabGroups.filter((g) => g.id !== message.payload.groupId);
        break;
      }
      case "TAB_UPDATED": {
        const tab = message.payload.tab;
        // Only care about tabs in our window
        if (tabs.length > 0 && tab.windowId !== tabs[0]?.windowId) break;
        const idx = tabs.findIndex((t) => t.id === tab.id);
        if (idx >= 0) {
          tabs[idx] = tab;
        } else {
          tabs = [...tabs, tab];
        }
        break;
      }
      case "TAB_REMOVED": {
        tabs = tabs.filter((t) => t.id !== message.payload.tabId);
        break;
      }
      case "TAB_MOVED": {
        const { tabId, toIndex } = message.payload;
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) {
          const rest = tabs.filter((t) => t.id !== tabId);
          rest.splice(toIndex, 0, { ...tab, index: toIndex });
          tabs = rest.map((t, i) => ({ ...t, index: i }));
        }
        break;
      }
      // Ignore other events — they don't affect current window tabs
    }
  }

  $effect(() => {
    loadTabs();
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  });
</script>

<div class="flex h-screen flex-col">
  <div
    class="flex items-center gap-2 border-b px-3 py-2"
    style="border-color: var(--border); background-color: var(--bg-secondary);"
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--text-muted)"
      stroke-width="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
    <input
      type="text"
      placeholder="Search..."
      bind:value={searchQuery}
      class="w-full bg-transparent text-xs outline-none"
      style="color: var(--text-primary);"
    />
    <span class="shrink-0 text-xs" style="color: var(--text-muted);">
      {tabs.length}
    </span>
    <button
      onclick={() => chrome.tabs.create({ url: chrome.runtime.getURL("/newtab.html") })}
      class="shrink-0 rounded p-1 transition-colors"
      style="color: var(--text-muted);"
      title="Open full dashboard"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </svg>
    </button>
  </div>

  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="px-3 py-4 text-xs" style="color: var(--text-muted);">
        Loading...
      </div>
    {:else}
      <TabTree tabs={filteredTabs} {tabGroups} />
    {/if}
  </div>
</div>
