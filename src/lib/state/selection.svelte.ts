import type { TabInfo } from "../../types/tab";

let selectedIds = $state<Set<number>>(new Set());
let lastClickedId = $state<number | null>(null);

const count = $derived(selectedIds.size);
const ids = $derived([...selectedIds]);

function toggle(tabId: number): void {
  const next = new Set(selectedIds);
  if (next.has(tabId)) {
    next.delete(tabId);
  } else {
    next.add(tabId);
  }
  selectedIds = next;
  lastClickedId = tabId;
}

function rangeSelect(tabId: number, allTabsOrdered: TabInfo[]): void {
  if (lastClickedId === null) {
    toggle(tabId);
    return;
  }
  const allIds = allTabsOrdered.map((t) => t.id);
  const startIdx = allIds.indexOf(lastClickedId);
  const endIdx = allIds.indexOf(tabId);
  if (startIdx === -1 || endIdx === -1) {
    toggle(tabId);
    return;
  }
  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);
  const next = new Set(selectedIds);
  for (let i = lo; i <= hi; i++) {
    next.add(allIds[i]);
  }
  selectedIds = next;
  lastClickedId = tabId;
}

function selectAll(tabIds: number[]): void {
  selectedIds = new Set(tabIds);
}

function clearSelection(): void {
  selectedIds = new Set();
  lastClickedId = null;
}

function isSelected(tabId: number): boolean {
  return selectedIds.has(tabId);
}

export function getSelectionState() {
  return {
    get count() { return count; },
    get ids() { return ids; },
    get selectedIds() { return selectedIds; },
    toggle,
    rangeSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}
