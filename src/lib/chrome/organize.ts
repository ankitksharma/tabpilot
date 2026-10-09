/**
 * Organizes Chrome's native tab strip (horizontal or vertical) through the
 * tabs/tabGroups APIs: group, sort, collapse, and undo the last change.
 * Runs in the background service worker.
 */
import { loadRules, matchTab } from "../ai/routing-rules";
import { chromeTabToTabInfo } from "../../types/tab";

export type OrganizeAction = "group" | "sort-title" | "sort-domain" | "collapse";

export interface OrganizeResult {
  changed: number;
}

// One contiguous unit in the strip: a whole tab group or a single ungrouped tab.
type Block =
  | { kind: "group"; groupId: number }
  | { kind: "tab"; tabId: number };

interface Snapshot {
  blocks: Block[];
  ungroupedTabIds: number[];
  collapsed: Record<number, boolean>;
}

const NO_GROUP = -1;
// A site needs at least this many ungrouped tabs to get its own group.
const MIN_SITE_GROUP_SIZE = 2;
const GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange", "grey",
];
const UNDO_KEY_PREFIX = "tabpilot_organize_undo_";

export async function organizeWindow(
  windowId: number,
  action: OrganizeAction,
): Promise<OrganizeResult> {
  const snapshot = await takeSnapshot(windowId);
  let changed = 0;
  switch (action) {
    case "group":
      changed = await groupBySite(windowId);
      break;
    case "sort-title":
      changed = await sortWindow(windowId, "title");
      break;
    case "sort-domain":
      changed = await sortWindow(windowId, "domain");
      break;
    case "collapse":
      changed = await collapseInactiveGroups(windowId);
      break;
  }
  if (changed > 0) {
    await chrome.storage.session.set({ [UNDO_KEY_PREFIX + windowId]: snapshot });
  }
  return { changed };
}

export async function undoOrganize(windowId: number): Promise<boolean> {
  const key = UNDO_KEY_PREFIX + windowId;
  const snapshot: Snapshot | undefined = (await chrome.storage.session.get(key))[key];
  if (!snapshot) return false;
  await chrome.storage.session.remove(key);

  const tabs = await chrome.tabs.query({ windowId });
  const wasUngrouped = new Set(snapshot.ungroupedTabIds);
  const toUngroup = tabs
    .filter((t) => t.id !== undefined && wasUngrouped.has(t.id) && t.groupId !== NO_GROUP)
    .map((t) => t.id!);
  if (toUngroup.length > 0) await chrome.tabs.ungroup(toUngroup);

  await applyBlockOrder(windowId, snapshot.blocks);

  const groups = await chrome.tabGroups.query({ windowId });
  for (const g of groups) {
    const wasCollapsed = snapshot.collapsed[g.id];
    if (wasCollapsed !== undefined && wasCollapsed !== g.collapsed) {
      await chrome.tabGroups.update(g.id, { collapsed: wasCollapsed });
    }
  }
  return true;
}

export async function hasOrganizeUndo(windowId: number): Promise<boolean> {
  const key = UNDO_KEY_PREFIX + windowId;
  return (await chrome.storage.session.get(key))[key] !== undefined;
}

// --- Group ---

async function groupBySite(windowId: number): Promise<number> {
  const [tabs, rules, existingGroups] = await Promise.all([
    chrome.tabs.query({ windowId }),
    loadRules(),
    chrome.tabGroups.query({ windowId }),
  ]);

  // Only ungrouped, unpinned tabs are touched; groups the user made stay as they are.
  const buckets = new Map<string, { title: string; color?: string; fromRule: boolean; tabIds: number[] }>();
  for (const tab of tabs) {
    if (tab.pinned || tab.groupId !== NO_GROUP || tab.id === undefined) continue;
    const rule = matchTab(chromeTabToTabInfo(tab), rules);
    const site = siteOf(tab.url ?? "");
    const title = rule?.groupName || site;
    if (!title) continue;
    const key = title.toLowerCase();
    const bucket = buckets.get(key) ?? { title, color: rule?.color, fromRule: !!rule, tabIds: [] };
    bucket.tabIds.push(tab.id);
    buckets.set(key, bucket);
  }

  const groupsByTitle = new Map(
    existingGroups.filter((g) => g.title).map((g) => [g.title!.toLowerCase(), g.id]),
  );

  let changed = 0;
  for (const [key, bucket] of buckets) {
    const existingId = groupsByTitle.get(key);
    if (existingId !== undefined) {
      await chrome.tabs.group({ groupId: existingId, tabIds: bucket.tabIds });
    } else {
      if (!bucket.fromRule && bucket.tabIds.length < MIN_SITE_GROUP_SIZE) continue;
      const groupId = await chrome.tabs.group({
        tabIds: bucket.tabIds,
        createProperties: { windowId },
      });
      await chrome.tabGroups.update(groupId, {
        title: bucket.title,
        color: toGroupColor(bucket.color) ?? colorFor(key),
      });
    }
    changed += bucket.tabIds.length;
  }
  return changed;
}

// --- Sort ---

async function sortWindow(windowId: number, by: "title" | "domain"): Promise<number> {
  const [tabs, groups] = await Promise.all([
    chrome.tabs.query({ windowId }),
    chrome.tabGroups.query({ windowId }),
  ]);
  const tabById = new Map<number, chrome.tabs.Tab>(tabs.map((t) => [t.id!, t]));
  const groupTitle = new Map<number, string>(groups.map((g) => [g.id, g.title ?? ""]));

  const keyOf = (block: Block): string => {
    if (block.kind === "group") return (groupTitle.get(block.groupId) ?? "").toLowerCase();
    const tab = tabById.get(block.tabId);
    const title = (tab?.title ?? "").toLowerCase();
    return by === "domain" ? `${siteOf(tab?.url ?? "") ?? "~"} ${title}` : title;
  };

  const current = blocksOf(tabs);
  const sorted = [...current].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  const moved = sorted.filter((b, i) => !sameBlock(b, current[i])).length;
  if (moved === 0) return 0;
  await applyBlockOrder(windowId, sorted);
  return moved;
}

// --- Collapse ---

async function collapseInactiveGroups(windowId: number): Promise<number> {
  const [[active], groups] = await Promise.all([
    chrome.tabs.query({ windowId, active: true }),
    chrome.tabGroups.query({ windowId }),
  ]);
  let changed = 0;
  for (const g of groups) {
    const shouldCollapse = g.id !== active?.groupId;
    if (g.collapsed !== shouldCollapse) {
      await chrome.tabGroups.update(g.id, { collapsed: shouldCollapse });
      changed++;
    }
  }
  return changed;
}

// --- Helpers ---

async function takeSnapshot(windowId: number): Promise<Snapshot> {
  const [tabs, groups] = await Promise.all([
    chrome.tabs.query({ windowId }),
    chrome.tabGroups.query({ windowId }),
  ]);
  return {
    blocks: blocksOf(tabs),
    ungroupedTabIds: tabs
      .filter((t) => !t.pinned && t.groupId === NO_GROUP && t.id !== undefined)
      .map((t) => t.id!),
    collapsed: Object.fromEntries(groups.map((g) => [g.id, g.collapsed])),
  };
}

function blocksOf(tabs: chrome.tabs.Tab[]): Block[] {
  const blocks: Block[] = [];
  const ordered = tabs.filter((t) => !t.pinned).sort((a, b) => a.index - b.index);
  for (const tab of ordered) {
    if (tab.groupId === NO_GROUP) {
      blocks.push({ kind: "tab", tabId: tab.id! });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind !== "group" || last.groupId !== tab.groupId) {
      blocks.push({ kind: "group", groupId: tab.groupId });
    }
  }
  return blocks;
}

// Places blocks left to right after the pinned tabs. Each block is moved to the
// boundary of the already-placed region, so it never lands inside another group.
async function applyBlockOrder(windowId: number, blocks: Block[]): Promise<void> {
  const tabs = await chrome.tabs.query({ windowId });
  let index = tabs.filter((t) => t.pinned).length;
  for (const block of blocks) {
    try {
      if (block.kind === "group") {
        const members = await chrome.tabs.query({ windowId, groupId: block.groupId });
        if (members.length === 0) continue;
        await chrome.tabGroups.move(block.groupId, { index });
        index += members.length;
      } else {
        const tab = await chrome.tabs.get(block.tabId);
        if (tab.windowId !== windowId || tab.pinned) continue;
        await chrome.tabs.move(block.tabId, { index });
        index++;
      }
    } catch {
      // Tab or group closed while organizing.
    }
  }
}

function sameBlock(a: Block, b: Block | undefined): boolean {
  if (!b || a.kind !== b.kind) return false;
  return a.kind === "group"
    ? a.groupId === (b as { groupId: number }).groupId
    : a.tabId === (b as { tabId: number }).tabId;
}

function siteOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toGroupColor(color?: string): chrome.tabGroups.ColorEnum | undefined {
  return GROUP_COLORS.find((c) => c === color);
}

// Same site name → same color in every window and session.
function colorFor(key: string): chrome.tabGroups.ColorEnum {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}
