/**
 * Thin wrappers around chrome.tabs.* for testability and consistent error handling.
 */

export async function activateTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.update(tabId, { active: true });
  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId);
}

export async function closeTabs(tabIds: number[]): Promise<void> {
  await chrome.tabs.remove(tabIds);
}

export async function moveTab(
  tabId: number,
  windowId: number,
  index: number,
): Promise<void> {
  await chrome.tabs.move(tabId, { windowId, index });
}

export async function discardTab(tabId: number): Promise<void> {
  await chrome.tabs.discard(tabId);
}

export async function muteTab(
  tabId: number,
  muted: boolean,
): Promise<void> {
  await chrome.tabs.update(tabId, { muted });
}

export async function pinTab(
  tabId: number,
  pinned: boolean,
): Promise<void> {
  await chrome.tabs.update(tabId, { pinned });
}

export async function createTab(
  windowId: number,
  url?: string,
): Promise<chrome.tabs.Tab> {
  return chrome.tabs.create({ windowId, url });
}
