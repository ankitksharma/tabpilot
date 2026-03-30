import { getAllWindows, createWindow, closeWindow } from "../lib/chrome/windows";
import {
  activateTab,
  closeTab,
  closeTabs,
  moveTab,
  discardTab,
  muteTab,
  pinTab,
  groupTabs,
} from "../lib/chrome/tabs";
import { broadcastToUI } from "../lib/messaging/protocol";
import {
  chromeTabToTabInfo,
  chromeWindowToWindowInfo,
  chromeTabGroupToInfo,
} from "../types/tab";
import { createProvider } from "../lib/ai/provider";
import type { AIConfig } from "../types/ai";
import type { DashboardMessage, FullStatePayload } from "../types/messages";

// Feature detection for APIs that Opera/other Chromium forks may not support
const HAS_TAB_GROUPS = typeof chrome.tabGroups !== "undefined";
const HAS_SIDE_PANEL =
  typeof chrome.sidePanel !== "undefined" &&
  typeof chrome.sidePanel.setPanelBehavior === "function";

export default defineBackground(() => {
  // --- Message handler: dashboard → background ---
  chrome.runtime.onMessage.addListener(
    (message: DashboardMessage, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((err) => {
          console.error("[TabPilot BG] message error:", err);
          sendResponse({ __error: err instanceof Error ? err.message : String(err) });
        });
      return true; // async response
    },
  );

  // --- Chrome event listeners → broadcast patches to dashboard ---

  chrome.tabs.onCreated.addListener((tab) => {
    broadcastToUI({
      type: "TAB_UPDATED",
      payload: { tab: chromeTabToTabInfo(tab) },
    });
  });

  chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
    broadcastToUI({
      type: "TAB_UPDATED",
      payload: { tab: chromeTabToTabInfo(tab) },
    });
  });

  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    broadcastToUI({
      type: "TAB_REMOVED",
      payload: { tabId, windowId: removeInfo.windowId },
    });
  });

  chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
    broadcastToUI({
      type: "TAB_MOVED",
      payload: {
        tabId,
        windowId: moveInfo.windowId,
        fromIndex: moveInfo.fromIndex,
        toIndex: moveInfo.toIndex,
      },
    });
  });

  chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
    broadcastToUI({
      type: "TAB_ATTACHED",
      payload: {
        tabId,
        newWindowId: attachInfo.newWindowId,
        newIndex: attachInfo.newPosition,
      },
    });
  });

  chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    broadcastToUI({
      type: "TAB_DETACHED",
      payload: {
        tabId,
        oldWindowId: detachInfo.oldWindowId,
        oldIndex: detachInfo.oldPosition,
      },
    });
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      broadcastToUI({
        type: "TAB_UPDATED",
        payload: { tab: chromeTabToTabInfo(tab) },
      });
    } catch {
      // Tab may have been removed between event and get
    }
  });

  chrome.windows.onCreated.addListener(async (win) => {
    const fullWin = await chrome.windows.get(win.id!, { populate: true });
    broadcastToUI({
      type: "WINDOW_CREATED",
      payload: { window: chromeWindowToWindowInfo(fullWin) },
    });
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    broadcastToUI({
      type: "WINDOW_REMOVED",
      payload: { windowId },
    });
  });

  // --- Tab group events (Chrome only, not supported in Opera) ---

  if (HAS_TAB_GROUPS) {
    chrome.tabGroups.onCreated.addListener((group) => {
      broadcastToUI({
        type: "TAB_GROUP_UPDATED",
        payload: { group: chromeTabGroupToInfo(group) },
      });
    });

    chrome.tabGroups.onUpdated.addListener((group) => {
      broadcastToUI({
        type: "TAB_GROUP_UPDATED",
        payload: { group: chromeTabGroupToInfo(group) },
      });
    });

    chrome.tabGroups.onRemoved.addListener((group) => {
      broadcastToUI({
        type: "TAB_GROUP_REMOVED",
        payload: { groupId: group.id },
      });
    });
  }

  // --- Auto-suspend via alarms ---
  const SUSPEND_ALARM = "tabpilot-auto-suspend";
  const lastActiveMap = new Map<number, number>();

  chrome.tabs.onActivated.addListener((info) => {
    lastActiveMap.set(info.tabId, Date.now());
  });

  chrome.alarms.create(SUSPEND_ALARM, { periodInMinutes: 1 });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== SUSPEND_ALARM) return;
    try {
      const result = await chrome.storage.sync.get("tabpilot_settings");
      const settings = result.tabpilot_settings;
      if (!settings?.autoSuspendEnabled || !settings?.autoSuspendMinutes) return;

      const threshold = settings.autoSuspendMinutes * 60 * 1000;
      const now = Date.now();
      const tabs = await chrome.tabs.query({});

      for (const tab of tabs) {
        if (!tab.id || tab.active || tab.discarded || tab.pinned) continue;
        if (tab.audible) continue;
        const lastActive = lastActiveMap.get(tab.id) ?? 0;
        if (now - lastActive > threshold && lastActive > 0) {
          try {
            await chrome.tabs.discard(tab.id);
          } catch {
            // Tab may not be discardable
          }
        }
      }
    } catch {
      // Settings not available yet
    }
  });

  // --- Extension icon click behavior ---
  if (HAS_SIDE_PANEL) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: "open-tab-manager",
          title: "Open Tab Manager",
          contexts: ["action"],
        });
      });
    });

    chrome.contextMenus.onClicked.addListener((info) => {
      if (info.menuItemId === "open-tab-manager") {
        chrome.tabs.create({ url: chrome.runtime.getURL("/newtab.html") });
      }
    });
  } else {
    // Opera and other browsers: icon click opens the dashboard directly
    chrome.action.onClicked.addListener(() => {
      chrome.tabs.create({ url: chrome.runtime.getURL("/newtab.html") });
    });
  }

  // --- Open dashboard command ---
  chrome.commands.onCommand.addListener((command) => {
    if (command === "open-dashboard") {
      chrome.tabs.create({ url: chrome.runtime.getURL("/newtab.html") });
    }
  });

  // Strip Origin header for AI API requests to avoid CORS rejections
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType,
          requestHeaders: [
            { header: "Origin", operation: "remove" as chrome.declarativeNetRequest.HeaderOperation },
          ],
        },
        condition: {
          urlFilter: "https://api.anthropic.com/*",
          resourceTypes: ["xmlhttprequest" as chrome.declarativeNetRequest.ResourceType],
        },
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: "modifyHeaders" as chrome.declarativeNetRequest.RuleActionType,
          requestHeaders: [
            { header: "Origin", operation: "remove" as chrome.declarativeNetRequest.HeaderOperation },
          ],
        },
        condition: {
          urlFilter: "https://api.openai.com/*",
          resourceTypes: ["xmlhttprequest" as chrome.declarativeNetRequest.ResourceType],
        },
      },
    ],
  });

  console.log("[TabPilot] Background service worker initialized");
});

async function handleMessage(
  message: DashboardMessage,
): Promise<FullStatePayload | void> {
  switch (message.type) {
    case "GET_FULL_STATE": {
      const windows = await getAllWindows();
      const groups = HAS_TAB_GROUPS
        ? (await chrome.tabGroups.query({})).map(chromeTabGroupToInfo)
        : [];
      return { windows, tabGroups: groups };
    }
    case "ACTIVATE_TAB":
      return activateTab(message.tabId);
    case "CLOSE_TAB":
      return closeTab(message.tabId);
    case "CLOSE_WINDOW":
      return closeWindow(message.windowId);
    case "MOVE_TAB":
      return moveTab(message.tabId, message.windowId, message.index);
    case "CREATE_WINDOW":
      await createWindow(message.tabIds);
      return;
    case "DISCARD_TAB":
      return discardTab(message.tabId);
    case "MUTE_TAB":
      return muteTab(message.tabId, message.muted);
    case "PIN_TAB":
      return pinTab(message.tabId, message.pinned);
    case "CLOSE_TABS":
      return closeTabs(message.tabIds);
    case "DISCARD_TABS":
      for (const tabId of message.tabIds) {
        try {
          await discardTab(tabId);
        } catch {
          // Tab may not be discardable (e.g., active tab)
        }
      }
      return;
    case "MUTE_TABS":
      for (const { tabId, muted } of message.tabs) {
        await muteTab(tabId, muted);
      }
      return;
    case "REOPEN_TABS":
      for (const tab of message.tabs) {
        await chrome.tabs.create({
          url: tab.url,
          windowId: tab.windowId,
        });
      }
      return;
    case "REOPEN_WINDOW": {
      const win = await chrome.windows.create({ url: message.urls[0] });
      if (win.id && message.urls.length > 1) {
        for (const url of message.urls.slice(1)) {
          await chrome.tabs.create({ windowId: win.id, url });
        }
      }
      return;
    }
    case "GROUP_TABS":
      if (!HAS_TAB_GROUPS) throw new Error("Tab groups not supported in this browser");
      await groupTabs(
        message.tabIds,
        message.title,
        message.color as chrome.tabGroups.ColorEnum | undefined,
      );
      return;
    case "AI_CLUSTER_TABS": {
      const provider = createProvider(message.config as AIConfig);
      if (!provider) throw new Error("No AI provider configured");
      return await provider.clusterTabs(message.tabs);
    }
  }
}
