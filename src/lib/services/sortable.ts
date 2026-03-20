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
    onStart() {
      document.dispatchEvent(new CustomEvent("sortable-drag-start"));
    },
    onEnd(evt: SortableEvent) {
      document.dispatchEvent(new CustomEvent("sortable-drag-end"));
      const tabId = Number(evt.item.dataset.tabId);
      if (!tabId || isNaN(tabId)) return;

      const toEl = evt.to;
      const fromEl = evt.from;
      const toWindowId = Number(toEl.dataset.windowId);

      // Compute the drop index from neighboring tab cards in the DOM,
      // since evt.newIndex may not account for non-draggable group headers
      // or filtered views where visible items are a subset of all tabs.
      const draggables = Array.from(
        toEl.querySelectorAll<HTMLElement>(":scope > .tab-card-draggable"),
      );
      const dropIndex = draggables.indexOf(evt.item as HTMLElement);
      const newIndex = dropIndex >= 0 ? dropIndex : (evt.newIndex ?? 0);

      // Revert SortableJS DOM manipulation so Svelte's keyed {#each}
      // can reconcile correctly when the state update arrives.
      // Without this, filtered views lose the dragged element from both columns.
      const draggableSelector = ".tab-card-draggable";
      if (fromEl !== toEl) {
        toEl.removeChild(evt.item);
        const fromDraggables = Array.from(
          fromEl.querySelectorAll<HTMLElement>(`:scope > ${draggableSelector}`),
        );
        const oldIdx = evt.oldIndex ?? 0;
        const ref = fromDraggables[oldIdx] ?? null;
        fromEl.insertBefore(evt.item, ref);
      } else if (evt.oldIndex !== evt.newIndex) {
        const oldIdx = evt.oldIndex ?? 0;
        const sameDraggables = Array.from(
          fromEl.querySelectorAll<HTMLElement>(`:scope > ${draggableSelector}`),
        );
        // After SortableJS moved the item, find the element at the old slot
        const ref = sameDraggables[oldIdx] ?? null;
        fromEl.removeChild(evt.item);
        fromEl.insertBefore(evt.item, ref);
      }

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
