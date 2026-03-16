import type { TabInfo } from "../../types/tab";

interface ContextMenuPosition {
  x: number;
  y: number;
}

let isOpen = $state(false);
let position = $state<ContextMenuPosition>({ x: 0, y: 0 });
let targetTab = $state<TabInfo | null>(null);

function openContextMenu(e: MouseEvent, tab: TabInfo) {
  e.preventDefault();
  e.stopPropagation();
  targetTab = tab;
  position = { x: e.clientX, y: e.clientY };
  isOpen = true;
}

function closeContextMenu() {
  isOpen = false;
  targetTab = null;
}

export function getContextMenuState() {
  return {
    get isOpen() {
      return isOpen;
    },
    get position() {
      return position;
    },
    get targetTab() {
      return targetTab;
    },
    openContextMenu,
    closeContextMenu,
  };
}
