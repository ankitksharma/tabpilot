import Sortable from "sortablejs";
import type { SortableEvent } from "sortablejs";
import { sendToBackground } from "../messaging/protocol";

export interface SortableActionOptions {
  windowId: number;
}

const NEW_WINDOW_DROP_ZONE_CLASS = "new-window-drop-zone";

export function sortableAction(
  node: HTMLElement,
  options: SortableActionOptions,
) {
  let currentWindowId = options.windowId;

  const instance = Sortable.create(node, {
    group: "tabpilot-tabs",
    animation: 150,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",
    handle: ".tab-drag-handle",
    draggable: ".tab-card-draggable",
    onEnd(evt: SortableEvent) {
      const tabId = Number(evt.item.dataset.tabId);
      if (!tabId || isNaN(tabId)) return;

      const toEl = evt.to;
      const toWindowId = Number(toEl.dataset.windowId);
      const newIndex = evt.newIndex ?? 0;

      if (toEl.closest(`.${NEW_WINDOW_DROP_ZONE_CLASS}`)) {
        sendToBackground({ type: "CREATE_WINDOW", tabIds: [tabId] });
        return;
      }

      if (!toWindowId || isNaN(toWindowId)) return;

      sendToBackground({
        type: "MOVE_TAB",
        tabId,
        windowId: toWindowId,
        index: newIndex,
      });
    },
  });

  return {
    update(newOptions: SortableActionOptions) {
      currentWindowId = newOptions.windowId;
    },
    destroy() {
      instance.destroy();
    },
  };
}
