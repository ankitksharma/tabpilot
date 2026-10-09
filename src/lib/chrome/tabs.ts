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
  groupId?: number,
): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const sourceGroup = tab.groupId > 0 ? tab.groupId : 0;
  const targetGroup = groupId && groupId > 0 ? groupId : 0;

  // Ungroup when the destination is ungrouped or a different group; staying
  // within the same group is the case we want to preserve.
  if (sourceGroup !== 0 && sourceGroup !== targetGroup) {
    await chrome.tabs.ungroup(tabId);
  }

  try {
    await chrome.tabs.move(tabId, { windowId, index });
  } catch {
    // Target index may collide with another group's continuity guard.
    await chrome.tabs.move(tabId, { windowId, index: -1 });
  }

  if (targetGroup !== 0 && sourceGroup !== targetGroup) {
    try {
      await chrome.tabs.group({ tabId, groupId: targetGroup });
    } catch {
      // Target group may have been removed mid-drag.
    }
  }
}

export async function moveTabs(
  tabIds: number[],
  windowId: number,
  index: number,
  groupId?: number,
): Promise<void> {
  if (tabIds.length === 0) return;

  // Ungroup any source tabs that aren't already in the destination group.
  const targetGroup = groupId && groupId > 0 ? groupId : 0;
  const tabs = await Promise.all(tabIds.map((id) => chrome.tabs.get(id)));
  const toUngroup = tabs
    .filter((t) => t.groupId > 0 && t.groupId !== targetGroup)
    .map((t) => t.id!)
    .filter((id): id is number => typeof id === "number");
  if (toUngroup.length > 0) {
    await chrome.tabs.ungroup(toUngroup);
  }

  try {
    await chrome.tabs.move(tabIds, { windowId, index });
  } catch {
    await chrome.tabs.move(tabIds, { windowId, index: -1 });
  }

  if (targetGroup !== 0) {
    const toGroup = tabIds.filter((id) => {
      const t = tabs.find((x) => x.id === id);
      return !t || t.groupId !== targetGroup;
    });
    if (toGroup.length > 0) {
      try {
        await chrome.tabs.group({ tabIds: toGroup, groupId: targetGroup });
      } catch {
        // Target group may have been removed mid-drag.
      }
    }
  }
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

export async function groupTabs(
  tabIds: number[],
  title: string,
  color?: chrome.tabGroups.ColorEnum,
): Promise<number> {
  const groupId = await chrome.tabs.group({ tabIds });
  await chrome.tabGroups.update(groupId, {
    title,
    ...(color ? { color } : {}),
  });
  return groupId;
}
