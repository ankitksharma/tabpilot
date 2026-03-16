export interface TabInfo {
  id: number;
  windowId: number;
  index: number;
  title: string;
  url: string;
  favIconUrl: string;
  active: boolean;
  pinned: boolean;
  audible: boolean;
  mutedInfo: { muted: boolean };
  discarded: boolean;
  groupId: number;
  lastActiveTs: number;
}

export interface WindowInfo {
  id: number;
  focused: boolean;
  state: chrome.windows.windowStateEnum;
  type: chrome.windows.windowTypeEnum;
  tabs: TabInfo[];
}

export function chromeTabToTabInfo(tab: chrome.tabs.Tab): TabInfo {
  return {
    id: tab.id ?? -1,
    windowId: tab.windowId ?? -1,
    index: tab.index,
    title: tab.title ?? "",
    url: tab.url ?? "",
    favIconUrl: tab.favIconUrl ?? "",
    active: tab.active,
    pinned: tab.pinned,
    audible: tab.audible ?? false,
    mutedInfo: { muted: tab.mutedInfo?.muted ?? false },
    discarded: tab.discarded ?? false,
    groupId: tab.groupId ?? chrome.tabGroups?.TAB_GROUP_ID_NONE ?? -1,
    lastActiveTs: tab.active ? Date.now() : 0,
  };
}

export function chromeWindowToWindowInfo(
  win: chrome.windows.Window,
): WindowInfo {
  return {
    id: win.id ?? -1,
    focused: win.focused,
    state: win.state ?? "normal",
    type: win.type ?? "normal",
    tabs: (win.tabs ?? []).map(chromeTabToTabInfo),
  };
}
