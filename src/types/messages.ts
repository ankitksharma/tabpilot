import type { TabInfo, WindowInfo } from "./tab";

// --- Background → Dashboard messages ---

export interface FullStatePayload {
  windows: WindowInfo[];
}

export interface TabUpdatedPayload {
  tab: TabInfo;
}

export interface TabRemovedPayload {
  tabId: number;
  windowId: number;
}

export interface TabMovedPayload {
  tabId: number;
  windowId: number;
  fromIndex: number;
  toIndex: number;
}

export interface TabAttachedPayload {
  tabId: number;
  newWindowId: number;
  newIndex: number;
}

export interface TabDetachedPayload {
  tabId: number;
  oldWindowId: number;
  oldIndex: number;
}

export interface WindowRemovedPayload {
  windowId: number;
}

export interface WindowCreatedPayload {
  window: WindowInfo;
}

// --- Discriminated union: background → dashboard ---

export type BackgroundMessage =
  | { type: "FULL_STATE"; payload: FullStatePayload }
  | { type: "TAB_UPDATED"; payload: TabUpdatedPayload }
  | { type: "TAB_REMOVED"; payload: TabRemovedPayload }
  | { type: "TAB_MOVED"; payload: TabMovedPayload }
  | { type: "TAB_ATTACHED"; payload: TabAttachedPayload }
  | { type: "TAB_DETACHED"; payload: TabDetachedPayload }
  | { type: "WINDOW_REMOVED"; payload: WindowRemovedPayload }
  | { type: "WINDOW_CREATED"; payload: WindowCreatedPayload };

// --- Dashboard → Background messages ---

export type DashboardMessage =
  | { type: "GET_FULL_STATE" }
  | { type: "ACTIVATE_TAB"; tabId: number }
  | { type: "CLOSE_TAB"; tabId: number }
  | { type: "CLOSE_WINDOW"; windowId: number }
  | { type: "MOVE_TAB"; tabId: number; windowId: number; index: number }
  | { type: "CREATE_WINDOW"; tabIds: number[] }
  | { type: "DISCARD_TAB"; tabId: number }
  | { type: "MUTE_TAB"; tabId: number; muted: boolean }
  | { type: "PIN_TAB"; tabId: number; pinned: boolean };
