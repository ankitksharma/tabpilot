import type { WindowInfo } from "../../types/tab";
import { chromeWindowToWindowInfo } from "../../types/tab";

/**
 * Get all open windows with their tabs.
 */
export async function getAllWindows(): Promise<WindowInfo[]> {
  const windows = await chrome.windows.getAll({
    populate: true,
    windowTypes: ["normal"],
  });
  return windows.map(chromeWindowToWindowInfo);
}

/**
 * Create a new window, optionally moving existing tabs into it.
 */
export async function createWindow(
  tabIds: number[],
): Promise<chrome.windows.Window> {
  if (tabIds.length === 0) {
    return chrome.windows.create({});
  }
  // Create window with the first tab, then move the rest
  const win = await chrome.windows.create({ tabId: tabIds[0] });
  if (tabIds.length > 1 && win.id) {
    await chrome.tabs.move(tabIds.slice(1), {
      windowId: win.id,
      index: -1,
    });
  }
  return win;
}

export async function closeWindow(windowId: number): Promise<void> {
  await chrome.windows.remove(windowId);
}

export async function focusWindow(windowId: number): Promise<void> {
  await chrome.windows.update(windowId, { focused: true });
}
