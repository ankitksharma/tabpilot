import type { TabInfo, TabGroupInfo, WindowInfo } from "../../types/tab";
import type { BackgroundMessage, FullStatePayload } from "../../types/messages";
import { requestFullState } from "../messaging/protocol";

// --- Reactive state ---
let windows = $state<WindowInfo[]>([]);
let tabGroups = $state<TabGroupInfo[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);

// --- Derived ---
const allTabs = $derived(windows.flatMap((w) => w.tabs));
const tabCount = $derived(allTabs.length);
const windowCount = $derived(windows.length);

// --- Actions ---

async function loadFullState(): Promise<void> {
  try {
    loading = true;
    error = null;
    const state: FullStatePayload = await requestFullState();
    windows = state.windows;
    tabGroups = state.tabGroups ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    loading = false;
  }
}

function handleBackgroundMessage(msg: BackgroundMessage): void {
  switch (msg.type) {
    case "FULL_STATE":
      windows = msg.payload.windows;
      tabGroups = msg.payload.tabGroups ?? [];
      break;

    case "TAB_UPDATED": {
      const tab = msg.payload.tab;
      let found = false;
      // Remove tab from any window it currently exists in (handles cross-window moves),
      // then update or add in the correct window
      windows = windows.map((w) => {
        if (w.id === tab.windowId) {
          const existingIdx = w.tabs.findIndex((t) => t.id === tab.id);
          if (existingIdx >= 0) {
            found = true;
            const newTabs = [...w.tabs];
            newTabs[existingIdx] = tab;
            return { ...w, tabs: newTabs };
          }
          return w;
        }
        // Remove from other windows to prevent duplicates
        const hadTab = w.tabs.some((t) => t.id === tab.id);
        if (hadTab) {
          return { ...w, tabs: w.tabs.filter((t) => t.id !== tab.id) };
        }
        return w;
      });
      if (!found) {
        // New tab — add to its window
        windows = windows.map((w) => {
          if (w.id !== tab.windowId) return w;
          return { ...w, tabs: [...w.tabs, tab] };
        });
      }
      break;
    }

    case "TAB_REMOVED": {
      const { tabId, windowId } = msg.payload;
      windows = windows.map((w) => {
        if (w.id !== windowId) return w;
        return { ...w, tabs: w.tabs.filter((t) => t.id !== tabId) };
      });
      break;
    }

    case "TAB_MOVED": {
      const { tabId, windowId, toIndex } = msg.payload;
      windows = windows.map((w) => {
        if (w.id !== windowId) return w;
        const tab = w.tabs.find((t) => t.id === tabId);
        if (!tab) return w;
        const filtered = w.tabs.filter((t) => t.id !== tabId);
        filtered.splice(toIndex, 0, { ...tab, index: toIndex });
        return { ...w, tabs: reindex(filtered) };
      });
      break;
    }

    case "TAB_ATTACHED": {
      const { tabId, newWindowId, newIndex } = msg.payload;
      // Find and remove from old window
      let movedTab: TabInfo | null = null;
      windows = windows.map((w) => {
        const tab = w.tabs.find((t) => t.id === tabId);
        if (tab) {
          movedTab = { ...tab, windowId: newWindowId, index: newIndex };
          return { ...w, tabs: w.tabs.filter((t) => t.id !== tabId) };
        }
        return w;
      });
      // Add to new window
      if (movedTab) {
        windows = windows.map((w) => {
          if (w.id !== newWindowId) return w;
          const newTabs = [...w.tabs];
          newTabs.splice(newIndex, 0, movedTab!);
          return { ...w, tabs: reindex(newTabs) };
        });
      }
      break;
    }

    case "TAB_DETACHED": {
      const { tabId, oldWindowId } = msg.payload;
      windows = windows.map((w) => {
        if (w.id !== oldWindowId) return w;
        return { ...w, tabs: w.tabs.filter((t) => t.id !== tabId) };
      });
      break;
    }

    case "WINDOW_CREATED": {
      const newWin = msg.payload.window;
      const newTabIds = new Set(newWin.tabs.map((t) => t.id));
      // Remove any tabs that appear in the new window from existing windows
      // to prevent duplicate keys (Chrome fires WINDOW_CREATED before TAB_DETACHED)
      windows = windows
        .filter((w) => w.id !== newWin.id)
        .map((w) => {
          const hadOverlap = w.tabs.some((t) => newTabIds.has(t.id));
          if (!hadOverlap) return w;
          return { ...w, tabs: w.tabs.filter((t) => !newTabIds.has(t.id)) };
        });
      windows = [...windows, newWin];
      break;
    }

    case "WINDOW_REMOVED":
      windows = windows.filter((w) => w.id !== msg.payload.windowId);
      break;

    case "TAB_GROUP_UPDATED": {
      const group = msg.payload.group;
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

    case "TAB_GROUP_REMOVED":
      tabGroups = tabGroups.filter((g) => g.id !== msg.payload.groupId);
      break;
  }
}

function reindex(tabs: TabInfo[]): TabInfo[] {
  return tabs.map((t, i) => ({ ...t, index: i }));
}

// --- Exports ---

export function getTabState() {
  return {
    get windows() { return windows; },
    get allTabs() { return allTabs; },
    get tabCount() { return tabCount; },
    get windowCount() { return windowCount; },
    get tabGroups() { return tabGroups; },
    get loading() { return loading; },
    get error() { return error; },
    loadFullState,
    handleBackgroundMessage,
  };
}
