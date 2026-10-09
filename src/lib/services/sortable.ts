import Sortable from "sortablejs";
import type { SortableEvent } from "sortablejs";
import { sendToBackground } from "../messaging/protocol";
import { getSelectionState } from "../state/selection.svelte";

export interface SortableActionOptions {
  windowId: number;
}

const NEW_WINDOW_DROP_ZONE_CLASS = "new-window-drop-zone";

// Drag-time snapshot of multi-selection. Set on onStart, cleared on onEnd.
let pendingMultiDragIds: number[] | null = null;

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
    onStart(evt: SortableEvent) {
      document.dispatchEvent(new CustomEvent("sortable-drag-start"));

      const tabId = Number(evt.item.dataset.tabId);
      const selection = getSelectionState();
      if (
        !isNaN(tabId) &&
        selection.count > 1 &&
        selection.isSelected(tabId)
      ) {
        // Move the entire selection. Source order is preserved by sorting
        // the IDs by their current DOM position in the window root.
        pendingMultiDragIds = orderSelectionByDom(evt.item, selection.ids);
      } else {
        pendingMultiDragIds = null;
      }
    },
    onEnd(evt: SortableEvent) {
      document.dispatchEvent(new CustomEvent("sortable-drag-end"));
      const multiIds = pendingMultiDragIds;
      pendingMultiDragIds = null;

      const tabId = Number(evt.item.dataset.tabId);
      if (!tabId || isNaN(tabId)) return;

      const toEl = evt.to;
      const fromEl = evt.from;

      // Compute absolute window index by walking every .tab-card-draggable
      // under the closest [data-window-root]. Works for both the outer
      // ungrouped container and any group's inner sortable, because they all
      // share the same window root ancestor.
      const winRoot =
        (toEl.closest("[data-window-root]") as HTMLElement | null) ?? toEl;
      const allDraggables = Array.from(
        winRoot.querySelectorAll<HTMLElement>(".tab-card-draggable"),
      );
      const absIndex = allDraggables.indexOf(evt.item as HTMLElement);
      const newIndex = absIndex >= 0 ? absIndex : (evt.newIndex ?? 0);

      // Read drop target's group membership (data-group-id is set on group
      // inner containers; -1/missing means ungrouped).
      const rawGroupId = toEl.dataset.groupId;
      const targetGroupId =
        rawGroupId !== undefined && rawGroupId !== ""
          ? Number(rawGroupId)
          : undefined;
      const groupId =
        targetGroupId !== undefined && targetGroupId > 0
          ? targetGroupId
          : undefined;

      const toWindowId = Number(
        (toEl.closest("[data-window-id]") as HTMLElement | null)?.dataset
          .windowId,
      );

      // Revert SortableJS DOM manipulation so Svelte's keyed {#each}
      // can reconcile correctly when the state update arrives.
      revertDom(fromEl, toEl, evt);

      // New window drop zone always wins.
      if (toEl.closest(`.${NEW_WINDOW_DROP_ZONE_CLASS}`)) {
        const ids = multiIds ?? [tabId];
        sendToBackground({ type: "CREATE_WINDOW", tabIds: ids });
        return;
      }

      if (!toWindowId || isNaN(toWindowId)) return;

      if (multiIds && multiIds.length > 1) {
        sendToBackground({
          type: "MOVE_TABS",
          tabIds: multiIds,
          windowId: toWindowId,
          index: newIndex,
          groupId,
        });
      } else {
        sendToBackground({
          type: "MOVE_TAB",
          tabId,
          windowId: toWindowId,
          index: newIndex,
          groupId,
        });
      }
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

// Returns selection IDs ordered by their DOM position (top-to-bottom) within
// the same window root as the dragged item. IDs not currently in the DOM are
// appended at the end in their original order.
function orderSelectionByDom(
  dragItem: HTMLElement,
  ids: number[],
): number[] {
  const winRoot =
    (dragItem.closest("[data-window-root]") as HTMLElement | null) ??
    document;
  const allCards = Array.from(
    winRoot.querySelectorAll<HTMLElement>(".tab-card-draggable[data-tab-id]"),
  );
  const positions = new Map<number, number>();
  allCards.forEach((el, idx) => {
    const id = Number(el.dataset.tabId);
    if (!isNaN(id)) positions.set(id, idx);
  });
  return [...ids].sort((a, b) => {
    const pa = positions.get(a) ?? Number.MAX_SAFE_INTEGER;
    const pb = positions.get(b) ?? Number.MAX_SAFE_INTEGER;
    return pa - pb;
  });
}

function revertDom(
  fromEl: HTMLElement,
  toEl: HTMLElement,
  evt: SortableEvent,
): void {
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
    const ref = sameDraggables[oldIdx] ?? null;
    fromEl.removeChild(evt.item);
    fromEl.insertBefore(evt.item, ref);
  }
}
