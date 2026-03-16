import type { TabInfo, WindowInfo } from "../../types/tab";
import type { BackgroundMessage, FullStatePayload } from "../../types/messages";
import { requestFullState } from "../messaging/protocol";

// --- Reactive state ---
let windows = $state<WindowInfo[]>([]);
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
      break;

    case "TAB_UPDATED": {
      const tab = msg.payload.tab;
      let found = false;
      windows = windows.map((w) => {
        if (w.id !== tab.windowId) return w;
        const existingIdx = w.tabs.findIndex((t) => t.id === tab.id);
        if (existingIdx >= 0) {
          found = true;
          const newTabs = [...w.tabs];
          newTabs[existingIdx] = tab;
          return { ...w, tabs: newTabs };
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

    case "WINDOW_CREATED":
      windows = [...windows, msg.payload.window];
      break;

    case "WINDOW_REMOVED":
      windows = windows.filter((w) => w.id !== msg.payload.windowId);
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
    get loading() { return loading; },
    get error() { return error; },
    loadFullState,
    handleBackgroundMessage,
  };
}
