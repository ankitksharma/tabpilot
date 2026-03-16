import { getAllWindows, createWindow, closeWindow } from "../lib/chrome/windows";
import {
  activateTab,
  closeTab,
  moveTab,
  discardTab,
  muteTab,
  pinTab,
} from "../lib/chrome/tabs";
import { broadcastToUI } from "../lib/messaging/protocol";
import {
  chromeTabToTabInfo,
  chromeWindowToWindowInfo,
} from "../types/tab";
import type { DashboardMessage, FullStatePayload } from "../types/messages";

export default defineBackground(() => {
  // --- Message handler: dashboard → background ---
  chrome.runtime.onMessage.addListener(
    (message: DashboardMessage, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((err) => {
          console.error("[TabPilot BG] message error:", err);
          sendResponse(undefined);
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

  // --- Open dashboard command ---
  chrome.commands.onCommand.addListener((command) => {
    if (command === "open-dashboard") {
      chrome.tabs.create({ url: chrome.runtime.getURL("/newtab.html") });
    }
  });

  console.log("[TabPilot] Background service worker initialized");
});

async function handleMessage(
  message: DashboardMessage,
): Promise<FullStatePayload | void> {
  switch (message.type) {
    case "GET_FULL_STATE": {
      const windows = await getAllWindows();
      return { windows };
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
  }
}
